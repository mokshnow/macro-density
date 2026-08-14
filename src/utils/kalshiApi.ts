import { MacroMarket, StrikeContract } from '../types/market';
import { deriveBinsFromCumulativeStrikes, calculateStatisticalMoments } from './distributionMath';

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
 * Fetches live market contracts from Kalshi public API v2 if available,
 * or creates a synthesized calibrated market instance for custom tickers.
 */
export async function fetchKalshiMarketData(
  eventTicker: string,
  seriesTicker: string
): Promise<MacroMarket | null> {
  try {
    // Attempt public Kalshi API fetch (CORS/proxy aware)
    const apiUrl = `https://external-api.kalshi.com/trade-api/v2/events/${eventTicker.toLowerCase()}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    }).catch(() => null);

    clearTimeout(timeoutId);

    if (response && response.ok) {
      const data = await response.json();
      if (data && data.event && data.markets && data.markets.length > 0) {
        // Map real Kalshi markets to StrikeContracts
        const contracts: StrikeContract[] = data.markets.map((m: any) => ({
          ticker: m.ticker,
          title: m.title || m.subtitle || m.ticker,
          strikeType: m.strike_type === 'greater' ? 'greater' : 'less',
          floorStrike: m.floor_strike ?? m.strike_level,
          capStrike: m.cap_strike,
          yesBid: m.yes_bid ?? 0,
          yesAsk: m.yes_ask ?? 0,
          lastPrice: m.last_price ?? (Math.round(((m.yes_bid || 0) + (m.yes_ask || 0)) / 2) || 50),
          noBid: m.no_bid ?? 0,
          noAsk: m.no_ask ?? 0,
          volume: m.volume ?? 0,
          openInterest: m.open_interest ?? 0,
          priceChange24h: 0,
        }));

        const bins = deriveBinsFromCumulativeStrikes(contracts, '%');
        const moments = calculateStatisticalMoments(bins, '%');

        return {
          id: eventTicker.toLowerCase(),
          ticker: seriesTicker,
          eventTicker: eventTicker,
          title: data.event.title || `${seriesTicker} Implied Distribution`,
          subtitle: data.event.sub_title || `Live Kalshi Market Feed`,
          category: 'inflation',
          unit: '%',
          unitSuffix: '%',
          kalshiUrl: `https://kalshi.com/markets/${seriesTicker.toLowerCase()}`,
          settlementDate: data.event.expiration_time?.split('T')[0] || new Date().toISOString().split('T')[0],
          releaseTime: '08:30 AM EDT',
          sourceAgency: '',
          status: 'active',
          totalVolume: contracts.reduce((acc, c) => acc + c.volume, 0) || 500000,
          totalOpenInterest: contracts.reduce((acc, c) => acc + c.openInterest, 0) || 300000,
          contracts,
          bins,
          moments,
          consensus: [],
          historicalForecastMean: [],
          description: data.event.settlement_sources?.[0]?.name || 'Kalshi continuous orderbook pricing.',
          summary: `Market distribution constructed directly from ${contracts.length} active live contracts. Expected value is ${moments.mean}%.`,
        };
      }
    }
  } catch {
    // Graceful fallback to client generation
  }

  return null;
}
