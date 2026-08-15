import React, { useState, useMemo } from 'react';
import { MacroMarket } from '../types/market';
import { CheckCircle } from 'lucide-react';

interface HedgingSimulatorProps {
  market: MacroMarket;
}

export const HedgingSimulator: React.FC<HedgingSimulatorProps> = ({ market }) => {
  const [portfolioSize, setPortfolioSize] = useState<number>(5000000); // $5M
  const [sensitivityBps, setSensitivityBps] = useState<number>(15); // $15k per 10bps shock
  const [targetHedgeStrike, setTargetHedgeStrike] = useState<number>(
    market.contracts.length > 3 ? (market.contracts[3].floorStrike ?? 3.3) : 3.3
  );

  // Find relevant contract for hedge
  const hedgeContract = useMemo(() => {
    return (
      market.contracts.find((c) => c.floorStrike === targetHedgeStrike) ||
      market.contracts[Math.floor(market.contracts.length / 2)]
    );
  }, [market.contracts, targetHedgeStrike]);

  // Calculations
  const contractCostCents = hedgeContract?.lastPrice || 50;
  const contractCostDollars = contractCostCents / 100;
  const payoutPerContract = 1.0; // Kalshi pays $1 if outcome happens

  // Adverse outcome scenario (e.g. CPI > strike by +30bps)
  const adverseLoss = (sensitivityBps * 1000) * 3; // Estimated unhedged portfolio loss
  const requiredContracts = Math.ceil(adverseLoss / (payoutPerContract - contractCostDollars));
  const totalHedgePremium = requiredContracts * contractCostDollars;

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-300 shadow-sm p-5 sm:p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-200 mb-5">
        <h3 className="text-base font-extrabold text-gray-950 tracking-tight">
          Hedging
        </h3>
      </div>

      {/* Simulator Inputs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {/* Input 1: Portfolio Size */}
        <div className="p-4 rounded-xl bg-white border-2 border-gray-300 shadow-2xs">
          <label className="block text-xs font-bold text-gray-700 mb-1.5">
            Portfolio Notional Value (USD)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-500 font-mono font-bold text-xs">
              $
            </div>
            <input
              type="number"
              value={portfolioSize}
              onChange={(e) => setPortfolioSize(Math.max(0, Number(e.target.value)))}
              step={500000}
              className="w-full pl-6 pr-3 py-1.5 text-xs font-mono font-bold bg-gray-50 border-2 border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00D26A]/30 focus:border-[#00D26A]"
            />
          </div>
        </div>

        {/* Input 2: Macro Sensitivity */}
        <div className="p-4 rounded-xl bg-white border-2 border-gray-300 shadow-2xs">
          <label className="block text-xs font-bold text-gray-700 mb-1.5">
            Shock Sensitivity (Loss per +10bps)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-500 font-mono font-bold text-xs">
              $
            </div>
            <input
              type="number"
              value={sensitivityBps * 1000}
              onChange={(e) => setSensitivityBps(Math.max(1, Number(e.target.value) / 1000))}
              step={5000}
              className="w-full pl-6 pr-3 py-1.5 text-xs font-mono font-bold bg-gray-50 border-2 border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00D26A]/30 focus:border-[#00D26A]"
            />
          </div>
        </div>

        {/* Input 3: Target Strike */}
        <div className="p-4 rounded-xl bg-white border-2 border-gray-300 shadow-2xs">
          <label className="block text-xs font-bold text-gray-700 mb-1.5">
            Hedge Contract Strike
          </label>
          <select
            value={targetHedgeStrike}
            onChange={(e) => setTargetHedgeStrike(parseFloat(e.target.value))}
            className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-gray-50 border-2 border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00D26A]/30 focus:border-[#00D26A]"
          >
            {market.contracts.map((c) => (
              <option key={c.ticker} value={c.floorStrike}>
                {c.ticker} (&gt; {c.floorStrike}{market.unitSuffix} @ {c.lastPrice}¢)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Output / Hedge Sizing Banner */}
      <div className="bg-[#F0FDF4] border-2 border-[#86EFAC] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-[#00D26A] text-white shrink-0 mt-0.5 shadow-xs">
            <CheckCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-800 mt-0.5">
              Buy <strong className="font-mono text-gray-950 font-extrabold">{requiredContracts.toLocaleString()}</strong> contracts of{' '}
              <span className="font-mono font-bold text-emerald-900 bg-emerald-100 px-1.5 py-0.5 rounded">{hedgeContract?.ticker}</span>
            </div>
            <div className="text-xs text-gray-700 mt-1 font-medium">
              Provides <strong className="font-mono text-gray-950 font-bold">${adverseLoss.toLocaleString()}</strong> net insurance payout on adverse surprise.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l-2 border-emerald-300 pt-3 md:pt-0 md:pl-6">
          <div>
            <div className="text-[10px] uppercase text-emerald-900 font-bold tracking-wider">
              Total Hedge Premium
            </div>
            <div className="text-lg font-black font-mono text-gray-950">
              ${totalHedgePremium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-emerald-800 font-mono font-bold">
              ({((totalHedgePremium / portfolioSize) * 100).toFixed(3)}% of AUM)
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase text-emerald-900 font-bold tracking-wider">
              Implied Prob
            </div>
            <div className="text-lg font-black font-mono text-[#008A45]">
              {contractCostCents}%
            </div>
            <div className="text-[10px] text-gray-600 font-mono font-semibold">
              Cost: {contractCostCents}¢/share
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
