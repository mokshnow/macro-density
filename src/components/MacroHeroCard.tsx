import React from 'react';
import { MacroMarket } from '../types/market';
import { ExternalLink, Activity, Clock, Info } from 'lucide-react';
import { useRelativeTime } from '../hooks/useKalshiLive';

interface MacroHeroCardProps {
  market: MacroMarket;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

export const MacroHeroCard: React.FC<MacroHeroCardProps> = ({
  market,
  isRefreshing = false,
  onRefresh,
}) => {
  const { moments } = market;
  const relativeTime = useRelativeTime(market.lastUpdated);

  const skewDirection = moments.skewness > 0.15 
    ? 'Upside Skew' 
    : moments.skewness < -0.15 
      ? 'Downside Skew' 
      : 'Symmetric';

  const skewColor = moments.skewness > 0.15
    ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700/60'
    : moments.skewness < -0.15
      ? 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700/60'
      : 'text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700';

  const primaryConsensus = market.consensus && market.consensus.length > 0
    ? market.consensus[0]
    : null;

  const spreadBps = primaryConsensus ? Math.round((moments.mean - primaryConsensus.value) * 100) : 0;
  const formattedSummary = primaryConsensus
    ? `Market-implied expected value of ${moments.mean}${market.unitSuffix} vs. ${primaryConsensus.source} of ${primaryConsensus.value}${market.unitSuffix} (${spreadBps >= 0 ? '+' : ''}${spreadBps} bps spread). Modal mass is centered at ${moments.modeRange}. Tail risk prices an adverse 95% threshold at ${moments.var95}${market.unitSuffix} with an upside shock risk of ${moments.upsideTailProb}% (${moments.skewness >= 0 ? `+${moments.skewness}` : moments.skewness} skew).`
    : market.summary || `Market-implied expected value of ${moments.mean}${market.unitSuffix}. Modal mass is centered at ${moments.modeRange}. Tail risk prices a 95% threshold at ${moments.var95}${market.unitSuffix} with ${moments.upsideTailProb}% shock risk (${moments.skewness >= 0 ? `+${moments.skewness}` : moments.skewness} skew).`;

  return (
    <div className="bg-white dark:bg-[#131924] rounded-2xl border-2 border-black dark:border-white shadow-md shadow-gray-900/5 p-5 sm:p-6 mb-6 transition-colors">
      {/* Offline / Snapshot Transparency Alert */}
      {(!market.isLive || market.isSnapshot) && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Viewing Reference Snapshot:</strong> Live Kalshi API could not be reached. Showing reference snapshot data.
            </span>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="px-3 py-1 rounded-lg bg-amber-200 dark:bg-amber-900/60 hover:bg-amber-300 dark:hover:bg-amber-800 text-amber-950 dark:text-amber-100 font-bold text-xs transition-colors shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isRefreshing ? 'Retrying...' : 'Retry Connection'}
            </button>
          )}
        </div>
      )}

      {/* Illiquid Strikes Notice */}
      {market.hasIlliquidStrikes && (
        <div className="mb-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-300 dark:border-blue-700/60 text-blue-950 dark:text-blue-200 text-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>
              <strong>Quote Quality Notice:</strong> Some thin strikes lacked active quotes and have been monotonically bounded from adjacent strikes rather than assuming a default 50% coin-flip.
            </span>
          </div>
        </div>
      )}

      {/* Top row: Title, Meta, and Kalshi Link */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b-2 border-gray-300 dark:border-white/30">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-gray-950 dark:bg-gray-800 text-white border border-gray-800 dark:border-gray-700">
              {market.eventTicker}
            </span>

            {/* Live Feed Status Pill */}
            {market.isLive ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-[#008A45] dark:text-[#00E676] border-2 border-[#BBF7D0] dark:border-emerald-800/60 text-xs font-extrabold shadow-2xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>LIVE KALSHI FEED</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-2 border-amber-300 dark:border-amber-700/60 text-xs font-bold shadow-2xs">
                <span className="inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                <span>REFERENCE SNAPSHOT</span>
              </span>
            )}

            {/* Last Updated Timestamp */}
            <span
              className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 font-medium font-mono pl-1"
              title={market.lastUpdated ? `Last synchronized at ${new Date(market.lastUpdated).toUTCString()}` : 'Snapshot'}
            >
              <Clock className="w-3 h-3 text-gray-400 dark:text-gray-500" />
              <span>{relativeTime}</span>
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-950 dark:text-white tracking-tight">
            {market.title}
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5 font-medium">
            {market.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <a
            href={market.kalshiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-gray-800 dark:text-gray-200 hover:text-gray-950 dark:hover:text-white bg-gray-50 dark:bg-[#1A2332] hover:bg-gray-100 dark:hover:bg-[#202B3D] border-2 border-gray-300 dark:border-white rounded-xl transition-all shadow-2xs"
          >
            <span>View on Kalshi</span>
            <ExternalLink className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
          </a>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 py-5">
        {/* 1. Modal Mass */}
        <div className="bg-gray-50/70 dark:bg-[#1A2332] p-3.5 rounded-xl border-2 border-gray-300 dark:border-white/30 hover:border-gray-400 dark:hover:border-white/60 shadow-xs transition-colors">
          <div className="text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
            Modal Peak
          </div>
          <div className="text-xl font-extrabold font-mono text-gray-950 dark:text-white">
            {moments.modeRange}
          </div>
          <div className="text-[11px] text-[#008A45] dark:text-[#00E676] font-bold mt-0.5">
            Most Probable Bucket
          </div>
        </div>

        {/* 2. Expected Value */}
        <div className="bg-gray-50/70 dark:bg-[#1A2332] p-3.5 rounded-xl border-2 border-gray-300 dark:border-white/30 hover:border-gray-400 dark:hover:border-white/60 shadow-xs transition-colors">
          <div className="text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
            Expected Value
          </div>
          <div className="text-xl font-extrabold font-mono text-gray-950 dark:text-white">
            {moments.mean}{market.unitSuffix}
          </div>
          <div className="text-[11px] text-gray-600 dark:text-gray-400 font-semibold mt-0.5">
            Probability Weighted Mean
          </div>
        </div>

        {/* 3. Implied Volatility */}
        <div className="bg-gray-50/70 dark:bg-[#1A2332] p-3.5 rounded-xl border-2 border-gray-300 dark:border-white/30 hover:border-gray-400 dark:hover:border-white/60 shadow-xs transition-colors">
          <div className="text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
            Implied Vol
          </div>
          <div className="text-xl font-extrabold font-mono text-gray-950 dark:text-white">
            ±{moments.stdDev}{market.unitSuffix}
          </div>
          <div className="text-[11px] text-gray-600 dark:text-gray-400 font-semibold mt-0.5">
            68% Range: [{moments.confidence68[0]}, {moments.confidence68[1]}]
          </div>
        </div>

        {/* 4. Skewness */}
        <div className="bg-gray-50/70 dark:bg-[#1A2332] p-3.5 rounded-xl border-2 border-gray-300 dark:border-white/30 hover:border-gray-400 dark:hover:border-white/60 shadow-xs transition-colors">
          <div className="text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
            Distribution Skew
          </div>
          <div className="text-xl font-extrabold font-mono text-gray-950 dark:text-white">
            {moments.skewness > 0 ? `+${moments.skewness}` : moments.skewness}
          </div>
          <div className="text-[11px] font-medium mt-0.5">
            <span className={`inline-block px-1.5 py-0.2 rounded border font-bold text-[10px] ${skewColor}`}>
              {skewDirection}
            </span>
          </div>
        </div>

        {/* 5. 95% Tail Risk (VaR) */}
        <div className="bg-gray-50/70 dark:bg-[#1A2332] p-3.5 rounded-xl border-2 border-gray-300 dark:border-white/30 hover:border-gray-400 dark:hover:border-white/60 shadow-xs transition-colors">
          <div className="text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
            95% Tail Threshold
          </div>
          <div className="text-xl font-extrabold font-mono text-gray-950 dark:text-white">
            {moments.var95}{market.unitSuffix}
          </div>
          <div className="text-[11px] text-rose-600 dark:text-rose-400 font-bold mt-0.5">
            Adverse Tail: {moments.upsideTailProb}%
          </div>
        </div>

        {/* 6. Consensus */}
        <div className="group relative bg-gray-50/70 dark:bg-[#1A2332] p-3.5 rounded-xl border-2 border-gray-300 dark:border-white/30 hover:border-gray-400 dark:hover:border-white/60 shadow-xs transition-colors cursor-pointer">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Consensus
            </span>
            {primaryConsensus && (
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                moments.mean >= primaryConsensus.value
                  ? 'text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700/60'
                  : 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700/60'
              }`}>
                {moments.mean >= primaryConsensus.value ? '+' : ''}{((moments.mean - primaryConsensus.value) * 100).toFixed(0)} bps
              </span>
            )}
          </div>
          <div className="text-xl font-extrabold font-mono text-gray-950 dark:text-white">
            {primaryConsensus ? `${primaryConsensus.value}${market.unitSuffix}` : `${moments.mean}${market.unitSuffix}`}
          </div>
          <div className="text-[11px] text-gray-600 dark:text-gray-400 font-semibold mt-0.5 truncate" title={primaryConsensus?.source || 'Survey Median'}>
            {primaryConsensus?.source || 'Survey Median'}
          </div>

          {/* Hover Survey Breakdown Tooltip */}
          {market.consensus && market.consensus.length > 0 && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-30 w-64 bg-gray-950 dark:bg-[#0F172A] text-white text-xs p-3 rounded-xl shadow-xl border-2 border-gray-700 dark:border-white pointer-events-none animate-in fade-in duration-150">
              <div className="font-extrabold text-[#00D26A] text-[11px] uppercase tracking-wider mb-1.5 pb-1 border-b border-gray-800 dark:border-gray-700">
                Institutional Consensus Benchmarks
              </div>
              <div className="space-y-1.5 font-mono text-[11px]">
                {market.consensus.map((c, i) => {
                  const diffBps = Math.round((moments.mean - c.value) * 100);
                  return (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <span className="text-gray-300 truncate font-sans text-xs">{c.source}:</span>
                      <span className="font-bold text-white whitespace-nowrap">
                        {c.value}{market.unitSuffix}{' '}
                        <span className={`text-[10px] ${diffBps >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          ({diffBps >= 0 ? '+' : ''}{diffBps} bps)
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Summary Banner */}
      <div className="pt-4 border-t-2 border-gray-300 dark:border-white/30 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5 text-gray-800 dark:text-gray-200 bg-gray-50/80 dark:bg-[#1A2332] p-3.5 rounded-xl border-2 border-gray-300 dark:border-white/30 w-full">
          <div className="p-1 rounded-md bg-[#00D26A]/20 text-[#008A45] dark:text-[#00E676] shrink-0 mt-0.5">
            <Activity className="w-4 h-4" />
          </div>
          <div className="leading-relaxed">
            <strong className="text-gray-950 dark:text-white font-bold">Summary: </strong>
            <span className="text-gray-700 dark:text-gray-300 font-medium">{formattedSummary}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
