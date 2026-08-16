import { useState, useEffect, useCallback } from 'react';
import { MacroMarket } from '../types/market';
import { INITIAL_MACRO_MARKETS } from '../data/mockMarkets';
import { fetchCoreKalshiMarkets } from '../utils/kalshiApi';

export function useKalshiLive() {
  const [markets, setMarkets] = useState<MacroMarket[]>(INITIAL_MACRO_MARKETS);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(new Date().toISOString());
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchLive = useCallback(async (isManual: boolean = false) => {
    if (isManual) setIsRefreshing(true);
    setFetchError(null);

    try {
      const result = await fetchCoreKalshiMarkets();
      if (result.success && result.markets.length > 0) {
        setMarkets((prev) => {
          // Merge live markets with any custom added markets by user
          const customMarkets = prev.filter((m) => !INITIAL_MACRO_MARKETS.some((init) => init.id === m.id));
          return [...result.markets, ...customMarkets];
        });
        setIsLiveConnected(true);
        setLastRefreshedAt(result.lastUpdated || new Date().toISOString());
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
    setMarkets((prev) => [newMarket, ...prev]);
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
export function useRelativeTime(isoString: string): string {
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
