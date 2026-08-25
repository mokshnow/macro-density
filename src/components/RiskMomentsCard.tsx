import React from 'react';
import { StatisticalMoments } from '../types/market';

interface RiskMomentsCardProps {
  moments: StatisticalMoments;
  unitSuffix: string;
}

export const RiskMomentsCard: React.FC<RiskMomentsCardProps> = ({ moments, unitSuffix }) => {
  const safeMean = moments?.mean ?? 0;
  const safeStdDev = moments?.stdDev ?? 0;
  const safeMedian = moments?.median ?? safeMean;
  const safeModeRange = moments?.modeRange ?? `${safeMean}${unitSuffix}`;
  const safeConf68 = moments?.confidence68 && moments.confidence68.length >= 2 
    ? moments.confidence68 
    : [
        Number((safeMean - safeStdDev).toFixed(2)),
        Number((safeMean + safeStdDev).toFixed(2)),
      ];
  const safeIqr = moments?.interquartileRange && moments.interquartileRange.length >= 2
    ? moments.interquartileRange
    : [
        Number((safeMean - 0.675 * safeStdDev).toFixed(2)),
        Number((safeMean + 0.675 * safeStdDev).toFixed(2)),
      ];
  const safeSkewness = moments?.skewness ?? 0;
  const safeKurtosis = moments?.kurtosis ?? 0;
  const safeVar95 = moments?.var95 ?? Number((safeMean + 1.645 * safeStdDev).toFixed(2));
  const safeCvar95 = moments?.cvar95 ?? safeVar95;
  const safeUpsideTail = moments?.upsideTailProb ?? 5;

  return (
    <div className="bg-white dark:bg-[#131924] rounded-2xl border-2 border-black dark:border-white shadow-md shadow-gray-900/5 p-5 sm:p-6 mb-6 transition-colors">
      <div className="flex items-center justify-between pb-4 border-b-2 border-gray-300 dark:border-white/30 mb-5">
        <h3 className="text-base font-extrabold text-gray-950 dark:text-white tracking-tight">
          Distribution Moments
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Expected Value & Median */}
        <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-[#1A2332] border-2 border-gray-300 dark:border-white/30 hover:border-gray-400 dark:hover:border-white/60 shadow-xs transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wider">
              Expected Outcome
            </span>
          </div>
          <div className="space-y-1.5 my-1">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Expected Value:</span>
              <span className="font-mono font-bold text-gray-950 dark:text-white text-base">
                {safeMean}{unitSuffix}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Median:</span>
              <span className="font-mono font-bold text-gray-800 dark:text-gray-200 text-sm">
                {safeMedian}{unitSuffix}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Mode:</span>
              <span className="font-mono font-bold text-[#008A45] dark:text-[#00E676] text-sm">
                {safeModeRange}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 2: Implied Volatility & IQR */}
        <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-[#1A2332] border-2 border-gray-300 dark:border-white/30 hover:border-gray-400 dark:hover:border-white/60 shadow-xs transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wider">
              Implied Variance
            </span>
          </div>
          <div className="space-y-1.5 my-1">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">1 Std Dev:</span>
              <span className="font-mono font-bold text-gray-950 dark:text-white text-base">
                ±{safeStdDev}{unitSuffix}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">68% Band:</span>
              <span className="font-mono font-bold text-gray-800 dark:text-gray-200 text-sm">
                [{safeConf68[0]}, {safeConf68[1]}]
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">IQR (25–75%):</span>
              <span className="font-mono font-bold text-gray-800 dark:text-gray-200 text-sm">
                [{safeIqr[0]}, {safeIqr[1]}]
              </span>
            </div>
          </div>
        </div>

        {/* Metric 3: Skewness & Kurtosis */}
        <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-[#1A2332] border-2 border-gray-300 dark:border-white/30 hover:border-gray-400 dark:hover:border-white/60 shadow-xs transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wider">
              Shape &amp; Asymmetry
            </span>
          </div>
          <div className="space-y-1.5 my-1">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Skewness (γ₁):</span>
              <span className={`font-mono font-bold text-sm ${safeSkewness > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-blue-700 dark:text-blue-300'}`}>
                {safeSkewness > 0 ? `+${safeSkewness}` : safeSkewness}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Excess Kurtosis (κ):</span>
              <span className="font-mono font-bold text-gray-800 dark:text-gray-200 text-sm">
                {safeKurtosis > 0 ? `+${safeKurtosis}` : safeKurtosis}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Surprise Bias:</span>
              <span className="font-bold text-xs text-gray-900 dark:text-gray-100">
                {safeSkewness > 0 ? 'Upside Risk Biased' : 'Downside Risk Biased'}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 4: Value at Risk & Extreme Tails */}
        <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-[#1A2332] border-2 border-gray-300 dark:border-white/30 hover:border-gray-400 dark:hover:border-white/60 shadow-xs transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wider">
              Tail Risk &amp; VaR
            </span>
            <span className="text-[11px] font-mono text-rose-600 dark:text-rose-400 font-bold">95% Risk</span>
          </div>
          <div className="space-y-1.5 my-1">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">95% VaR Threshold:</span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-base">
                {safeVar95}{unitSuffix}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Expected Shortfall:</span>
              <span className="font-mono font-bold text-gray-800 dark:text-gray-200 text-sm">
                {safeCvar95}{unitSuffix}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Right Tail (&gt; 1.5σ):</span>
              <span className="font-mono font-bold text-gray-950 dark:text-white text-sm">
                {safeUpsideTail}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
