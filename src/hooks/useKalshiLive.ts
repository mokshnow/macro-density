import { useState, useEffect, useCallback } from 'react';
import { MacroMarket } from '../types/market';
import { INITIAL_MACRO_MARKETS } from '../data/mockMarkets';
import { fetchCoreKalshiMarkets } from '../utils/kalshiApi';

const STORAGE_KEY_MARKETS = 'macro_density_last_live_markets_v2';
const STORAGE_KEY_LAST_UPDATED = 'macro_density_last_live_updated_v2';

function getInitialMarkets(): MacroMarket[] {
  if (typeof window === 'undefined') return INITIAL_MACRO_MARKETS;
  try {
    const cached = localStorage.getItem(STORAGE_KEY_MARKETS);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure default core markets are present
        const merged = [...parsed];
        INITIAL_MACRO_MARKETS.forEach((init) => {
          if (!merged.some((m) => m.id === init.id)) {
            merged.push(init);
          }
        });
        return merged;
      }
    }
  } catch (e) {
    console.warn('Failed to read cached markets from localStorage:', e);
  }
  return INITIAL_MACRO_MARKETS;
}

function getInitialLastRefreshed(): string {
  if (typeof window === 'undefined') return new Date().toISOString();
  try {
    const cached = localStorage.getItem(STORAGE_KEY_LAST_UPDATED);
    if (cached) return cached;
  } catch {}
  return new Date().toISOString();
}

export function useKalshiLive() {
  const [markets, setMarkets] = useState<MacroMarket[]>(getInitialMarkets);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(getInitialLastRefreshed);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchLive = useCallback(async (isManual: boolean = false) => {
    if (isManual) setIsRefreshing(true);
    setFetchError(null);

    try {
      const result = await fetchCoreKalshiMarkets();
      if (result.success && result.markets.length > 0) {
        const updateTime = result.lastUpdated || new Date().toISOString();
        setMarkets((prev) => {
          // Merge live markets with any custom added markets by user
          const customMarkets = prev.filter(
            (m) => !INITIAL_MACRO_MARKETS.some((init) => init.id === m.id) && !result.markets.some((lm) => lm.id === m.id)
          );
          const updated = [...result.markets, ...customMarkets];
          try {
            localStorage.setItem(STORAGE_KEY_MARKETS, JSON.stringify(updated));
            localStorage.setItem(STORAGE_KEY_LAST_UPDATED, updateTime);
          } catch (e) {
            console.warn('Failed to save live markets to localStorage:', e);
          }
          return updated;
        });
        setIsLiveConnected(true);
        setLastRefreshedAt(updateTime);
      } else {
        setIsLiveConnected(false);
        setFetchError(result.error || 'Live Kalshi API could not be reached');
      }
    } catch (err: any) {
      setIsLiveConnected(false);
      setFetchError(err?.message || 'Network error connecting to Kalshi');
    } finally {
      if (isManual) setIsRefreshing(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchLive(false);

    // Auto-poll every 60 seconds
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchLive(false);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchLive]);

  const addCustomMarket = useCallback((newMarket: MacroMarket) => {
    setMarkets((prev) => {
      const updated = [newMarket, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY_MARKETS, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to cache custom market:', e);
      }
      return updated;
    });
  }, []);

  return {
    markets,
    setMarkets,
    isLiveConnected,
    isRefreshing,
    lastRefreshedAt,
    fetchError,
    refreshLive: () => fetchLive(true),
    addCustomMarket,
  };
}

/**
 * Hook to render live relative time updates (e.g. "5s ago", "2m ago") ticking every 3 seconds.
 */
export function useRelativeTime(isoString?: string): string {
  const [relativeText, setRelativeText] = useState<string>('just now');

  useEffect(() => {
    const update = () => {
      if (!isoString) {
        setRelativeText('just now');
        return;
      }

      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffSec = Math.max(0, Math.floor(diffMs / 1000));

      if (diffSec < 5) {
        setRelativeText('just now');
      } else if (diffSec < 60) {
        setRelativeText(`${diffSec}s ago`);
      } else if (diffSec < 3600) {
        const mins = Math.floor(diffSec / 60);
        setRelativeText(`${mins}m ago`);
      } else {
        const hours = Math.floor(diffSec / 3600);
        setRelativeText(`${hours}h ago`);
      }
    };

    update();
    const interval = setInterval(update, 3000);
    return () => clearInterval(interval);
  }, [isoString]);

  return relativeText;
}
