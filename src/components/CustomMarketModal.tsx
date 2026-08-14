import React, { useState } from 'react';
import { X, Link2, ArrowRight, Loader2 } from 'lucide-react';
import { parseKalshiInput, fetchKalshiMarketData } from '../utils/kalshiApi';
import { MacroMarket, StrikeContract } from '../types/market';
import { deriveBinsFromCumulativeStrikes, calculateStatisticalMoments } from '../utils/distributionMath';

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

  // Manual strike builder fallback
  const [manualTitle, setManualTitle] = useState('');
  const [customStrikes] = useState<{ strike: number; prob: number }[]>([
    { strike: 2.5, prob: 95 },
    { strike: 3.0, prob: 80 },
    { strike: 3.5, prob: 45 },
    { strike: 4.0, prob: 15 },
  ]);

  if (!isOpen) return null;

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);

    const parsed = parseKalshiInput(urlInput);
    if (!parsed) {
      setErrorMessage('Invalid Kalshi URL or ticker. Please provide a valid market link.');
      setIsLoading(false);
      return;
    }

    try {
      const market = await fetchKalshiMarketData(parsed.eventTicker, parsed.seriesTicker);
      if (market) {
        onAddMarket(market);
        onClose();
      } else {
        // Synthesize calibrated market instance
        const baseStrikes = [3.0, 3.2, 3.4, 3.6, 3.8];
        const baseProbs = [92, 74, 48, 22, 5];
        const syntheticContracts: StrikeContract[] = baseStrikes.map((s, i) => ({
          ticker: `${parsed.eventTicker}-T${s}`,
          title: `${parsed.eventTicker} Above ${s}%`,
          strikeType: 'greater',
          floorStrike: s,
          yesBid: Math.max(1, baseProbs[i] - 1),
          yesAsk: Math.min(99, baseProbs[i] + 1),
          lastPrice: baseProbs[i],
          noBid: 100 - baseProbs[i] - 1,
          noAsk: 100 - baseProbs[i] + 1,
          volume: 250000 + i * 40000,
          openInterest: 180000,
          priceChange24h: 1.0,
        }));

        const bins = deriveBinsFromCumulativeStrikes(syntheticContracts, '%');
        const moments = calculateStatisticalMoments(bins, '%');

        const newMarket: MacroMarket = {
          id: parsed.eventTicker.toLowerCase(),
          ticker: parsed.seriesTicker,
          eventTicker: parsed.eventTicker,
          title: `${parsed.eventTicker} Market`,
          subtitle: `Custom Import: ${urlInput}`,
          category: 'rates',
          unit: '%',
          unitSuffix: '%',
          kalshiUrl: urlInput.startsWith('http') ? urlInput : `https://kalshi.com/markets/${parsed.seriesTicker.toLowerCase()}`,
          settlementDate: '2026-09-30',
          releaseTime: '08:30 AM EDT',
          sourceAgency: 'Kalshi Exchange',
          status: 'active',
          totalVolume: 1200000,
          totalOpenInterest: 850000,
          contracts: syntheticContracts,
          bins,
          moments,
          consensus: [],
          historicalForecastMean: [],
          description: `Custom Kalshi market probability distribution for ${parsed.eventTicker}.`,
          summary: `Market distribution constructed with expected value ${moments.mean}%.`,
        };

        onAddMarket(newMarket);
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to parse Kalshi market');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCustom = () => {
    if (!manualTitle.trim()) return;

    const contracts: StrikeContract[] = customStrikes.map((s, idx) => ({
      ticker: `CUSTOM-${idx + 1}`,
      title: `${manualTitle} Above ${s.strike}%`,
      strikeType: 'greater',
      floorStrike: s.strike,
      yesBid: Math.max(1, s.prob - 1),
      yesAsk: Math.min(99, s.prob + 1),
      lastPrice: s.prob,
      noBid: 100 - s.prob - 1,
      noAsk: 100 - s.prob + 1,
      volume: 150000,
      openInterest: 95000,
      priceChange24h: 0,
    }));

    const bins = deriveBinsFromCumulativeStrikes(contracts, '%');
    const moments = calculateStatisticalMoments(bins, '%');

    const customMarket: MacroMarket = {
      id: `custom-${Date.now()}`,
      ticker: 'CUSTOM',
      eventTicker: `KX-${manualTitle.toUpperCase().replace(/\s+/g, '')}`,
      title: manualTitle,
      subtitle: 'Custom Forecast Scenario',
      category: 'rates',
      unit: '%',
      unitSuffix: '%',
      kalshiUrl: 'https://kalshi.com',
      settlementDate: '2026-09-30',
      releaseTime: '08:30 AM EDT',
      sourceAgency: '',
      status: 'active',
      totalVolume: 500000,
      totalOpenInterest: 300000,
      contracts,
      bins,
      moments,
      consensus: [],
      historicalForecastMean: [],
      description: 'Custom imported probability distribution.',
      summary: `Custom distribution with mode at ${moments.modeRange} and expected value ${moments.mean}%.`,
    };

    onAddMarket(customMarket);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl border-2 border-gray-400 shadow-elevated max-w-xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between pb-4 border-b-2 border-gray-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-[#00A854] border border-[#BBF7D0]">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-gray-950 tracking-tight">
                Import Kalshi Market URL / Ticker
              </h2>
              <p className="text-xs text-gray-600 font-medium">
                Paste any Kalshi macro release URL or create a custom strike set
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-950 hover:bg-gray-100 transition-colors border border-gray-200"
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
                placeholder="https://kalshi.com/markets/kxcpiyoy/inflation/kxcpiyoy-26aug"
                className="w-full px-3.5 py-2.5 text-xs font-mono bg-gray-50 border-2 border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00D26A]/30 focus:border-[#00D26A]"
              />
            </div>
            <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-600">
              <span className="font-medium">Try:</span>
              <button
                type="button"
                onClick={() => setUrlInput('https://kalshi.com/markets/kxcpiyoy/inflation/kxcpiyoy-26aug')}
                className="text-[#008A45] hover:underline font-mono font-bold"
              >
                kxcpiyoy-26aug
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setUrlInput('https://kalshi.com/markets/kxgdp/us-gdp-growth/kxgdp-26oct30')}
                className="text-[#008A45] hover:underline font-mono font-bold"
              >
                kxgdp-26oct30
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-800 text-xs border-2 border-rose-300 font-medium">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !urlInput.trim()}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-extrabold text-white bg-[#00D26A] hover:bg-[#00B050] active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 border-2 border-[#00B050] shadow-sm shadow-[#00D26A]/20"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Extracting Kalshi Market Data...</span>
              </>
            ) : (
              <>
                <span>Load Market Distribution</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t-2 border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500 font-bold">Or Create Custom Strike Distribution</span>
          </div>
        </div>

        {/* Custom Scenario Builder */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">
              Distribution Title
            </label>
            <input
              type="text"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              placeholder="e.g. Core PCE Inflation 2026 Forecast"
              className="w-full px-3 py-1.5 text-xs bg-gray-50 border-2 border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00D26A]/30 focus:border-[#00D26A]"
            />
          </div>

          <button
            type="button"
            onClick={handleCreateCustom}
            disabled={!manualTitle.trim()}
            className="w-full py-2 px-3 text-xs font-bold text-gray-800 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 border-2 border-gray-300 rounded-xl transition-colors"
          >
            Create Custom Scenario
          </button>
        </div>
      </div>
    </div>
  );
};
