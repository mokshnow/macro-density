import { MacroMarket } from '../types/market';

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
 * Fetches all core live macroeconomic markets from the serverless backend proxy (/api/kalshi?core=true).
 */
export async function fetchCoreKalshiMarkets(): Promise<{
  success: boolean;
  markets: MacroMarket[];
  error?: string;
  lastUpdated?: string;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 18000);

    const response = await fetch('/api/kalshi?core=true', {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        markets: [],
        error: `Server responded with HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: data.success ?? true,
      markets: data.markets || [],
      error: data.error,
      lastUpdated: data.lastUpdated || new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      success: false,
      markets: [],
      error: err?.message || 'Network request failed',
    };
  }
}

/**
 * Fetches live market contracts from Kalshi for a specific event ticker through the backend proxy.
 */
export async function fetchKalshiMarketData(
  eventTicker: string,
  seriesTicker: string
): Promise<{ success: boolean; market?: MacroMarket; error?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const url = `/api/kalshi?event_ticker=${encodeURIComponent(eventTicker)}&series_ticker=${encodeURIComponent(seriesTicker)}`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorJson = await response.json().catch(() => null);
      return {
        success: false,
        error: errorJson?.error || `HTTP ${response.status}: Failed to retrieve '${eventTicker}' from Kalshi`,
      };
    }

    const data = await response.json();
    if (data.success && data.market) {
      return { success: true, market: data.market };
    }

    return {
      success: false,
      error: data.error || `No active contracts found for '${eventTicker}' on Kalshi`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || `Failed to connect to Kalshi proxy for '${eventTicker}'`,
    };
  }
}
