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
      setErrorMessage('Invalid Kalshi URL or ticker format. Please provide a valid market link (e.g. KXUSCPIYEAR-29FEB01).');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl border-2 border-black shadow-elevated max-w-xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between pb-4 border-b-2 border-gray-300">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-[#00A854] border-2 border-[#BBF7D0]">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-gray-950 tracking-tight">
                Import Live Kalshi Market
              </h2>
              <p className="text-xs text-gray-600 font-medium">
                Fetch and construct live probability distributions from active Kalshi events
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-950 hover:bg-gray-100 transition-colors border-2 border-gray-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* URL Form */}
        <form onSubmit={handleUrlSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1.5">
              Kalshi Market URL or Event Ticker
            </label>
            <div className="relative">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="KXUSCPIYEAR-29FEB01 or https://kalshi.com/markets/..."
                className="w-full px-3.5 py-2.5 text-xs font-mono bg-gray-50 border-2 border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00D26A]/30 focus:border-[#00D26A]"
              />
            </div>
            <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-600 flex-wrap">
              <span className="font-medium">Active Examples:</span>
              <button
                type="button"
                onClick={() => setUrlInput('KXUSCPIYEAR-29FEB01')}
                className="text-[#008A45] hover:underline font-mono font-bold cursor-pointer"
              >
                KXUSCPIYEAR-29FEB01
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setUrlInput('KXFEDFUNDSYEAR-30JAN01')}
                className="text-[#008A45] hover:underline font-mono font-bold cursor-pointer"
              >
                KXFEDFUNDSYEAR-30JAN01
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setUrlInput('KXGDPYEAR-28')}
                className="text-[#008A45] hover:underline font-mono font-bold cursor-pointer"
              >
                KXGDPYEAR-28
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 text-rose-900 text-xs border-2 border-rose-300 font-medium flex items-start gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
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
                <span>Fetch & Build Distribution</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
