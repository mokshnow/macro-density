import React, { useState, useMemo } from 'react';
import { MacroMarket } from '../types/market';
import { 
  Zap, 
  RotateCcw, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  AlertTriangle, 
  ArrowRight,
  Flame,
  Snowflake,
  ShieldAlert
} from 'lucide-react';

interface StressTestCardProps {
  market: MacroMarket;
}

interface ScenarioPreset {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  meanShift: number;
  volMultiplier: number;
  skewShift: number;
}

export const StressTestCard: React.FC<StressTestCardProps> = ({ market }) => {
  const { moments, unitSuffix, bins } = market;

  // Sliders state
  const [meanShift, setMeanShift] = useState<number>(0.0); // e.g. +0.20%
  const [volMultiplier, setVolMultiplier] = useState<number>(1.0); // e.g. 1.4x
  const [skewShift, setSkewShift] = useState<number>(0.0); // e.g. +0.3
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  // Category-specific presets
  const presets: ScenarioPreset[] = useMemo(() => {
    if (market.category === 'inflation') {
      return [
        {
          id: 'oil_shock',
          name: 'Oil & Energy Surge',
          description: '+25bps Mean, +40% Volatility, Upside Skew',
          icon: <Flame className="w-3.5 h-3.5 text-amber-500" />,
          meanShift: 0.25,
          volMultiplier: 1.4,
          skewShift: 0.35,
        },
        {
          id: 'disinflation',
          name: 'Rapid Disinflation',
          description: '-20bps Mean, -15% Volatility',
          icon: <Snowflake className="w-3.5 h-3.5 text-blue-500" />,
          meanShift: -0.20,
          volMultiplier: 0.85,
          skewShift: -0.25,
        },
        {
          id: 'stagflation',
          name: 'Stagflation Shock',
          description: '+45bps Mean, +80% Volatility, Severe Fat Tails',
          icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />,
          meanShift: 0.45,
          volMultiplier: 1.8,
          skewShift: 0.60,
        },
      ];
    }

    if (market.category === 'gdp') {
      return [
        {
          id: 'recession',
          name: 'Hard Landing Shock',
          description: '-0.80% Growth, +70% Volatility, Downside Skew',
          icon: <TrendingDown className="w-3.5 h-3.5 text-rose-500" />,
          meanShift: -0.80,
          volMultiplier: 1.7,
          skewShift: -0.50,
        },
        {
          id: 'productivity',
          name: 'Productivity Boom',
          description: '+0.50% Growth, Moderate Volatility',
          icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />,
          meanShift: 0.50,
          volMultiplier: 1.1,
          skewShift: 0.20,
        },
      ];
    }

    // Default macro presets (Labor / Rates)
    return [
      {
        id: 'macro_deterioration',
        name: 'Macro Deterioration',
        description: '+0.30% Shock, +50% Volatility Expansion',
        icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />,
        meanShift: 0.30,
        volMultiplier: 1.5,
        skewShift: 0.30,
      },
      {
        id: 'soft_landing',
        name: 'Soft Landing Consensus',
        description: '-0.15% Cooling, Volatility Contraction',
        icon: <Activity className="w-3.5 h-3.5 text-blue-500" />,
        meanShift: -0.15,
        volMultiplier: 0.8,
        skewShift: -0.15,
      },
    ];
  }, [market.category]);

  const applyPreset = (preset: ScenarioPreset) => {
    if (selectedPresetId === preset.id) {
      // Toggle off
      resetToBaseline();
    } else {
      setSelectedPresetId(preset.id);
      setMeanShift(preset.meanShift);
      setVolMultiplier(preset.volMultiplier);
      setSkewShift(preset.skewShift);
    }
  };

  const resetToBaseline = () => {
    setSelectedPresetId(null);
    setMeanShift(0);
    setVolMultiplier(1.0);
    setSkewShift(0);
  };

  const isStressed = meanShift !== 0 || volMultiplier !== 1.0 || skewShift !== 0;

  // Stressed Statistical Calculations
  const stressedMean = Number((moments.mean + meanShift).toFixed(2));
  const stressedStdDev = Number((moments.stdDev * volMultiplier).toFixed(2));
  const stressedSkewness = Number((moments.skewness + skewShift).toFixed(2));
  
  // Parametric 95% VaR estimation under Cornish-Fisher expansion for skewness
  const z95 = 1.645;
  const cfAdjustment = (stressedSkewness / 6) * (z95 * z95 - 1);
  const stressedVar95 = Number((stressedMean + (z95 + cfAdjustment) * stressedStdDev).toFixed(2));

  // Stressed Tail Risk Probability (> Mode + 1.5*StdDev)
  const tailThreshold = moments.mode + 1.5 * moments.stdDev;
  const standardZ = (tailThreshold - stressedMean) / (stressedStdDev || 0.01);
  // Normal CDF approximation for tail probability
  const normalCdf = (z: number) => {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp((-z * z) / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - p : p;
  };
  const stressedTailProb = Number((Math.max(0.1, Math.min(99.9, (1 - normalCdf(standardZ)) * 100))).toFixed(1));

  // Visual SVG Dual-Curve Generator
  const svgWidth = 800;
  const svgHeight = 220;
  const padding = { top: 20, right: 30, bottom: 35, left: 45 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  const minX = bins.length > 0 ? bins[0].lower - 0.2 : 0;
  const maxX = bins.length > 0 ? bins[bins.length - 1].upper + 0.2 : 10;
  const rangeX = Math.max(maxX - minX, 0.001);

  const scaleX = (val: number) => padding.left + ((val - minX) / rangeX) * graphWidth;
  const scaleY = (densityVal: number) => padding.top + graphHeight - (densityVal / 100) * graphHeight;

  // Generate Base & Stressed Curve Points
  const curvePoints = useMemo(() => {
    const numPoints = 80;
    const dx = rangeX / (numPoints - 1);
    const basePts: { x: number; y: number }[] = [];
    const stressPts: { x: number; y: number }[] = [];

    const baseMean = moments.mean;
    const baseStd = moments.stdDev || 0.15;

    for (let i = 0; i < numPoints; i++) {
      const x = minX + i * dx;

      // Base PDF (Normal approximation)
      const uBase = (x - baseMean) / baseStd;
      const baseDensity = (1 / (baseStd * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * uBase * uBase);
      const scaledBase = Math.min(95, baseDensity * baseStd * 2.4 * 100);
      basePts.push({ x, y: scaledBase });

      // Stressed PDF (Shifted mean, scaled std dev, skewed)
      const uStress = (x - stressedMean) / (stressedStdDev || 0.01);
      // Skewed Gaussian modulation
      const skewMod = 1 + (stressedSkewness * 0.4) * Math.tanh(uStress);
      const stressDensity = Math.max(0, (1 / (stressedStdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * uStress * uStress) * skewMod);
      const scaledStress = Math.min(95, stressDensity * baseStd * 2.4 * 100);
      stressPts.push({ x, y: scaledStress });
    }

    return { basePts, stressPts };
  }, [minX, rangeX, moments.mean, moments.stdDev, stressedMean, stressedStdDev, stressedSkewness]);

  // Construct SVG paths
  const baseCurvePath = useMemo(() => {
    if (curvePoints.basePts.length === 0) return '';
    let d = `M ${scaleX(curvePoints.basePts[0].x)} ${scaleY(curvePoints.basePts[0].y)}`;
    for (let i = 1; i < curvePoints.basePts.length; i++) {
      const p = curvePoints.basePts[i];
      d += ` L ${scaleX(p.x)} ${scaleY(p.y)}`;
    }
    return d;
  }, [curvePoints.basePts, minX, rangeX]);

  const baseAreaPath = useMemo(() => {
    if (!baseCurvePath || curvePoints.basePts.length === 0) return '';
    const firstX = scaleX(curvePoints.basePts[0].x);
    const lastX = scaleX(curvePoints.basePts[curvePoints.basePts.length - 1].x);
    const bottomY = padding.top + graphHeight;
    return `${baseCurvePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [baseCurvePath, curvePoints.basePts]);

  const stressCurvePath = useMemo(() => {
    if (curvePoints.stressPts.length === 0) return '';
    let d = `M ${scaleX(curvePoints.stressPts[0].x)} ${scaleY(curvePoints.stressPts[0].y)}`;
    for (let i = 1; i < curvePoints.stressPts.length; i++) {
      const p = curvePoints.stressPts[i];
      d += ` L ${scaleX(p.x)} ${scaleY(p.y)}`;
    }
    return d;
  }, [curvePoints.stressPts, minX, rangeX]);

  const stressAreaPath = useMemo(() => {
    if (!stressCurvePath || curvePoints.stressPts.length === 0) return '';
    const firstX = scaleX(curvePoints.stressPts[0].x);
    const lastX = scaleX(curvePoints.stressPts[curvePoints.stressPts.length - 1].x);
    const bottomY = padding.top + graphHeight;
    return `${stressCurvePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [stressCurvePath, curvePoints.stressPts]);

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-400 shadow-md shadow-gray-900/5 p-5 sm:p-6 mb-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-200 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border-2 border-amber-300">
            <Zap className="w-4 h-4 fill-amber-500" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-gray-950 tracking-tight flex items-center gap-2">
              Macro Stress-Test &amp; "What-If" Scenario Shifter
            </h3>
            <p className="text-xs text-gray-600 font-medium">
              Simulate macroeconomic shocks to dynamically reprice probability mass, dispersion, and tail risk.
            </p>
          </div>
        </div>

        {/* Reset Button */}
        {isStressed && (
          <button
            onClick={resetToBaseline}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 hover:text-gray-950 bg-gray-100 hover:bg-gray-200 border-2 border-gray-300 rounded-xl transition-all self-start sm:self-auto shrink-0 shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Base Case</span>
          </button>
        )}
      </div>

      {/* Preset Scenarios */}
      <div className="mb-5">
        <div className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2.5">
          Quick Preset Shocks:
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {presets.map((preset) => {
            const isSelected = selectedPresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className={`p-3 text-left rounded-xl border-2 transition-all flex items-start gap-2.5 ${
                  isSelected
                    ? 'bg-amber-50/70 border-amber-400 shadow-xs ring-2 ring-amber-400/20'
                    : 'bg-gray-50/80 hover:bg-white border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="mt-0.5 shrink-0">{preset.icon}</div>
                <div>
                  <div className="text-xs font-bold text-gray-950 flex items-center gap-1.5">
                    <span>{preset.name}</span>
                    {isSelected && (
                      <span className="text-[10px] bg-amber-200 text-amber-900 font-black px-1.5 py-0.2 rounded font-mono">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-600 font-medium mt-0.5 leading-tight">
                    {preset.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Shock Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5 p-4 rounded-xl bg-gray-50/80 border-2 border-gray-300">
        {/* Slider 1: Mean Shift */}
        <div className="p-3 bg-white rounded-xl border-2 border-gray-300 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-gray-800">
              Mean Shock (Δ µ)
            </label>
            <span className={`font-mono text-xs font-black px-2 py-0.5 rounded ${
              meanShift > 0 
                ? 'bg-amber-100 text-amber-900' 
                : meanShift < 0 
                ? 'bg-blue-100 text-blue-900' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {meanShift > 0 ? `+${meanShift.toFixed(2)}` : meanShift.toFixed(2)}{unitSuffix}
            </span>
          </div>
          <input
            type="range"
            min={-0.80}
            max={0.80}
            step={0.05}
            value={meanShift}
            onChange={(e) => {
              setSelectedPresetId(null);
              setMeanShift(parseFloat(e.target.value));
            }}
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#00D26A]"
          />
          <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-1 font-semibold">
            <span>-0.80{unitSuffix}</span>
            <span>Baseline (0)</span>
            <span>+0.80{unitSuffix}</span>
          </div>
        </div>

        {/* Slider 2: Volatility Multiplier */}
        <div className="p-3 bg-white rounded-xl border-2 border-gray-300 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-gray-800">
              Implied Vol (× σ)
            </label>
            <span className={`font-mono text-xs font-black px-2 py-0.5 rounded ${
              volMultiplier > 1.0 
                ? 'bg-rose-100 text-rose-900' 
                : volMultiplier < 1.0 
                ? 'bg-emerald-100 text-emerald-900' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {volMultiplier.toFixed(1)}x
            </span>
          </div>
          <input
            type="range"
            min={0.5}
            max={2.5}
            step={0.1}
            value={volMultiplier}
            onChange={(e) => {
              setSelectedPresetId(null);
              setVolMultiplier(parseFloat(e.target.value));
            }}
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#00D26A]"
          />
          <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-1 font-semibold">
            <span>0.5x (Calm)</span>
            <span>1.0x (Live)</span>
            <span>2.5x (Crisis)</span>
          </div>
        </div>

        {/* Slider 3: Skewness Shift */}
        <div className="p-3 bg-white rounded-xl border-2 border-gray-300 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-gray-800">
              Tail Skew (Δ γ₁)
            </label>
            <span className={`font-mono text-xs font-black px-2 py-0.5 rounded ${
              skewShift > 0 
                ? 'bg-amber-100 text-amber-900' 
                : skewShift < 0 
                ? 'bg-blue-100 text-blue-900' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {skewShift > 0 ? `+${skewShift.toFixed(2)}` : skewShift.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min={-0.80}
            max={0.80}
            step={0.1}
            value={skewShift}
            onChange={(e) => {
              setSelectedPresetId(null);
              setSkewShift(parseFloat(e.target.value));
            }}
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#00D26A]"
          />
          <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-1 font-semibold">
            <span>Downside Fat Tail</span>
            <span>0.0</span>
            <span>Upside Fat Tail</span>
          </div>
        </div>
      </div>

      {/* Dual Curve Visualization Overlay */}
      <div className="relative w-full bg-white rounded-xl border-2 border-gray-300 p-3 mb-5 overflow-hidden">
        <div className="flex items-center justify-between pb-2 border-b border-gray-200 mb-2">
          <span className="text-xs font-extrabold text-gray-900">
            Probability Density Shift Overlay
          </span>
          <div className="flex items-center gap-4 text-xs font-mono font-bold">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-1 bg-[#00D26A] rounded-full inline-block"></span>
              <span className="text-gray-700">Live Kalshi Base</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-1 bg-amber-500 rounded-full inline-block border-t-2 border-dashed border-amber-600"></span>
              <span className="text-amber-800">Stressed Scenario</span>
            </div>
          </div>
        </div>

        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto select-none">
          <defs>
            <linearGradient id="baseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00D26A" stopOpacity="0.20" />
              <stop offset="100%" stopColor="#00D26A" stopOpacity="0.01" />
            </linearGradient>
            <linearGradient id="stressGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((lvl) => {
            const yPos = scaleY(lvl);
            return (
              <line
                key={`grid-${lvl}`}
                x1={padding.left}
                y1={yPos}
                x2={svgWidth - padding.right}
                y2={yPos}
                stroke="#F3F4F6"
                strokeWidth="1"
              />
            );
          })}

          {/* Base Case Curve (Green) */}
          <path d={baseAreaPath} fill="url(#baseGradient)" />
          <path d={baseCurvePath} fill="none" stroke="#00D26A" strokeWidth="2.5" />
          <line
            x1={scaleX(moments.mean)}
            y1={padding.top}
            x2={scaleX(moments.mean)}
            y2={padding.top + graphHeight}
            stroke="#008A45"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />

          {/* Stressed Curve (Amber) */}
          {isStressed && (
            <g>
              <path d={stressAreaPath} fill="url(#stressGradient)" />
              <path
                d={stressCurvePath}
                fill="none"
                stroke="#D97706"
                strokeWidth="3"
                strokeDasharray="5 3"
              />
              <line
                x1={scaleX(stressedMean)}
                y1={padding.top}
                x2={scaleX(stressedMean)}
                y2={padding.top + graphHeight}
                stroke="#D97706"
                strokeWidth="2"
                strokeDasharray="4 2"
              />
            </g>
          )}

          {/* X Axis Line & Ticks */}
          <line
            x1={padding.left}
            y1={padding.top + graphHeight}
            x2={svgWidth - padding.right}
            y2={padding.top + graphHeight}
            stroke="#9CA3AF"
            strokeWidth="1.5"
          />
          {bins.map((b) => (
            <g key={`x-tick-${b.id}`}>
              <line
                x1={scaleX(b.midpoint)}
                y1={padding.top + graphHeight}
                x2={scaleX(b.midpoint)}
                y2={padding.top + graphHeight + 4}
                stroke="#9CA3AF"
              />
              <text
                x={scaleX(b.midpoint)}
                y={padding.top + graphHeight + 16}
                textAnchor="middle"
                fontSize="10"
                fill="#4B5563"
                fontWeight="bold"
                fontFamily="JetBrains Mono, monospace"
              >
                {b.midpoint.toFixed(1)}{unitSuffix}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Repriced Metric Comparison Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Expected Value */}
        <div className="p-3.5 rounded-xl bg-white border-2 border-gray-300 shadow-2xs">
          <div className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
            Expected Value (µ)
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-sm text-gray-500 line-through">
              {moments.mean}{unitSuffix}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
            <span className={`font-mono text-base font-black ${
              stressedMean !== moments.mean ? 'text-amber-800' : 'text-gray-950'
            }`}>
              {stressedMean}{unitSuffix}
            </span>
          </div>
          <div className="text-[11px] text-gray-500 font-medium mt-1">
            {meanShift >= 0 ? `+${(meanShift * 100).toFixed(0)} bps` : `${(meanShift * 100).toFixed(0)} bps`} shift
          </div>
        </div>

        {/* Metric 2: 1-Sigma Volatility */}
        <div className="p-3.5 rounded-xl bg-white border-2 border-gray-300 shadow-2xs">
          <div className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
            Implied Vol (1 Std Dev)
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-sm text-gray-500 line-through">
              ±{moments.stdDev}{unitSuffix}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
            <span className={`font-mono text-base font-black ${
              stressedStdDev !== moments.stdDev ? 'text-amber-800' : 'text-gray-950'
            }`}>
              ±{stressedStdDev}{unitSuffix}
            </span>
          </div>
          <div className="text-[11px] text-gray-500 font-medium mt-1">
            {volMultiplier > 1 ? `+${Math.round((volMultiplier - 1) * 100)}% expansion` : `${Math.round((volMultiplier - 1) * 100)}% compression`}
          </div>
        </div>

        {/* Metric 3: 95% VaR Threshold */}
        <div className="p-3.5 rounded-xl bg-white border-2 border-gray-300 shadow-2xs">
          <div className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
            95% VaR Threshold
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-sm text-gray-500 line-through">
              {moments.var95}{unitSuffix}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-mono text-base font-black text-rose-600">
              {stressedVar95}{unitSuffix}
            </span>
          </div>
          <div className="text-[11px] text-gray-500 font-medium mt-1">
            {stressedVar95 >= moments.var95 ? `+${((stressedVar95 - moments.var95) * 100).toFixed(0)} bps higher tail risk` : `${((stressedVar95 - moments.var95) * 100).toFixed(0)} bps lower tail risk`}
          </div>
        </div>

        {/* Metric 4: Tail Event Probability */}
        <div className="p-3.5 rounded-xl bg-white border-2 border-gray-300 shadow-2xs">
          <div className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
            Tail Shock Prob (&gt; 1.5σ)
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-sm text-gray-500 line-through">
              {moments.upsideTailProb}%
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-mono text-base font-black text-amber-800">
              {stressedTailProb}%
            </span>
          </div>
          <div className="text-[11px] text-gray-500 font-medium mt-1">
            {stressedTailProb >= moments.upsideTailProb ? `+${(stressedTailProb - moments.upsideTailProb).toFixed(1)}% surge` : `${(stressedTailProb - moments.upsideTailProb).toFixed(1)}% decrease`}
          </div>
        </div>
      </div>
    </div>
  );
};
