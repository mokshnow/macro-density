import React, { useState } from 'react';
import { X, Link2, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { parseKalshiInput, fetchKalshiMarketData } from '../utils/kalshiApi';
import { MacroMarket } from '../types/market';

interface CustomMarketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMarket: (market: MacroMarket) => void;
}

export const CustomMarketModal: React.FC<CustomMarketModalProps> = ({
  isOpen,
  onClose,
  onAddMarket,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);

    const parsed = parseKalshiInput(urlInput);
    if (!parsed) {
      setErrorMessage('Invalid Kalshi URL or ticker format. Please provide a valid market link (e.g. KXCPIYOY-26AUG).');
      setIsLoading(false);
      return;
    }

    try {
      const result = await fetchKalshiMarketData(parsed.eventTicker, parsed.seriesTicker);
      if (result.success && result.market) {
        onAddMarket(result.market);
        onClose();
      } else {
        setErrorMessage(
          result.error || `Could not find active trading contracts for '${parsed.eventTicker}' on Kalshi. Please check that this market is active.`
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || `Failed to fetch live Kalshi market data for '${parsed.eventTicker}'.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-[#131924] rounded-2xl border-2 border-black dark:border-white shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 transition-colors">
        <div className="flex items-start justify-between pb-4 border-b-2 border-gray-300 dark:border-white/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#00A854] dark:text-[#00E676] border-2 border-[#BBF7D0] dark:border-emerald-800/60">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-gray-950 dark:text-white tracking-tight">
                Import Live Kalshi Market
              </h2>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                Fetch and construct live probability distributions from active Kalshi events
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1A2332] transition-colors border-2 border-gray-300 dark:border-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* URL Form */}
        <form onSubmit={handleUrlSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1.5">
              Kalshi Market URL or Event Ticker
            </label>
            <div className="relative">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="KXCPIYOY-26AUG or https://kalshi.com/markets/..."
                className="w-full px-3.5 py-2.5 text-xs font-mono bg-gray-50 dark:bg-[#1A2332] border-2 border-gray-300 dark:border-white/30 rounded-xl focus:bg-white dark:focus:bg-[#202B3D] focus:outline-none focus:ring-2 focus:ring-[#00D26A]/30 focus:border-[#00D26A] text-gray-950 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-600 dark:text-gray-400 flex-wrap">
              <span className="font-medium">Active Examples:</span>
              <button
                type="button"
                onClick={() => setUrlInput('KXCPIYOY-26AUG')}
                className="text-[#008A45] dark:text-[#00E676] hover:underline font-mono font-bold cursor-pointer"
              >
                KXCPIYOY-26AUG
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setUrlInput('KXGDP-26OCT30')}
                className="text-[#008A45] dark:text-[#00E676] hover:underline font-mono font-bold cursor-pointer"
              >
                KXGDP-26OCT30
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setUrlInput('KXU3-26AUG')}
                className="text-[#008A45] dark:text-[#00E676] hover:underline font-mono font-bold cursor-pointer"
              >
                KXU3-26AUG
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200 text-xs border-2 border-rose-300 dark:border-rose-700/60 font-medium flex items-start gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Live Fetch Failed: </span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !urlInput.trim()}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-extrabold text-white bg-[#00D26A] hover:bg-[#00B050] active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 border-2 border-[#00B050] shadow-sm shadow-[#00D26A]/20 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Connecting to Kalshi API...</span>
              </>
            ) : (
              <>
                <span>Fetch &amp; Build Distribution</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
