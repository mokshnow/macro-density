import React from 'react';
import { StatisticalMoments } from '../types/market';

interface RiskMomentsCardProps {
  moments: StatisticalMoments;
  unitSuffix: string;
}

export const RiskMomentsCard: React.FC<RiskMomentsCardProps> = ({ moments, unitSuffix }) => {
  return (
    <div className="bg-white rounded-2xl border-2 border-gray-300 shadow-sm p-5 sm:p-6 mb-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-5">
        <h3 className="text-base font-extrabold text-gray-950 tracking-tight">
          Tail Risk
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Expected Value & Median */}
        <div className="p-4 rounded-xl bg-white border-2 border-gray-300 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Central Tendency
            </span>
          </div>
          <div className="space-y-1.5 my-1">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-600 font-medium">Expected Value:</span>
              <span className="font-mono font-bold text-gray-950 text-base">
                {moments.mean}{unitSuffix}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-600 font-medium">Median:</span>
              <span className="font-mono font-bold text-gray-800 text-sm">
                {moments.median}{unitSuffix}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-600 font-medium">Mode:</span>
              <span className="font-mono font-bold text-[#008A45] text-sm">
                {moments.modeRange}
              </span>
            </div>
          </div>
          <div className="text-[11px] text-gray-500 font-medium pt-2 border-t border-gray-200 mt-2">
            Probability weighted mean of outcomes
          </div>
        </div>

        {/* Metric 2: Implied Volatility & IQR */}
        <div className="p-4 rounded-xl bg-white border-2 border-gray-300 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Implied Dispersion
            </span>
          </div>
          <div className="space-y-1.5 my-1">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-600 font-medium">1 Std Dev:</span>
              <span className="font-mono font-bold text-gray-950 text-base">
                ±{moments.stdDev}{unitSuffix}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-600 font-medium">68% Band:</span>
              <span className="font-mono font-bold text-gray-800 text-sm">
                [{moments.confidence68[0]}, {moments.confidence68[1]}]
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-600 font-medium">IQR (25–75%):</span>
              <span className="font-mono font-bold text-gray-800 text-sm">
                [{moments.interquartileRange[0]}, {moments.interquartileRange[1]}]
              </span>
            </div>
          </div>
          <div className="text-[11px] text-gray-500 font-medium pt-2 border-t border-gray-200 mt-2">
            Model-free market uncertainty band
          </div>
        </div>

        {/* Metric 3: Skewness & Kurtosis */}
        <div className="p-4 rounded-xl bg-white border-2 border-gray-300 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Shape & Asymmetry
            </span>
          </div>
          <div className="space-y-1.5 my-1">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-600 font-medium">Skewness (γ₁):</span>
              <span className={`font-mono font-bold text-sm ${moments.skewness > 0 ? 'text-amber-700' : 'text-blue-700'}`}>
                {moments.skewness > 0 ? `+${moments.skewness}` : moments.skewness}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-600 font-medium">Excess Kurtosis (κ):</span>
              <span className="font-mono font-bold text-gray-800 text-sm">
                {moments.kurtosis > 0 ? `+${moments.kurtosis}` : moments.kurtosis}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-600 font-medium">Surprise Bias:</span>
              <span className="font-bold text-xs text-gray-900">
                {moments.skewness > 0 ? 'Upside Risk Biased' : 'Downside Risk Biased'}
              </span>
            </div>
          </div>
          <div className="text-[11px] text-gray-500 font-medium pt-2 border-t border-gray-200 mt-2">
            Positive skew indicates heavier upside tail
          </div>
        </div>

        {/* Metric 4: Value at Risk & Extreme Tails */}
        <div className="p-4 rounded-xl bg-white border-2 border-gray-300 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Tail Risk & VaR
            </span>
            <span className="text-[11px] font-mono text-rose-600 font-bold">95% Risk</span>
          </div>
          <div className="space-y-1.5 my-1">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-600 font-medium">95% VaR Threshold:</span>
              <span className="font-mono font-bold text-rose-600 text-base">
                {moments.var95}{unitSuffix}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-600 font-medium">Expected Shortfall:</span>
              <span className="font-mono font-bold text-gray-800 text-sm">
                {moments.cvar95}{unitSuffix}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-600 font-medium">Right Tail (&gt; 1.5σ):</span>
              <span className="font-mono font-bold text-gray-950 text-sm">
                {moments.upsideTailProb}%
              </span>
            </div>
          </div>
          <div className="text-[11px] text-gray-500 font-medium pt-2 border-t border-gray-200 mt-2">
            P(Outcome &gt; {moments.var95}{unitSuffix}) = 5.0%
          </div>
        </div>
      </div>
    </div>
  );
};
