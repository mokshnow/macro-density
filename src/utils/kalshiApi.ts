import { MacroMarket, StrikeContract, MarketCategory } from '../types/market';
import { deriveBinsFromCumulativeStrikes, calculateStatisticalMoments } from './distributionMath';

const KALSHI_PUBLIC_API_BASES = [
  'https://trading-api.kalshi.com/trade-api/v2',
  'https://api.kalshi.com/trade-api/v2',
  'https://api.elections.kalshi.com/trade-api/v2',
];

/**
 * Parses any Kalshi URL or ticker string to extract metadata.
 * Examples:
 * https://kalshi.com/markets/kxcpiyoy/inflation/kxcpiyoy-26aug
 * https://kalshi.com/markets/kxgdp/us-gdp-growth/kxgdp-26oct30
 * kxcpiyoy-26aug
 */
export function parseKalshiInput(input: string): { seriesTicker: string; eventTicker: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // URL format
  if (trimmed.includes('kalshi.com/markets/')) {
    try {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      const segments = url.pathname.split('/').filter(Boolean);
      // /markets/{series}/{category}/{event} or /markets/{series}/{event}
      if (segments.length >= 2) {
        const seriesTicker = segments[1].toUpperCase();
        const eventTicker = (segments[segments.length - 1] || seriesTicker).toUpperCase();
        return { seriesTicker, eventTicker };
      }
    } catch {
      // Fallback regex
      const match = trimmed.match(/markets\/([a-zA-Z0-9_-]+)(?:\/[a-zA-Z0-9_-]+)*\/([a-zA-Z0-9_-]+)/);
      if (match) {
        return { seriesTicker: match[1].toUpperCase(), eventTicker: match[2].toUpperCase() };
      }
    }
  }

  // Ticker format (e.g. KXFED-26DEC or KXFED)
  const cleanTicker = trimmed.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  const seriesTicker = cleanTicker.split('-')[0];
  return {
    seriesTicker,
    eventTicker: cleanTicker,
  };
}

/**
 * Parses raw Kalshi JSON into a complete MacroMarket object.
 */
export function parseClientKalshiEvent(
  data: any,
  overrideSeriesTicker?: string,
  overrideEventTicker?: string
): MacroMarket {
  const event = data.event || data;
  const rawMarkets: any[] = event?.markets || data?.markets || [];

  if (rawMarkets.length === 0) {
    throw new Error('Event contains no active strike contracts.');
  }

  const contracts: StrikeContract[] = rawMarkets
    .filter((m: any) => m.floor_strike !== undefined || m.strike_level !== undefined)
    .map((m: any) => {
      const yesBidCents = m.yes_bid_dollars
        ? Math.round(parseFloat(m.yes_bid_dollars) * 100)
        : (m.yes_bid || 0);

      const yesAskCents = m.yes_ask_dollars
        ? Math.round(parseFloat(m.yes_ask_dollars) * 100)
        : (m.yes_ask || 100);

      const lastPriceCents = m.last_price_dollars
        ? Math.round(parseFloat(m.last_price_dollars) * 100)
        : (m.last_price || 0);

      const noBidCents = m.no_bid_dollars
        ? Math.round(parseFloat(m.no_bid_dollars) * 100)
        : (m.no_bid || 0);

      const noAskCents = m.no_ask_dollars
        ? Math.round(parseFloat(m.no_ask_dollars) * 100)
        : (m.no_ask || 100);

      const midpointCents =
        yesBidCents > 0 && yesAskCents < 100 && yesAskCents >= yesBidCents
          ? (yesBidCents + yesAskCents) / 2
          : lastPriceCents > 0
          ? lastPriceCents
          : 0;

      const volume = m.volume_fp ? Math.round(parseFloat(m.volume_fp)) : (m.volume || 0);
      const openInterest = m.open_interest_fp ? Math.round(parseFloat(m.open_interest_fp)) : (m.open_interest || 0);
      const floorStrike = m.floor_strike !== undefined ? parseFloat(m.floor_strike) : (m.strike_level !== undefined ? parseFloat(m.strike_level) : undefined);
      const unitSuffix = '%';
      const strikeText = floorStrike !== undefined ? `Above ${floorStrike}${unitSuffix}` : (m.yes_sub_title || m.ticker);

      return {
        ticker: m.ticker,
        title: strikeText,
        strikeType: (m.strike_type === 'greater' ? 'greater' : 'less') as 'greater' | 'less',
        floorStrike,
        capStrike: m.cap_strike !== undefined ? parseFloat(m.cap_strike) : undefined,
        yesBid: yesBidCents,
        yesAsk: yesAskCents,
        lastPrice: lastPriceCents,
        midpointPrice: midpointCents,
        noBid: noBidCents,
        noAsk: noAskCents,
        volume,
        openInterest,
        priceChange24h: 0,
      };
    })
    .sort((a, b) => (a.floorStrike ?? 0) - (b.floorStrike ?? 0));

  if (contracts.length === 0) {
    throw new Error('No valid strikes with numeric floor levels found in this Kalshi market.');
  }

  const unitSuffix = '%';
  const { bins, arbitrageOpportunities, hasIlliquidStrikes } =
    deriveBinsFromCumulativeStrikes(contracts, unitSuffix, 'midpoint');
  const moments = calculateStatisticalMoments(bins, unitSuffix);

  const totalVol = contracts.reduce((acc, c) => acc + c.volume, 0);
  const totalOI = contracts.reduce((acc, c) => acc + c.openInterest, 0);

  const eventTicker = event.event_ticker || overrideEventTicker || 'CUSTOM-EVENT';
  const seriesTicker = event.series_ticker || overrideSeriesTicker || eventTicker.split('-')[0];
  const marketId = eventTicker.toLowerCase();

  // Infer category from ticker
  let category: MarketCategory = 'inflation';
  const lowTicker = eventTicker.toLowerCase();
  if (lowTicker.includes('cpi') || lowTicker.includes('pce') || lowTicker.includes('inflation')) category = 'inflation';
  else if (lowTicker.includes('gdp') || lowTicker.includes('growth')) category = 'gdp';
  else if (lowTicker.includes('u3') || lowTicker.includes('job') || lowTicker.includes('unemployment') || lowTicker.includes('payrolls')) category = 'labor';
  else if (lowTicker.includes('fed') || lowTicker.includes('rate') || lowTicker.includes('sofr') || lowTicker.includes('yield')) category = 'rates';

  const summaryText = `Market-implied expected value of ${moments.mean}${unitSuffix}. Modal mass is centered at ${moments.modeRange}. Tail risk prices a 95% threshold at ${moments.var95}${unitSuffix} with ${moments.upsideTailProb}% upside shock risk (${moments.skewness >= 0 ? `+${moments.skewness}` : moments.skewness} skew).`;

  return {
    id: marketId,
    ticker: seriesTicker,
    eventTicker,
    title: event.title || `${seriesTicker} Market-Implied Distribution`,
    subtitle: event.sub_title || `Live Kalshi Order Book (${contracts.length} strikes)`,
    category,
    unit: '%',
    unitSuffix,
    kalshiUrl: `https://kalshi.com/markets/${seriesTicker.toLowerCase()}`,
    settlementDate: event.expiration_time?.split('T')[0] || new Date().toISOString().split('T')[0],
    releaseTime: '08:30 AM EDT',
    sourceAgency: event.settlement_sources?.[0]?.name || 'Kalshi Exchange',
    status: 'active',
    totalVolume: totalVol,
    totalOpenInterest: totalOI,
    contracts,
    bins,
    moments,
    consensus: [],
    historicalForecastMean: [{ timestamp: 'Live Order Book', mean: moments.mean }],
    historicalSnapshots: [
      {
        timestamp: 'Live Order Book',
        mean: moments.mean,
        median: moments.median,
        stdDev: moments.stdDev,
        confidence68: moments.confidence68,
        isLive: true,
      },
    ],
    pricingMethodology: 'midpoint',
    arbitrageOpportunities,
    hasIlliquidStrikes,
    description: `Live Kalshi market probability distribution derived from active binary strike contracts for ${eventTicker}. ${summaryText}`,
    summary: summaryText,
    lastUpdated: new Date().toISOString(),
    isLive: true,
  };
}

/**
 * Direct client-side browser fetcher to Kalshi API with multiple gateway fallbacks.
 */
async function fetchDirectFromKalshi(eventTicker: string, seriesTicker: string): Promise<any> {
  let lastErr: any = null;

  for (const baseUrl of KALSHI_PUBLIC_API_BASES) {
    // 1. Try direct event lookup
    try {
      const url = `${baseUrl}/events/${encodeURIComponent(eventTicker)}?with_nested_markets=true`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      lastErr = e;
    }

    // 2. Try series search if direct event lookup returned 404
    try {
      const seriesUrl = `${baseUrl}/events?series_ticker=${encodeURIComponent(seriesTicker || eventTicker)}&status=open`;
      const sRes = await fetch(seriesUrl, { headers: { Accept: 'application/json' } });
      if (sRes.ok) {
        const sData = await sRes.json();
        const events = sData.events || [];
        if (events.length > 0) {
          // Fetch first event with nested markets
          const nestedUrl = `${baseUrl}/events/${encodeURIComponent(events[0].event_ticker)}?with_nested_markets=true`;
          const nRes = await fetch(nestedUrl, { headers: { Accept: 'application/json' } });
          if (nRes.ok) {
            return await nRes.json();
          }
        }
      }
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error(`No active trading contracts found for '${eventTicker}' on Kalshi.`);
}

/**
 * Fetches all core live macroeconomic markets.
 */
export async function fetchCoreKalshiMarkets(): Promise<{
  success: boolean;
  markets: MacroMarket[];
  error?: string;
  lastUpdated?: string;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch('/api/kalshi?core=true', {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data.markets && data.markets.length > 0) {
        return {
          success: true,
          markets: data.markets,
          lastUpdated: data.lastUpdated || new Date().toISOString(),
        };
      }
    }
  } catch {}

  return {
    success: false,
    markets: [],
    error: 'Live Kalshi feed unreachable on localhost. Showing reference snapshot.',
  };
}

/**
 * Fetches live market contracts from Kalshi for a custom event ticker.
 * Seamlessly attempts backend proxy first, then falls back to direct browser fetch.
 */
export async function fetchKalshiMarketData(
  eventTicker: string,
  seriesTicker: string
): Promise<{ success: boolean; market?: MacroMarket; error?: string }> {
  // Strategy 1: Backend serverless proxy
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const url = `/api/kalshi?event_ticker=${encodeURIComponent(eventTicker)}&series_ticker=${encodeURIComponent(seriesTicker)}`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.market) {
        return { success: true, market: data.market };
      }
    }
  } catch {}

  // Strategy 2: Direct browser client-side fetch to Kalshi public API
  try {
    const rawData = await fetchDirectFromKalshi(eventTicker, seriesTicker);
    const market = parseClientKalshiEvent(rawData, seriesTicker, eventTicker);
    return { success: true, market };
  } catch (err: any) {
    return {
      success: false,
      error: `Could not retrieve live contracts for '${eventTicker}'. Please verify the market ticker is active on Kalshi. (${err?.message || 'Network error'})`,
    };
  }
}
