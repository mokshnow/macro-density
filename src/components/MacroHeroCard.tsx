import React from 'react';
import { MacroMarket } from '../types/market';
import { ExternalLink, Activity } from 'lucide-react';

interface MacroHeroCardProps {
  market: MacroMarket;
}

export const MacroHeroCard: React.FC<MacroHeroCardProps> = ({ market }) => {
  const { moments } = market;

  const skewDirection = moments.skewness > 0.15 
    ? 'Upside Skew' 
    : moments.skewness < -0.15 
      ? 'Downside Skew' 
      : 'Symmetric';

  const skewColor = moments.skewness > 0.15
    ? 'text-amber-700 bg-amber-50 border-amber-300'
    : moments.skewness < -0.15
      ? 'text-blue-700 bg-blue-50 border-blue-300'
      : 'text-gray-700 bg-gray-50 border-gray-300';

  const primaryConsensus = market.consensus && market.consensus.length > 0
    ? market.consensus[0]
    : null;

  return (
    <div className="bg-white rounded-2xl border-2 border-black shadow-md shadow-gray-900/5 p-5 sm:p-6 mb-6">
      {/* Top row: Title, Meta, and Kalshi Link */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-gray-950 text-white">
              {market.eventTicker}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-950 tracking-tight">
            {market.title}
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-0.5 font-medium">
            {market.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={market.kalshiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-gray-800 hover:text-gray-950 bg-gray-50 hover:bg-gray-100 border-2 border-gray-400 hover:border-gray-500 rounded-xl transition-all shadow-2xs"
          >
            <span>View on Kalshi</span>
            <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
          </a>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 py-5">
        {/* 1. Modal Mass */}
        <div className="bg-gray-50/70 p-3.5 rounded-xl border-2 border-gray-300 hover:border-gray-400 shadow-xs transition-colors">
          <div className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
            Modal Peak
          </div>
          <div className="text-xl font-extrabold font-mono text-gray-950">
            {moments.modeRange}
          </div>
          <div className="text-[11px] text-[#008A45] font-bold mt-0.5">
            Most Probable Bucket
          </div>
        </div>

        {/* 2. Expected Value */}
        <div className="bg-gray-50/70 p-3.5 rounded-xl border-2 border-gray-300 hover:border-gray-400 shadow-xs transition-colors">
          <div className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
            Expected Value
          </div>
          <div className="text-xl font-extrabold font-mono text-gray-950">
            {moments.mean}{market.unitSuffix}
          </div>
          <div className="text-[11px] text-gray-600 font-semibold mt-0.5">
            Probability Weighted Mean
          </div>
        </div>

        {/* 3. Implied Volatility */}
        <div className="bg-gray-50/70 p-3.5 rounded-xl border-2 border-gray-300 hover:border-gray-400 shadow-xs transition-colors">
          <div className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
            Implied Vol
          </div>
          <div className="text-xl font-extrabold font-mono text-gray-950">
            ±{moments.stdDev}{market.unitSuffix}
          </div>
          <div className="text-[11px] text-gray-600 font-semibold mt-0.5">
            68% Range: [{moments.confidence68[0]}, {moments.confidence68[1]}]
          </div>
        </div>

        {/* 4. Skewness */}
        <div className="bg-gray-50/70 p-3.5 rounded-xl border-2 border-gray-300 hover:border-gray-400 shadow-xs transition-colors">
          <div className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
            Distribution Skew
          </div>
          <div className="text-xl font-extrabold font-mono text-gray-950">
            {moments.skewness > 0 ? `+${moments.skewness}` : moments.skewness}
          </div>
          <div className="text-[11px] font-medium mt-0.5">
            <span className={`inline-block px-1.5 py-0.2 rounded border font-bold text-[10px] ${skewColor}`}>
              {skewDirection}
            </span>
          </div>
        </div>

        {/* 5. 95% Tail Risk (VaR) */}
        <div className="bg-gray-50/70 p-3.5 rounded-xl border-2 border-gray-300 hover:border-gray-400 shadow-xs transition-colors">
          <div className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
            95% Tail Threshold
          </div>
          <div className="text-xl font-extrabold font-mono text-gray-950">
            {moments.var95}{market.unitSuffix}
          </div>
          <div className="text-[11px] text-rose-600 font-bold mt-0.5">
            Adverse Tail: {moments.upsideTailProb}%
          </div>
        </div>

        {/* 6. Consensus */}
        <div className="bg-gray-50/70 p-3.5 rounded-xl border-2 border-gray-300 hover:border-gray-400 shadow-xs transition-colors">
          <div className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
            Consensus
          </div>
          <div className="text-xl font-extrabold font-mono text-gray-950">
            {primaryConsensus ? `${primaryConsensus.value}${market.unitSuffix}` : `${moments.mean}${market.unitSuffix}`}
          </div>
          <div className="text-[11px] text-gray-600 font-semibold mt-0.5 truncate" title={primaryConsensus?.source || 'Survey Median'}>
            {primaryConsensus?.source || 'Survey Median'}
          </div>
        </div>
      </div>

      {/* Bottom Summary Banner */}
      <div className="pt-4 border-t border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5 text-gray-800 bg-gray-50/80 p-3.5 rounded-xl border-2 border-gray-300 w-full">
          <div className="p-1 rounded-md bg-[#00D26A]/20 text-[#008A45] shrink-0 mt-0.5">
            <Activity className="w-4 h-4" />
          </div>
          <div className="leading-relaxed">
            <strong className="text-gray-950 font-bold">Summary: </strong>
            <span className="text-gray-700 font-medium">{market.summary}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
