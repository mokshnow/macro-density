import { deriveBinsFromCumulativeStrikes, calculateStatisticalMoments } from '../src/utils/distributionMath';
import { MacroMarket, StrikeContract, MarketCategory } from '../src/types/market';

const KALSHI_API_BASE = 'https://api.elections.kalshi.com/trade-api/v2';

const CORE_EVENTS: {
  id: string;
  category: MarketCategory;
  defaultEventTicker: string;
  seriesTicker: string;
  unit: string;
  unitSuffix: string;
  sourceAgency: string;
  kalshiUrl: string;
}[] = [
  {
    id: 'cpi-august-2026',
    category: 'inflation',
    defaultEventTicker: 'KXUSCPIYEAR-29FEB01',
    seriesTicker: 'KXUSCPIYEAR',
    unit: '%',
    unitSuffix: '%',
    sourceAgency: 'Bureau of Labor Statistics',
    kalshiUrl: 'https://kalshi.com/markets/kxcpiyoy',
  },
  {
    id: 'fed-december-2026',
    category: 'rates',
    defaultEventTicker: 'KXFEDFUNDSYEAR-30JAN01',
    seriesTicker: 'KXFEDFUNDSYEAR',
    unit: '%',
    unitSuffix: '%',
    sourceAgency: 'Federal Open Market Committee',
    kalshiUrl: 'https://kalshi.com/markets/kxfed',
  },
  {
    id: 'gdp-q2-2026',
    category: 'gdp',
    defaultEventTicker: 'KXGDPYEAR-28',
    seriesTicker: 'KXGDPYEAR',
    unit: '%',
    unitSuffix: '%',
    sourceAgency: 'Bureau of Economic Analysis',
    kalshiUrl: 'https://kalshi.com/markets/kxgdp',
  },
  {
    id: 'unemployment-august-2026',
    category: 'labor',
    defaultEventTicker: 'KXU3MAX-30',
    seriesTicker: 'KXU3MAX',
    unit: '%',
    unitSuffix: '%',
    sourceAgency: 'Bureau of Labor Statistics',
    kalshiUrl: 'https://kalshi.com/markets/kxunemp',
  },
];

async function fetchKalshiEvent(eventTicker: string) {
  const url = `${KALSHI_API_BASE}/events/${encodeURIComponent(eventTicker)}?with_nested_markets=true`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'MacroDensity/1.0',
    },
  });

  if (!res.ok) {
    throw new Error(`Kalshi API returned HTTP ${res.status} for ${eventTicker}`);
  }

  const data = await res.json();
  return data;
}

function parseKalshiEventToMarket(
  data: any,
  meta?: {
    id?: string;
    category?: MarketCategory;
    unit?: string;
    unitSuffix?: string;
    sourceAgency?: string;
    kalshiUrl?: string;
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

  return {
    id: marketId,
    ticker: seriesTicker,
    eventTicker: event.event_ticker,
    title: event.title || `${seriesTicker} Implied Distribution`,
    subtitle: event.sub_title || `Live Kalshi Order Book (${contracts.length} strikes)`,
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
    consensus: [],
    historicalForecastMean: [],
    description: `Live Kalshi market probability distribution derived from active binary strike contracts for ${event.event_ticker}.`,
    summary: `Real-time order book distribution with market-implied expected value of ${moments.mean}${unitSuffix}.`,
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
    // Mode 1: Fetch all 4 core macroeconomic markets
    if (core === 'true' || core === '') {
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
          console.error(`Failed to fetch core event ${CORE_EVENTS[idx].defaultEventTicker}:`, r.reason);
        }
      });

      return res.status(200).json({
        success: true,
        markets,
        partial: failedEvents.length > 0,
        failedEvents,
        lastUpdated: new Date().toISOString(),
      });
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
    console.error('Kalshi API proxy error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to fetch live Kalshi market data',
      lastUpdated: new Date().toISOString(),
    });
  }
}
