import React from 'react';
import { MacroMarket } from '../types/market';
import { TrendingUp, Percent, Briefcase, DollarSign } from 'lucide-react';

interface MarketSelectorProps {
  markets: MacroMarket[];
  selectedMarketId: string;
  onSelectMarket: (marketId: string) => void;
}

export const MarketSelector: React.FC<MarketSelectorProps> = ({
  markets,
  selectedMarketId,
  onSelectMarket,
}) => {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'inflation':
        return <Percent className="w-3.5 h-3.5" />;
      case 'gdp':
        return <TrendingUp className="w-3.5 h-3.5" />;
      case 'labor':
        return <Briefcase className="w-3.5 h-3.5" />;
      case 'fed':
      case 'rates':
        return <DollarSign className="w-3.5 h-3.5" />;
      default:
        return <Percent className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {markets.map((market) => {
          const isSelected = market.id === selectedMarketId;
          return (
            <button
              key={market.id}
              onClick={() => onSelectMarket(market.id)}
              className={`group text-left p-4 rounded-xl transition-all relative border-2 text-sm cursor-pointer ${
                isSelected
                  ? 'bg-white dark:bg-[#161F2E] border-[#00D26A] dark:border-[#00D26A] ring-2 ring-[#00D26A]/30 shadow-md'
                  : 'bg-white dark:bg-[#131924] hover:bg-gray-50 dark:hover:bg-[#1A2332] border-black dark:border-white hover:border-gray-800 dark:hover:border-white shadow-sm'
              }`}
            >
              {isSelected && (
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00D26A] animate-pulse"></span>
                </div>
              )}

              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1.5 font-medium">
                <span className={`p-1 rounded-md ${isSelected ? 'bg-[#F0FDF4] dark:bg-emerald-950/70 text-[#00A854] dark:text-[#00E676]' : 'bg-gray-100 dark:bg-[#1E293B] text-gray-700 dark:text-gray-300'}`}>
                  {getCategoryIcon(market.category)}
                </span>
                <span className="font-mono text-[11px] font-bold tracking-tight text-gray-700 dark:text-gray-300">
                  {market.eventTicker}
                </span>
              </div>

              <div className="font-bold text-gray-950 dark:text-white leading-tight mb-1 truncate text-sm">
                {market.title}
              </div>

              <div className="flex items-center justify-between text-xs mt-2.5 pt-2 border-t border-gray-200 dark:border-white/20">
                <span className="text-gray-600 dark:text-gray-400 text-[11px]">
                  Mode: <strong className="font-mono text-gray-950 dark:text-gray-100">{market.moments.modeRange}</strong>
                </span>
                <span className="font-mono text-[11px] text-gray-700 dark:text-emerald-300 bg-gray-100 dark:bg-emerald-950/60 border border-gray-200 dark:border-emerald-700/60 px-1.5 py-0.5 rounded font-bold">
                  E[X] = {market.moments.mean}{market.unitSuffix}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
