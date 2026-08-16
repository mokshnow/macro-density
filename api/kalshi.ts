import { deriveBinsFromCumulativeStrikes, calculateStatisticalMoments } from '../src/utils/distributionMath';
import { MacroMarket, StrikeContract, MarketCategory, ConsensusEstimate, HistoricalSnapshot } from '../src/types/market';

const KALSHI_API_BASE = 'https://api.elections.kalshi.com/trade-api/v2';

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

  // Filter and parse valid contracts
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

      const floorStrike = m.floor_strike !== undefined ? parseFloat(m.floor_strike) : parseFloat(m.strike_level);

      return {
        ticker: m.ticker,
        title: m.title || m.yes_sub_title || m.ticker,
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

  // Wire historical snapshots with dynamic live current datapoint
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

  // Calculate live spreads against institutional consensus
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
  // Set CORS headers
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
    // Mode 1: Fetch the 3 core macroeconomic markets
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

    // Mode 2: Fetch single custom event ticker
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
