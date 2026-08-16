import React, { useState, useMemo } from 'react';
import { MacroMarket } from '../types/market';
import { CheckCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';

interface HedgingSimulatorProps {
  market: MacroMarket;
}

export const HedgingSimulator: React.FC<HedgingSimulatorProps> = ({ market }) => {
  const [portfolioSize, setPortfolioSize] = useState<number>(5000000); // $5M
  const [portfolioStr, setPortfolioStr] = useState<string>((5000000).toLocaleString());

  const [sensitivityPer10Bps, setSensitivityPer10Bps] = useState<number>(15000); // $15,000 loss per 10 bps
  const [sensitivityStr, setSensitivityStr] = useState<string>((15000).toLocaleString());

  const [shockBps, setShockBps] = useState<number>(30); // Assumed macro shock in basis points
  const [showModelInfo, setShowModelInfo] = useState<boolean>(false);

  const [targetHedgeStrike, setTargetHedgeStrike] = useState<number>(
    market.contracts.length > 3 ? (market.contracts[3].floorStrike ?? 3.3) : 3.3
  );

  const handlePortfolioChange = (val: string) => {
    const raw = val.replace(/[^0-9]/g, '');
    if (!raw) {
      setPortfolioStr('');
      setPortfolioSize(0);
      return;
    }
    const num = parseInt(raw, 10);
    setPortfolioSize(num);
    setPortfolioStr(num.toLocaleString());
  };

  const handlePortfolioBlur = () => {
    if (!portfolioStr.trim()) {
      setPortfolioStr(portfolioSize.toLocaleString() || '0');
    }
  };

  const handleSensitivityChange = (val: string) => {
    const raw = val.replace(/[^0-9]/g, '');
    if (!raw) {
      setSensitivityStr('');
      setSensitivityPer10Bps(0);
      return;
    }
    const num = parseInt(raw, 10);
    setSensitivityPer10Bps(num);
    setSensitivityStr(num.toLocaleString());
  };

  const handleSensitivityBlur = () => {
    if (!sensitivityStr.trim()) {
      setSensitivityStr(sensitivityPer10Bps.toLocaleString() || '0');
    }
  };

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
  const payoutPerContract = 1.0; // Kalshi pays $1.00 if strike event triggers

  // Transparent mathematical calculations
  const lossPerBp = sensitivityPer10Bps / 10; // Dollar loss per 1 bp shock
  const adverseLoss = lossPerBp * shockBps; // Total simulated portfolio loss
  const netPayoutPerContract = Math.max(0.01, payoutPerContract - contractCostDollars);
  const requiredContracts = Math.ceil(adverseLoss / netPayoutPerContract);
  const totalHedgePremium = requiredContracts * contractCostDollars;
  const grossInsurancePayout = requiredContracts * payoutPerContract;
  const netInsuranceCoverage = grossInsurancePayout - totalHedgePremium;

  return (
    <div className="bg-white rounded-2xl border-2 border-black shadow-md shadow-gray-900/5 p-5 sm:p-6 mb-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b-2 border-gray-300 mb-5">
        <div>
          <h3 className="text-base font-extrabold text-gray-950 tracking-tight">
            Hedging Simulator
          </h3>
        </div>

        <button
          onClick={() => setShowModelInfo(!showModelInfo)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-gray-700 hover:text-gray-950 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Info className="w-3.5 h-3.5 text-[#008A45]" />
          <span>Model Assumptions</span>
          {showModelInfo ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Model Assumptions & Formulas Accordion */}
      {showModelInfo && (
        <div className="mb-5 p-4 rounded-xl bg-gray-50 border-2 border-gray-300 text-xs text-gray-700 space-y-2 animate-in fade-in duration-200">
          <div className="font-extrabold text-gray-950 flex items-center gap-2 mb-1">
            <span>Model Framework & Derivation</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-1 font-mono text-[11px]">
            <div className="p-2.5 bg-white rounded-lg border border-gray-200">
              <span className="font-bold text-gray-900 block mb-1">1. Adverse Shock Loss:</span>
              Loss = (Sensitivity per 10bps / 10) × Shock (bps)
              <br />
              = (${(sensitivityPer10Bps / 10).toLocaleString()}/bp) × {shockBps} bps = <strong>${adverseLoss.toLocaleString()}</strong>
            </div>
            <div className="p-2.5 bg-white rounded-lg border border-gray-200">
              <span className="font-bold text-gray-900 block mb-1">2. Required Contracts:</span>
              Contracts = ⌈ Loss / ($1.00 − Contract Price) ⌉
              <br />
              = ⌈ ${adverseLoss.toLocaleString()} / ${(netPayoutPerContract).toFixed(2)} ⌉ = <strong>{requiredContracts.toLocaleString()}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Simulator Inputs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {/* Input 1: Portfolio Size */}
        <div className="p-3.5 rounded-xl bg-gray-50/70 border-2 border-gray-300 hover:border-gray-400 shadow-xs transition-colors">
          <label className="block text-xs font-bold text-gray-800 mb-1">
            Portfolio Notional (AUM)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-500 font-mono font-bold text-xs">
              $
            </div>
            <input
              type="text"
              inputMode="numeric"
              value={portfolioStr}
              onChange={(e) => handlePortfolioChange(e.target.value)}
              onBlur={handlePortfolioBlur}
              placeholder="5,000,000"
              className="w-full pl-6 pr-2 py-1 text-xs font-mono font-bold bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D26A]/30 focus:border-[#00D26A]"
            />
          </div>
        </div>

        {/* Input 2: Loss per 10 bps */}
        <div className="p-3.5 rounded-xl bg-gray-50/70 border-2 border-gray-300 hover:border-gray-400 shadow-xs transition-colors">
          <label className="block text-xs font-bold text-gray-800 mb-1">
            Sensitivity (Loss / 10 bps)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-500 font-mono font-bold text-xs">
              $
            </div>
            <input
              type="text"
              inputMode="numeric"
              value={sensitivityStr}
              onChange={(e) => handleSensitivityChange(e.target.value)}
              onBlur={handleSensitivityBlur}
              placeholder="15,000"
              className="w-full pl-6 pr-2 py-1 text-xs font-mono font-bold bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D26A]/30 focus:border-[#00D26A]"
            />
          </div>
        </div>

        {/* Input 3: Assumed Shock (bps) */}
        <div className="p-3.5 rounded-xl bg-gray-50/70 border-2 border-gray-300 hover:border-gray-400 shadow-xs transition-colors">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-gray-800">
              Assumed Shock
            </label>
            <span className="text-[11px] font-mono font-extrabold text-[#008A45]">
              +{shockBps} bps
            </span>
          </div>
          <div className="flex items-center gap-1">
            {[10, 25, 30, 50].map((bps) => (
              <button
                key={bps}
                onClick={() => setShockBps(bps)}
                className={`flex-1 py-1 text-[11px] font-mono font-bold rounded border transition-colors cursor-pointer ${
                  shockBps === bps
                    ? 'bg-gray-900 text-white border-gray-900 shadow-2xs'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                }`}
              >
                +{bps}
              </button>
            ))}
          </div>
        </div>

        {/* Input 4: Target Strike */}
        <div className="p-3.5 rounded-xl bg-gray-50/70 border-2 border-gray-300 hover:border-gray-400 shadow-xs transition-colors">
          <label className="block text-xs font-bold text-gray-800 mb-1">
            Hedge Strike Contract
          </label>
          <select
            value={targetHedgeStrike}
            onChange={(e) => setTargetHedgeStrike(parseFloat(e.target.value))}
            className="w-full px-2 py-1 text-xs font-mono font-bold bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D26A]/30 focus:border-[#00D26A]"
          >
            {market.contracts.map((c) => (
              <option key={c.ticker} value={c.floorStrike}>
                {c.ticker} (&gt; {c.floorStrike}{market.unitSuffix} @ {c.lastPrice}¢)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Output / Hedge Sizing Banner (Compact & Centered) */}
      <div className="max-w-4xl mx-auto bg-[#F0FDF4] border-2 border-[#86EFAC] rounded-xl p-3.5 sm:px-5 sm:py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3 flex-1">
          <div className="p-1.5 rounded-lg bg-[#00D26A] text-white shrink-0 shadow-2xs">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-semibold text-gray-900 leading-tight">
              Buy <strong className="font-mono text-gray-950 font-extrabold">{requiredContracts.toLocaleString()}</strong> contracts of{' '}
              <span className="font-mono font-bold text-emerald-900 bg-emerald-100 px-1.5 py-0.5 rounded">{hedgeContract?.ticker}</span>
            </div>
            <div className="text-xs text-gray-700 mt-1 font-medium">
              Covers simulated <strong className="font-mono text-gray-950 font-bold">${adverseLoss.toLocaleString()}</strong> adverse loss (+{shockBps} bps shock) with <strong className="font-mono text-emerald-950 font-bold">${netInsuranceCoverage.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong> net tail payoff.
            </div>
          </div>
        </div>

        {/* Dedicated Centered Vertical Divider */}
        <div className="hidden md:block w-[2px] h-12 bg-emerald-300 mx-2 shrink-0 self-center rounded-full" />

        <div className="flex items-center gap-6 border-t md:border-t-0 border-emerald-300 pt-3 md:pt-0 shrink-0">
          <div>
            <div className="text-[10px] uppercase text-emerald-900 font-bold tracking-wider">
              Total Hedge Cost
            </div>
            <div className="text-base font-black font-mono text-gray-950">
              ${totalHedgePremium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-emerald-800 font-mono font-bold">
              ({portfolioSize > 0 ? ((totalHedgePremium / portfolioSize) * 100).toFixed(3) : '0.000'}% of AUM)
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase text-emerald-900 font-bold tracking-wider">
              Implied Prob
            </div>
            <div className="text-base font-black font-mono text-[#008A45]">
              {contractCostCents}%
            </div>
            <div className="text-[10px] text-gray-600 font-mono font-semibold">
              Cost: {contractCostCents}¢/contract
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
