import { MacroMarket } from '../types/market';

/**
 * Parses any Kalshi URL or ticker string to extract metadata.
 * Examples:
 * https://kalshi.com/markets/kxcpiyoy/inflation/kxcpiyoy-26aug
 * https://kalshi.com/markets/kxuscpiyear/us-cpi-inflation/kxuscpiyear-29feb01
 * kxcpiyoy-26aug
 * KXUSCPIYEAR-29FEB01
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

  // Direct Ticker format (e.g. KXFED-26DEC or KXFED or KXUSCPIYEAR-29FEB01)
  const cleanTicker = trimmed.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  if (!cleanTicker) return null;

  const seriesTicker = cleanTicker.split('-')[0];
  return {
    seriesTicker,
    eventTicker: cleanTicker,
  };
}

/**
 * Fetches live market data from the serverless backend proxy (/api/kalshi).
 * Never synthesizes fake data. Returns the real market or throws an error.
 */
export async function fetchKalshiMarketData(
  eventTicker: string,
  seriesTicker?: string
): Promise<{ success: boolean; market?: MacroMarket; error?: string }> {
  try {
    const url = `/api/kalshi?event_ticker=${encodeURIComponent(eventTicker)}&series_ticker=${encodeURIComponent(seriesTicker || '')}`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok || !data.success || !data.market) {
      return {
        success: false,
        error: data.error || `Could not find active market contracts for '${eventTicker}' on Kalshi.`,
      };
    }

    return {
      success: true,
      market: data.market,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || `Network error connecting to Kalshi API proxy for '${eventTicker}'.`,
    };
  }
}

/**
 * Fetches live real-time pricing for the core macroeconomic markets.
 */
export async function fetchCoreKalshiMarkets(): Promise<{
  success: boolean;
  markets: MacroMarket[];
  lastUpdated: string;
  error?: string;
}> {
  try {
    const response = await fetch('/api/kalshi?core=true', {
      headers: {
        Accept: 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok || !data.success || !data.markets || data.markets.length === 0) {
      return {
        success: false,
        markets: [],
        lastUpdated: new Date().toISOString(),
        error: data?.error || 'Failed to fetch core Kalshi markets',
      };
    }

    return {
      success: true,
      markets: data.markets,
      lastUpdated: data.lastUpdated || new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      success: false,
      markets: [],
      lastUpdated: new Date().toISOString(),
      error: err?.message || 'Network error fetching core markets',
    };
  }
}
