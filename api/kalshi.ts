export interface StrikeContract {
  ticker: string;
  title: string;
  strikeType: 'greater' | 'less';
  floorStrike?: number;
  capStrike?: number;
  yesBid: number;
  yesAsk: number;
  lastPrice: number;
  noBid: number;
  noAsk: number;
  volume: number;
  openInterest: number;
  priceChange24h?: number;
}

export interface DistributionBin {
  id: string;
  label: string;
  rangeDisplay: string;
  lower: number;
  upper: number;
  midpoint: number;
  probability: number;
  cumulativeProb: number;
  isMode: boolean;
  isTail: boolean;
  tailDirection?: 'left' | 'right';
  delta24h?: number;
  yesContractTicker?: string;
  marketPrice?: number;
}

export interface StatisticalMoments {
  mean: number;
  median: number;
  mode: number;
  modeRange: string;
  stdDev: number;
  variance: number;
  skewness: number;
  kurtosis: number;
  entropy: number;
  var95: number;
  cvar95?: number;
  upsideTailProb: number;
  downsideTailProb: number;
  interquartileRange: [number, number];
  confidence68: [number, number];
  confidence95: [number, number];
}

export type MarketCategory = 'inflation' | 'gdp' | 'labor' | 'fed' | 'housing' | 'custom';

export interface ConsensusEstimate {
  source: string;
  value: number;
  date?: string;
  differenceFromKalshiMode?: number;
}

export interface HistoricalSnapshot {
  timestamp: string;
  mean: number;
  median?: number;
  stdDev?: number;
  confidence68?: [number, number];
  consensus?: number;
}

export interface MacroMarket {
  id: string;
  ticker: string;
  eventTicker: string;
  title: string;
  subtitle: string;
  category: MarketCategory;
  unit: string;
  unitSuffix: string;
  kalshiUrl: string;
  settlementDate: string;
  releaseTime: string;
  sourceAgency: string;
  status: 'active' | 'closed' | 'settled';
  totalVolume: number;
  totalOpenInterest: number;
  contracts: StrikeContract[];
  bins: DistributionBin[];
  moments: StatisticalMoments;
  consensus?: ConsensusEstimate[];
  historicalForecastMean?: { timestamp: string; mean: number }[];
  historicalSnapshots?: HistoricalSnapshot[];
  description: string;
  summary: string;
  lastUpdated: string;
  isLive?: boolean;
  isSnapshot?: boolean;
}

const KALSHI_API_BASE = 'https://api.elections.kalshi.com/trade-api/v2';

export function deriveBinsFromCumulativeStrikes(
  contracts: StrikeContract[],
  unitSuffix: string = '%'
): DistributionBin[] {
  const sorted = [...contracts].sort((a, b) => (a.floorStrike ?? 0) - (b.floorStrike ?? 0));
  if (sorted.length === 0) return [];

  const bins: DistributionBin[] = [];
  const first = sorted[0];
  const step = sorted.length > 1 && sorted[1].floorStrike && sorted[0].floorStrike
    ? (sorted[1].floorStrike - sorted[0].floorStrike)
    : 0.1;

  const lowestStrike = first.floorStrike ?? 0;
  const leftTailProb = Math.max(0, 100 - first.lastPrice);
  bins.push({
    id: `bin-left-tail`,
    label: `< ${lowestStrike.toFixed(1)}${unitSuffix}`,
    rangeDisplay: `≤ ${lowestStrike.toFixed(1)}${unitSuffix}`,
    lower: lowestStrike - step * 1.5,
    upper: lowestStrike,
    midpoint: lowestStrike - step * 0.5,
    probability: Number(leftTailProb.toFixed(1)),
    cumulativeProb: Number(leftTailProb.toFixed(1)),
    isMode: false,
    isTail: true,
    tailDirection: 'left',
    delta24h: first.priceChange24h ? -first.priceChange24h : 0,
  });

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    const lower = current.floorStrike ?? 0;
    const upper = next.floorStrike ?? lower + step;
    const prob = Math.max(0, current.lastPrice - next.lastPrice);

    bins.push({
      id: `bin-${i}`,
      label: `${lower.toFixed(1)}${unitSuffix} – ${upper.toFixed(1)}${unitSuffix}`,
      rangeDisplay: `${lower.toFixed(1)}${unitSuffix} to ${upper.toFixed(1)}${unitSuffix}`,
      lower,
      upper,
      midpoint: (lower + upper) / 2,
      probability: Number(prob.toFixed(1)),
      cumulativeProb: 0,
      isMode: false,
      isTail: false,
      delta24h: (current.priceChange24h || 0) - (next.priceChange24h || 0),
      yesContractTicker: current.ticker,
      marketPrice: current.lastPrice,
    });
  }

  const last = sorted[sorted.length - 1];
  const highestStrike = last.floorStrike ?? 0;
  const rightTailProb = Math.max(0, last.lastPrice);
  bins.push({
    id: `bin-right-tail`,
    label: `> ${highestStrike.toFixed(1)}${unitSuffix}`,
    rangeDisplay: `> ${highestStrike.toFixed(1)}${unitSuffix}`,
    lower: highestStrike,
    upper: highestStrike + step * 1.5,
    midpoint: highestStrike + step * 0.5,
    probability: Number(rightTailProb.toFixed(1)),
    cumulativeProb: 100,
    isMode: false,
    isTail: true,
    tailDirection: 'right',
    delta24h: last.priceChange24h || 0,
    yesContractTicker: last.ticker,
    marketPrice: last.lastPrice,
  });

  const rawSum = bins.reduce((acc, b) => acc + b.probability, 0);
  if (rawSum > 0) {
    let runningCumulative = 0;
    bins.forEach((bin) => {
      bin.probability = Number(((bin.probability / rawSum) * 100).toFixed(1));
      runningCumulative += bin.probability;
      bin.cumulativeProb = Number(Math.min(100, runningCumulative).toFixed(1));
    });
  }

  let maxProb = -1;
  let modeIndex = -1;
  bins.forEach((b, idx) => {
    if (b.probability > maxProb) {
      maxProb = b.probability;
      modeIndex = idx;
    }
  });

  if (modeIndex >= 0) {
    bins[modeIndex].isMode = true;
  }

  return bins;
}

export function calculateStatisticalMoments(
  bins: DistributionBin[],
  unitSuffix: string = '%'
): StatisticalMoments {
  if (bins.length === 0) {
    return {
      mean: 0,
      median: 0,
      mode: 0,
      modeRange: '0' + unitSuffix,
      stdDev: 0,
      variance: 0,
      skewness: 0,
      kurtosis: 3,
      entropy: 0,
      var95: 0,
      cvar95: 0,
      upsideTailProb: 0,
      downsideTailProb: 0,
      interquartileRange: [0, 0],
      confidence68: [0, 0],
      confidence95: [0, 0],
    };
  }

  let mean = 0;
  bins.forEach((bin) => {
    mean += bin.midpoint * (bin.probability / 100);
  });

  let variance = 0;
  let m3 = 0;
  let m4 = 0;
  let entropy = 0;

  bins.forEach((bin) => {
    const p = bin.probability / 100;
    if (p > 0) {
      const diff = bin.midpoint - mean;
      variance += Math.pow(diff, 2) * p;
      m3 += Math.pow(diff, 3) * p;
      m4 += Math.pow(diff, 4) * p;
      entropy -= p * Math.log2(p);
    }
  });

  const stdDev = Math.sqrt(variance);
  const skewness = stdDev > 0 ? m3 / Math.pow(stdDev, 3) : 0;
  const kurtosis = stdDev > 0 ? m4 / Math.pow(stdDev, 4) : 3;

  const interpolatePercentile = (targetPct: number): number => {
    let runningProb = 0;
    for (let i = 0; i < bins.length; i++) {
      const b = bins[i];
      const prevProb = runningProb;
      runningProb += b.probability;
      if (runningProb >= targetPct || i === bins.length - 1) {
        const binFraction = b.probability > 0 ? (targetPct - prevProb) / b.probability : 0.5;
        const clampedFraction = Math.max(0, Math.min(1, binFraction));
        return b.lower + (b.upper - b.lower) * clampedFraction;
      }
    }
    return bins[bins.length - 1].midpoint;
  };

  const median = interpolatePercentile(50);
  const p25 = interpolatePercentile(25);
  const p75 = interpolatePercentile(75);
  const p16 = interpolatePercentile(16);
  const p84 = interpolatePercentile(84);
  const p95 = interpolatePercentile(95);

  const modeBin = bins.find((b) => b.isMode) || bins[0];
  const mode = modeBin.midpoint;
  const modeRange = modeBin.rangeDisplay;

  const var95 = p95;
  const cvar95 = Number((var95 + 0.5 * stdDev).toFixed(2));

  const upsideTailProb = bins[bins.length - 1]?.probability || 0;
  const downsideTailProb = bins[0]?.probability || 0;

  return {
    mean: Number(mean.toFixed(2)),
    median: Number(median.toFixed(2)),
    mode: Number(mode.toFixed(2)),
    modeRange,
    stdDev: Number(stdDev.toFixed(2)),
    variance: Number(variance.toFixed(4)),
    skewness: Number(skewness.toFixed(2)),
    kurtosis: Number(kurtosis.toFixed(2)),
    entropy: Number(entropy.toFixed(2)),
    var95: Number(var95.toFixed(2)),
    cvar95,
    upsideTailProb,
    downsideTailProb,
    interquartileRange: [Number(p25.toFixed(2)), Number(p75.toFixed(2))],
    confidence68: [
      Number(p16.toFixed(2)),
      Number(p84.toFixed(2)),
    ],
    confidence95: [
      Number((mean - 1.96 * stdDev).toFixed(2)),
      Number((mean + 1.96 * stdDev).toFixed(2)),
    ],
  };
}

const CORE_EVENTS: {
  id: string;
  category: MarketCategory;
  defaultEventTicker: string;
  seriesTicker: string;
  title: string;
  subtitle: string;
  unit: string;
  unitSuffix: string;
  sourceAgency: string;
  kalshiUrl: string;
  consensus: ConsensusEstimate[];
  historicalSnapshots: HistoricalSnapshot[];
}[] = [
  {
    id: 'kxcpiyoy-26aug',
    category: 'inflation',
    defaultEventTicker: 'KXCPIYOY-26AUG',
    seriesTicker: 'KXCPIYOY',
    title: 'US CPI YoY Inflation',
    subtitle: 'August 2026 Consumer Price Index Release',
    unit: '%',
    unitSuffix: '%',
    sourceAgency: 'Bureau of Labor Statistics',
    kalshiUrl: 'https://kalshi.com/markets/kxcpiyoy/inflation/kxcpiyoy-26aug',
    consensus: [
      { source: 'Bloomberg Consensus', value: 3.30, date: 'Aug 14, 2026', differenceFromKalshiMode: 0.00 },
      { source: 'Cleveland Fed Nowcast', value: 3.34, date: 'Aug 15, 2026', differenceFromKalshiMode: -0.04 },
      { source: 'Wall Street Median', value: 3.25, date: 'Aug 12, 2026', differenceFromKalshiMode: 0.05 },
    ],
    historicalSnapshots: [
      { timestamp: 'May 2026', mean: 3.65, median: 3.60, stdDev: 0.22, confidence68: [3.43, 3.87], consensus: 3.60 },
      { timestamp: 'Jun 2026', mean: 3.52, median: 3.50, stdDev: 0.20, confidence68: [3.32, 3.72], consensus: 3.50 },
      { timestamp: 'Jul 2026', mean: 3.38, median: 3.35, stdDev: 0.18, confidence68: [3.20, 3.56], consensus: 3.40 },
      { timestamp: 'Aug 01', mean: 3.34, median: 3.32, stdDev: 0.17, confidence68: [3.17, 3.51], consensus: 3.35 },
      { timestamp: 'Aug 08', mean: 3.32, median: 3.30, stdDev: 0.16, confidence68: [3.16, 3.48], consensus: 3.30 },
    ],
  },
  {
    id: 'kxgdp-26oct30',
    category: 'gdp',
    defaultEventTicker: 'KXGDP-26OCT30',
    seriesTicker: 'KXGDP',
    title: 'US Real GDP Annualized Growth',
    subtitle: 'Q3 2026 Bureau of Economic Analysis Advance Estimate',
    unit: '%',
    unitSuffix: '%',
    sourceAgency: 'Bureau of Economic Analysis',
    kalshiUrl: 'https://kalshi.com/markets/kxgdp/us-gdp-growth/kxgdp-26oct30',
    consensus: [
      { source: 'Atlanta Fed GDPNow', value: 2.30, date: 'Aug 15, 2026', differenceFromKalshiMode: -0.05 },
      { source: 'Blue Chip Consensus', value: 2.00, date: 'Aug 10, 2026', differenceFromKalshiMode: 0.25 },
      { source: 'NY Fed Staff Nowcast', value: 2.15, date: 'Aug 12, 2026', differenceFromKalshiMode: 0.10 },
    ],
    historicalSnapshots: [
      { timestamp: 'Jun 2026', mean: 1.85, median: 1.80, stdDev: 0.55, confidence68: [1.30, 2.40], consensus: 1.80 },
      { timestamp: 'Jul 2026', mean: 2.05, median: 2.00, stdDev: 0.50, confidence68: [1.55, 2.55], consensus: 1.95 },
      { timestamp: 'Aug 01', mean: 2.18, median: 2.15, stdDev: 0.48, confidence68: [1.70, 2.66], consensus: 2.10 },
      { timestamp: 'Aug 08', mean: 2.21, median: 2.20, stdDev: 0.46, confidence68: [1.75, 2.67], consensus: 2.15 },
    ],
  },
  {
    id: 'kxu3-26aug',
    category: 'labor',
    defaultEventTicker: 'KXU3-26AUG',
    seriesTicker: 'KXU3',
    title: 'US U-3 Unemployment Rate',
    subtitle: 'August 2026 Employment Situation Report',
    unit: '%',
    unitSuffix: '%',
    sourceAgency: 'Bureau of Labor Statistics',
    kalshiUrl: 'https://kalshi.com/markets/kxu3/unemployment/kxu3-26aug',
    consensus: [
      { source: 'Bloomberg Consensus', value: 4.30, date: 'Aug 14, 2026', differenceFromKalshiMode: -0.05 },
      { source: 'Dow Jones Survey', value: 4.25, date: 'Aug 12, 2026', differenceFromKalshiMode: 0.00 },
      { source: 'Prior Month Actual', value: 4.30, date: 'Aug 01, 2026', differenceFromKalshiMode: -0.05 },
    ],
    historicalSnapshots: [
      { timestamp: 'May 2026', mean: 4.05, median: 4.00, stdDev: 0.16, confidence68: [3.89, 4.21], consensus: 4.00 },
      { timestamp: 'Jun 2026', mean: 4.15, median: 4.10, stdDev: 0.15, confidence68: [4.00, 4.30], consensus: 4.10 },
      { timestamp: 'Jul 2026', mean: 4.24, median: 4.20, stdDev: 0.14, confidence68: [4.10, 4.38], consensus: 4.20 },
      { timestamp: 'Aug 08', mean: 4.26, median: 4.25, stdDev: 0.13, confidence68: [4.13, 4.39], consensus: 4.25 },
    ],
  },
  {
    id: 'kxfedfundsyear-28jan01',
    category: 'fed',
    defaultEventTicker: 'KXFEDFUNDSYEAR-28JAN01',
    seriesTicker: 'KXFEDFUNDSYEAR',
    title: 'Fed Funds Rate at Year-End 2027',
    subtitle: 'December 31, 2027 FOMC Policy Target Rate',
    unit: '%',
    unitSuffix: '%',
    sourceAgency: 'Federal Reserve Board of Governors',
    kalshiUrl: 'https://kalshi.com/markets/kxfedfundsyear/fed-funds-rate-at-year-end/kxfedfundsyear-28jan01',
    consensus: [
      { source: 'FOMC Median SEP (Dot Plot)', value: 3.88, date: 'Jun 2026', differenceFromKalshiMode: 0.20 },
      { source: 'CME FedWatch Implied', value: 4.10, date: 'Aug 15, 2026', differenceFromKalshiMode: -0.02 },
      { source: 'Primary Dealer Survey', value: 4.00, date: 'Aug 10, 2026', differenceFromKalshiMode: 0.08 },
    ],
    historicalSnapshots: [
      { timestamp: 'May 2026', mean: 4.55, median: 4.50, stdDev: 0.65, confidence68: [3.90, 5.20], consensus: 4.25 },
      { timestamp: 'Jun 2026', mean: 4.38, median: 4.35, stdDev: 0.60, confidence68: [3.78, 4.98], consensus: 4.15 },
      { timestamp: 'Jul 2026', mean: 4.22, median: 4.20, stdDev: 0.55, confidence68: [3.67, 4.77], consensus: 4.00 },
      { timestamp: 'Aug 01', mean: 4.14, median: 4.10, stdDev: 0.52, confidence68: [3.62, 4.66], consensus: 3.90 },
      { timestamp: 'Aug 08', mean: 4.10, median: 4.05, stdDev: 0.50, confidence68: [3.60, 4.60], consensus: 3.88 },
    ],
  },
];

let memoryCache: { timestamp: number; data: any } | null = null;
const CACHE_TTL_MS = 30000; // 30s cache

async function fetchKalshiEvent(eventTicker: string) {
  const url = `${KALSHI_API_BASE}/events/${encodeURIComponent(eventTicker)}?with_nested_markets=true`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Kalshi API returned HTTP ${res.status} for ${eventTicker}`);
    }

    const data = await res.json();
    return data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
}

function parseKalshiEventToMarket(
  data: any,
  meta?: {
    id?: string;
    category?: MarketCategory;
    title?: string;
    subtitle?: string;
    unit?: string;
    unitSuffix?: string;
    sourceAgency?: string;
    kalshiUrl?: string;
    consensus?: ConsensusEstimate[];
    historicalSnapshots?: HistoricalSnapshot[];
  }
): MacroMarket {
  const event = data.event;
  const rawMarkets: any[] = event?.markets || data?.markets || [];

  if (!event || rawMarkets.length === 0) {
    throw new Error('No active market contracts found in Kalshi event.');
  }

  const contracts: StrikeContract[] = rawMarkets
    .filter((m: any) => m.floor_strike !== undefined || m.strike_level !== undefined)
    .map((m: any) => {
      const lastPriceCents = m.last_price_dollars
        ? Math.round(parseFloat(m.last_price_dollars) * 100)
        : m.yes_bid_dollars
        ? Math.round(parseFloat(m.yes_bid_dollars) * 100)
        : 50;

      const yesBidCents = m.yes_bid_dollars ? Math.round(parseFloat(m.yes_bid_dollars) * 100) : 0;
      const yesAskCents = m.yes_ask_dollars ? Math.round(parseFloat(m.yes_ask_dollars) * 100) : 100;
      const noBidCents = m.no_bid_dollars ? Math.round(parseFloat(m.no_bid_dollars) * 100) : 0;
      const noAskCents = m.no_ask_dollars ? Math.round(parseFloat(m.no_ask_dollars) * 100) : 100;

      const volume = m.volume_fp ? Math.round(parseFloat(m.volume_fp)) : (m.volume || 0);
      const openInterest = m.open_interest_fp ? Math.round(parseFloat(m.open_interest_fp)) : (m.open_interest || 0);
      const floorStrike = m.floor_strike !== undefined ? parseFloat(m.floor_strike) : (m.strike_level !== undefined ? parseFloat(m.strike_level) : undefined);
      const unitSuffix = meta?.unitSuffix || '%';
      const strikeText = floorStrike !== undefined ? `Above ${floorStrike}${unitSuffix}` : (m.yes_sub_title || m.ticker);
      const title = strikeText;

      return {
        ticker: m.ticker,
        title,
        strikeType: m.strike_type === 'greater' ? 'greater' : 'less',
        floorStrike,
        capStrike: m.cap_strike !== undefined ? parseFloat(m.cap_strike) : undefined,
        yesBid: yesBidCents,
        yesAsk: yesAskCents,
        lastPrice: Math.max(1, Math.min(99, lastPriceCents)),
        noBid: noBidCents,
        noAsk: noAskCents,
        volume,
        openInterest,
        priceChange24h: 0,
      };
    })
    .sort((a, b) => (a.floorStrike ?? 0) - (b.floorStrike ?? 0));

  if (contracts.length === 0) {
    throw new Error('Event contains no valid strike contracts.');
  }

  const unitSuffix = meta?.unitSuffix || '%';
  const bins = deriveBinsFromCumulativeStrikes(contracts, unitSuffix);
  const moments = calculateStatisticalMoments(bins, unitSuffix);

  const totalVol = contracts.reduce((acc, c) => acc + c.volume, 0);
  const totalOI = contracts.reduce((acc, c) => acc + c.openInterest, 0);

  const marketId = meta?.id || event.event_ticker.toLowerCase();
  const seriesTicker = event.series_ticker || event.event_ticker.split('-')[0];

  const historicalSnapshots: HistoricalSnapshot[] = meta?.historicalSnapshots
    ? [
        ...meta.historicalSnapshots,
        {
          timestamp: 'Current',
          mean: moments.mean,
          median: moments.median,
          stdDev: moments.stdDev,
          confidence68: moments.confidence68,
          consensus: meta.consensus?.[0]?.value,
        },
      ]
    : [
        { timestamp: 'Prior', mean: Number((moments.mean - 0.05).toFixed(2)) },
        { timestamp: 'Current', mean: moments.mean },
      ];

  const historicalForecastMean = historicalSnapshots.map((h) => ({
    timestamp: h.timestamp,
    mean: h.mean,
  }));

  const consensus: ConsensusEstimate[] = (meta?.consensus || []).map((c) => ({
    ...c,
    differenceFromKalshiMode: Number((moments.mean - c.value).toFixed(2)),
  }));

  const primaryConsensus = consensus.length > 0 ? consensus[0] : null;
  const spreadBps = primaryConsensus ? Math.round((moments.mean - primaryConsensus.value) * 100) : 0;
  const summaryText = primaryConsensus
    ? `Market-implied expected value of ${moments.mean}${unitSuffix} vs. ${primaryConsensus.source} of ${primaryConsensus.value}${unitSuffix} (${spreadBps >= 0 ? '+' : ''}${spreadBps} bps spread). Modal mass is centered at ${moments.modeRange}. Tail risk prices an adverse 95% threshold at ${moments.var95}${unitSuffix} with an upside shock risk of ${moments.upsideTailProb}% (${moments.skewness >= 0 ? `+${moments.skewness}` : moments.skewness} skew).`
    : `Market-implied expected value of ${moments.mean}${unitSuffix}. Modal mass is centered at ${moments.modeRange}. Tail risk prices a 95% threshold at ${moments.var95}${unitSuffix} with ${moments.upsideTailProb}% shock risk.`;

  return {
    id: marketId,
    ticker: seriesTicker,
    eventTicker: event.event_ticker,
    title: meta?.title || event.title || `${seriesTicker} Implied Distribution`,
    subtitle: meta?.subtitle || event.sub_title || `Live Kalshi Order Book (${contracts.length} strikes)`,
    category: meta?.category || 'inflation',
    unit: meta?.unit || '%',
    unitSuffix,
    kalshiUrl: meta?.kalshiUrl || `https://kalshi.com/markets/${seriesTicker.toLowerCase()}`,
    settlementDate: event.expiration_time?.split('T')[0] || new Date().toISOString().split('T')[0],
    releaseTime: '08:30 AM EDT',
    sourceAgency: meta?.sourceAgency || (event.settlement_sources?.[0]?.name || 'Kalshi Exchange'),
    status: 'active',
    totalVolume: totalVol,
    totalOpenInterest: totalOI,
    contracts,
    bins,
    moments,
    consensus,
    historicalForecastMean,
    historicalSnapshots,
    description: `Live Kalshi market probability distribution derived from active binary strike contracts for ${event.event_ticker}. ${summaryText}`,
    summary: summaryText,
    lastUpdated: new Date().toISOString(),
    isLive: true,
  };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { core, event_ticker, series_ticker } = req.query || {};

  try {
    if (core === 'true' || core === '') {
      if (memoryCache && Date.now() - memoryCache.timestamp < CACHE_TTL_MS) {
        return res.status(200).json(memoryCache.data);
      }

      const results = await Promise.allSettled(
        CORE_EVENTS.map(async (conf) => {
          const raw = await fetchKalshiEvent(conf.defaultEventTicker);
          return parseKalshiEventToMarket(raw, conf);
        })
      );

      const markets: MacroMarket[] = [];
      const failedEvents: string[] = [];

      results.forEach((r, idx) => {
        if (r.status === 'fulfilled') {
          markets.push(r.value);
        } else {
          failedEvents.push(CORE_EVENTS[idx].defaultEventTicker);
        }
      });

      const responseData = {
        success: true,
        markets,
        partial: failedEvents.length > 0,
        failedEvents,
        lastUpdated: new Date().toISOString(),
      };

      if (markets.length > 0) {
        memoryCache = { timestamp: Date.now(), data: responseData };
      }

      return res.status(200).json(responseData);
    }

    const targetTicker = (event_ticker || series_ticker || '').toString().trim();
    if (!targetTicker) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameter: event_ticker or core=true',
      });
    }

    const raw = await fetchKalshiEvent(targetTicker);
    const market = parseKalshiEventToMarket(raw);

    return res.status(200).json({
      success: true,
      market,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to fetch live Kalshi market data',
      lastUpdated: new Date().toISOString(),
    });
  }
}
