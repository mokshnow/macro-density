import React, { useState, useMemo, useEffect } from 'react';
import { MacroMarket } from '../types/market';
import { CheckCircle, Info, ChevronDown, ChevronUp, ExternalLink, ShieldAlert } from 'lucide-react';

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

  // Target macro level corresponding to the shock: E[X] + (shockBps / 100)
  const targetShockLevel = useMemo(() => {
    const base = market.moments?.mean ?? 3.0;
    return Number((base + shockBps / 100).toFixed(2));
  }, [market.moments?.mean, shockBps]);

  // Restrict hedging strikes strictly to the realistic 40% – 75% probability band (40¢ to 75¢)
  const eligibleContracts = useMemo(() => {
    const inRange = market.contracts.filter(
      (c) => (c.lastPrice || 0) >= 40 && (c.lastPrice || 0) <= 75
    );
    if (inRange.length > 0) return inRange;

    // Fallback if no contract falls strictly in 40-75 (e.g. sparse custom market):
    const sortedByDistFrom50 = [...market.contracts].sort(
      (a, b) => Math.abs((a.lastPrice || 50) - 50) - Math.abs((b.lastPrice || 50) - 50)
    );
    return sortedByDistFrom50.slice(0, 3);
  }, [market.contracts]);

  // User manual override for strike choice
  const [selectedStrikeOverride, setSelectedStrikeOverride] = useState<number | null>(null);

  useEffect(() => {
    setSelectedStrikeOverride(null);
  }, [market.id]);

  // Automatically find best hedge contract matching targetShockLevel
  const hedgeContract = useMemo(() => {
    if (selectedStrikeOverride !== null) {
      const found = market.contracts.find((c) => c.floorStrike === selectedStrikeOverride);
      if (found) return found;
    }

    return eligibleContracts.reduce((closest, curr) => {
      const currDiff = Math.abs((curr.floorStrike ?? targetShockLevel) - targetShockLevel);
      const closestDiff = Math.abs((closest.floorStrike ?? targetShockLevel) - targetShockLevel);
      return currDiff < closestDiff ? curr : closest;
    }, eligibleContracts[0] || market.contracts[0]);
  }, [eligibleContracts, market.contracts, selectedStrikeOverride, targetShockLevel]);

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

  // Calculations
  const contractCostCents = hedgeContract?.lastPrice || 25;
  const contractCostDollars = Math.max(0.01, contractCostCents / 100);
  const payoutPerContract = 1.0;

  const lossPerBp = sensitivityPer10Bps / 10;
  const adverseLoss = lossPerBp * shockBps;
  const netPayoutPerContract = Math.max(0.01, payoutPerContract - contractCostDollars);
  const requiredContracts = Math.ceil(adverseLoss / netPayoutPerContract);
  const totalHedgePremium = requiredContracts * contractCostDollars;
  const grossInsurancePayout = requiredContracts * payoutPerContract;
  const netInsuranceCoverage = grossInsurancePayout - totalHedgePremium;

  const leverageRatio = contractCostDollars < 0.99 ? (1.0 - contractCostDollars) / contractCostDollars : 0;
  const isDeepItm = contractCostCents >= 75;

  const getContractDisplayName = (c?: (typeof market.contracts)[0]) => {
    if (!c) return '';
    if (c.floorStrike !== undefined) {
      return `Above ${c.floorStrike}${market.unitSuffix}`;
    }
    if (c.title && c.title !== c.ticker) {
      const match = c.title.match(/above\s+([0-9.]+%?)/i);
      if (match) return `Above ${match[1].includes('%') ? match[1] : `${match[1]}${market.unitSuffix}`}`;
      return c.title;
    }
    return c.ticker;
  };

  const contractKalshiUrl = market.kalshiUrl || `https://kalshi.com/markets/${(market.ticker || '').toLowerCase()}`;

  return (
    <div className="bg-white dark:bg-[#131924] rounded-2xl border-2 border-black dark:border-white shadow-md shadow-gray-900/5 p-5 sm:p-6 mb-0 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b-2 border-gray-300 dark:border-white/30 mb-5">
        <div>
          <h3 className="text-base font-extrabold text-gray-950 dark:text-white tracking-tight">
            Hedging Simulator
          </h3>
        </div>

        <button
          onClick={() => setShowModelInfo(!showModelInfo)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-gray-700 dark:text-gray-200 hover:text-gray-950 dark:hover:text-white bg-gray-100 dark:bg-[#1A2332] hover:bg-gray-200 dark:hover:bg-[#202B3D] rounded-lg border border-gray-300 dark:border-white transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Info className="w-3.5 h-3.5 text-[#008A45] dark:text-[#00E676]" />
          <span>Model Assumptions</span>
          {showModelInfo ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Model Assumptions & Formulas Accordion */}
      {showModelInfo && (
        <div className="mb-5 p-4 rounded-xl bg-gray-50 dark:bg-[#1A2332] border-2 border-gray-300 dark:border-white/30 text-xs text-gray-700 dark:text-gray-300 space-y-2 animate-in fade-in duration-200">
          <div className="font-extrabold text-gray-950 dark:text-white flex items-center gap-2 mb-1">
            <span>Model Framework &amp; Protection Sizing</span>
          </div>
          <p className="leading-relaxed">
            Estimates required prediction market binary contracts to offset macro event portfolio loss based on duration / delta sensitivity ($/bps) and Kalshi contract pricing:
          </p>
          <div className="bg-white dark:bg-[#131924] p-3 rounded-lg border border-gray-300 dark:border-white/30 font-mono text-[11px] space-y-1.5 text-gray-900 dark:text-gray-100">
            <div>
              <span className="font-bold text-gray-900 dark:text-gray-100 block mb-1">1. Adverse Shock Loss:</span>
              Loss = Sensitivity ($/10 bps) × (Macro Shock (bps) / 10)
              = ${sensitivityPer10Bps.toLocaleString()} × ({shockBps} / 10) = <strong>${adverseLoss.toLocaleString()}</strong>
            </div>
            <div className="pt-1 border-t border-gray-200 dark:border-white/20">
              <span className="font-bold text-gray-900 dark:text-gray-100 block mb-1">2. Required Contracts (OTM Convexity):</span>
              Contracts = ⌈ Loss / ($1.00 − Contract Price) ⌉
              = ⌈ ${adverseLoss.toLocaleString()} / ${(netPayoutPerContract).toFixed(2)} ⌉ = <strong>{requiredContracts.toLocaleString()}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Control Inputs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        {/* Input 1: Portfolio Size */}
        <div className="p-3.5 rounded-xl bg-gray-50/70 dark:bg-[#1A2332] border-2 border-gray-300 dark:border-white/30 hover:border-gray-400 dark:hover:border-white/60 shadow-xs transition-colors">
          <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">
            Portfolio Size (AUM)
          </label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-bold text-xs">$</span>
            <input
              type="text"
              value={portfolioStr}
              onChange={(e) => handlePortfolioChange(e.target.value)}
              className="w-full pl-6 pr-2 py-1 text-xs font-mono font-bold bg-white dark:bg-[#131924] border-2 border-gray-300 dark:border-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D26A]/30 focus:border-[#00D26A] text-gray-900 dark:text-white"
              placeholder="5,000,000"
            />
          </div>
          <div className="flex gap-1 mt-1.5">
            {[1000000, 5000000, 25000000].map((size) => (
              <button
                key={size}
                onClick={() => {
                  setPortfolioSize(size);
                  setPortfolioStr(size.toLocaleString());
                }}
                className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-gray-200/80 dark:bg-[#1E293B] hover:bg-gray-300 dark:hover:bg-[#2D3D58] text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
              >
                ${(size / 1000000).toFixed(0)}M
              </button>
            ))}
          </div>
        </div>

        {/* Input 2: Sensitivity ($/10 bps) */}
        <div className="p-3.5 rounded-xl bg-gray-50/70 dark:bg-[#1A2332] border-2 border-gray-300 dark:border-white/30 hover:border-gray-400 dark:hover:border-white/60 shadow-xs transition-colors">
          <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">
            Loss per 10 bps Shock
          </label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-bold text-xs">$</span>
            <input
              type="text"
              value={sensitivityStr}
              onChange={(e) => handleSensitivityChange(e.target.value)}
              className="w-full pl-6 pr-2 py-1 text-xs font-mono font-bold bg-white dark:bg-[#131924] border-2 border-gray-300 dark:border-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D26A]/30 focus:border-[#00D26A] text-gray-900 dark:text-white"
              placeholder="15,000"
            />
          </div>
          <div className="flex gap-1 mt-1.5">
            {[5000, 15000, 50000].map((loss) => (
              <button
                key={loss}
                onClick={() => {
                  setSensitivityPer10Bps(loss);
                  setSensitivityStr(loss.toLocaleString());
                }}
                className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-gray-200/80 dark:bg-[#1E293B] hover:bg-gray-300 dark:hover:bg-[#2D3D58] text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
              >
                ${(loss / 1000).toFixed(0)}k
              </button>
            ))}
          </div>
        </div>

        {/* Input 3: Macro Shock Preset */}
        <div className="p-3.5 rounded-xl bg-gray-50/70 dark:bg-[#1A2332] border-2 border-gray-300 dark:border-white/30 hover:border-gray-400 dark:hover:border-white/60 shadow-xs transition-colors">
          <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">
            Assumed Shock (bps)
          </label>
          <div className="flex items-center gap-1.5">
            {[10, 20, 30, 50].map((bps) => (
              <button
                key={bps}
                onClick={() => {
                  setShockBps(bps);
                  setSelectedStrikeOverride(null);
                }}
                className={`flex-1 py-1 text-xs font-bold font-mono rounded-lg border-2 transition-all cursor-pointer ${
                  shockBps === bps
                    ? 'bg-[#00D26A] text-black border-[#00A854] shadow-xs'
                    : 'bg-white dark:bg-[#131924] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-white/30 hover:bg-gray-100 dark:hover:bg-[#1E293B]'
                }`}
              >
                +{bps}
              </button>
            ))}
          </div>
        </div>

        {/* Input 4: Target Strike */}
        <div className="p-3.5 rounded-xl bg-gray-50/70 dark:bg-[#1A2332] border-2 border-gray-300 dark:border-white/30 hover:border-gray-400 dark:hover:border-white/60 shadow-xs transition-colors">
          <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">
            Hedge Strike Contract
          </label>
          <select
            value={hedgeContract?.floorStrike ?? ''}
            onChange={(e) => setSelectedStrikeOverride(parseFloat(e.target.value))}
            className="w-full px-2 py-1 text-xs font-bold bg-white dark:bg-[#131924] border-2 border-gray-300 dark:border-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D26A]/30 focus:border-[#00D26A] text-gray-900 dark:text-white cursor-pointer"
          >
            {eligibleContracts.map((c) => {
              const isBest = c.ticker === hedgeContract?.ticker;
              return (
                <option key={c.ticker} value={c.floorStrike}>
                  {getContractDisplayName(c)} (@ {c.lastPrice}¢ / {c.lastPrice}% prob){isBest ? ' ★ Target' : ''}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Output / Hedge Sizing Banner (Compact & Centered) */}
      <div className="max-w-4xl mx-auto bg-[#F0FDF4] dark:bg-emerald-950/40 border-2 border-[#86EFAC] dark:border-emerald-700/60 rounded-xl p-3.5 sm:px-5 sm:py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs transition-colors">
        <div className="flex items-center gap-3 flex-1">
          <div className="p-1.5 rounded-lg bg-[#00D26A] text-white shrink-0 shadow-2xs">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">
              Buy <strong className="font-mono text-gray-950 dark:text-white font-extrabold">{requiredContracts.toLocaleString()}</strong> contracts of{' '}
              <a
                href={contractKalshiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-bold text-emerald-950 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 hover:bg-emerald-200 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-700/60 px-1.5 py-0.5 rounded transition-all hover:shadow-xs underline decoration-emerald-700/40 hover:decoration-emerald-900 cursor-pointer"
                title={`Open ${getContractDisplayName(hedgeContract)} on Kalshi`}
              >
                <span>{getContractDisplayName(hedgeContract)}</span>
                <ExternalLink className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
              </a>
            </div>
            <div className="text-xs text-gray-700 dark:text-gray-300 mt-1 font-medium">
              Covers simulated <strong className="font-mono text-gray-950 dark:text-white font-bold">${adverseLoss.toLocaleString()}</strong> adverse loss (+{shockBps} bps shock) with <strong className="font-mono text-emerald-950 dark:text-emerald-300 font-bold">${netInsuranceCoverage.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong> net tail payoff.
            </div>
          </div>
        </div>

        {/* Dedicated Centered Vertical Divider */}
        <div className="hidden md:block w-[2px] h-12 bg-emerald-300 dark:border-emerald-700/60 mx-2 shrink-0 self-center rounded-full" />

        <div className="flex items-center gap-6 border-t md:border-t-0 border-emerald-300 dark:border-emerald-700/60 pt-3 md:pt-0 shrink-0">
          <div>
            <div className="text-[10px] uppercase text-emerald-900 dark:text-emerald-400 font-bold tracking-wider">
              Total Hedge Cost
            </div>
            <div className="text-base font-black font-mono text-gray-950 dark:text-white">
              ${totalHedgePremium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-emerald-800 dark:text-emerald-400 font-mono font-bold">
              ({portfolioSize > 0 ? ((totalHedgePremium / portfolioSize) * 100).toFixed(3) : '0.000'}% of AUM)
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase text-emerald-900 dark:text-emerald-400 font-bold tracking-wider">
              Implied Prob
            </div>
            <div className="text-base font-black font-mono text-[#008A45] dark:text-[#00E676]">
              {contractCostCents}%
            </div>
            <div className="text-[10px] text-gray-600 dark:text-gray-400 font-mono font-semibold">
              Cost: {contractCostCents}¢/contract
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase text-emerald-900 dark:text-emerald-400 font-bold tracking-wider">
              Payout Leverage
            </div>
            <div className="text-base font-black font-mono text-emerald-950 dark:text-emerald-300">
              {leverageRatio > 0 ? `${leverageRatio.toFixed(1)}×` : '1.0×'}
            </div>
          </div>
        </div>
      </div>

      {isDeepItm && (
        <div className="mt-3 max-w-4xl mx-auto flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-xs text-amber-900 dark:text-amber-200">
          <ShieldAlert className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
          <span>
            <strong>Sub-Optimal Hedge Band:</strong> Selected strike is priced at {contractCostCents}¢. Effective macro hedges use contracts in the <strong>40%–75%</strong> probability range to avoid deep ITM capital lockup and extreme low-probability lotteries.
          </span>
        </div>
      )}
    </div>
  );
};
