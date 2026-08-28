import React, { useState, useMemo, useRef } from 'react';
import { MacroMarket } from '../types/market';
import { RotateCcw, ArrowRight } from 'lucide-react';

interface StressTestCardProps {
  market: MacroMarket;
}

interface ScenarioPreset {
  id: string;
  name: string;
  description: string;
  meanShift: number;
  volMultiplier: number;
  skewShift: number;
}


interface HoverCrosshairState {
  xVal: number;
  baseDensity: number;
  stressDensity: number;
  baseCdf: number;
  stressCdf: number;
  svgX: number;
  svgY: number;
}

export const StressTestCard: React.FC<StressTestCardProps> = ({ market }) => {
  const { moments, unitSuffix, bins } = market;

  // Sliders state
  const [meanShift, setMeanShift] = useState<number>(0.0); // e.g. +0.20%
  const [volMultiplier, setVolMultiplier] = useState<number>(1.0); // e.g. 1.4x
  const [skewShift, setSkewShift] = useState<number>(0.0); // e.g. +0.3
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  // Crosshair hover state
  const [hoverCursor, setHoverCursor] = useState<HoverCrosshairState | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Category-specific presets tailored to the 3 most impactful macro drivers
  const presets: ScenarioPreset[] = useMemo(() => {
    if (market.category === 'inflation') {
      return [
        {
          id: 'oil_energy_surge',
          name: 'Energy & Crude Oil Surge',
          description: '+35bps Mean, +45% Vol, Upside Tail Skew',
          meanShift: 0.35,
          volMultiplier: 1.45,
          skewShift: 0.40,
        },
        {
          id: 'tariffs_supply_chain',
          name: 'Global Tariff & Freight Shock',
          description: '+20bps Mean, +30% Vol, Higher Kurtosis',
          meanShift: 0.20,
          volMultiplier: 1.30,
          skewShift: 0.25,
        },
        {
          id: 'shelter_cooling',
          name: 'Rental & Shelter Disinflation',
          description: '-25bps Mean, -20% Vol, Downside Cooling',
          meanShift: -0.25,
          volMultiplier: 0.80,
          skewShift: -0.35,
        },
      ];
    }

    if (market.category === 'gdp') {
      return [
        {
          id: 'credit_contraction',
          name: 'Banking Credit Contraction',
          description: '-0.60% Growth, +50% Vol, Downside Skew',
          meanShift: -0.60,
          volMultiplier: 1.50,
          skewShift: -0.40,
        },
        {
          id: 'consumer_recession',
          name: 'Consumer Demand Contraction',
          description: '-0.90% Growth, +80% Dispersion, Heavy Left Tail',
          meanShift: -0.90,
          volMultiplier: 1.80,
          skewShift: -0.55,
        },
        {
          id: 'productivity_boom',
          name: 'Productivity & Capex Surge',
          description: '+0.50% Growth, +15% Vol, Upside Expansion',
          meanShift: 0.50,
          volMultiplier: 1.15,
          skewShift: 0.25,
        },
      ];
    }

    if (market.category === 'labor') {
      return [
        {
          id: 'layoffs_automation',
          name: 'Corporate Layoffs & Automation',
          description: '+0.45% Unemployment, +60% Vol, Right-Tail Spike',
          meanShift: 0.45,
          volMultiplier: 1.60,
          skewShift: 0.45,
        },
        {
          id: 'hiring_freeze',
          name: 'Broad SMB Hiring Freeze',
          description: '+0.75% Unemployment, +90% Dispersion, Extreme Skew',
          meanShift: 0.75,
          volMultiplier: 1.90,
          skewShift: 0.60,
        },
        {
          id: 'labor_participation_influx',
          name: 'Labor Participation Influx',
          description: '-0.20% Unemployment, -15% Vol Contraction',
          meanShift: -0.20,
          volMultiplier: 0.85,
          skewShift: -0.20,
        },
      ];
    }

    if (market.category === 'fed' || market.category === 'rates') {
      return [
        {
          id: 'hawkish_pivot',
          name: 'Hawkish Pivot / Inflation Resurgence',
          description: '+0.50% Rate, +45% Vol, Aborted Easing',
          meanShift: 0.50,
          volMultiplier: 1.45,
          skewShift: 0.40,
        },
        {
          id: 'emergency_cuts',
          name: 'Emergency Inter-Meeting Easing',
          description: '-0.75% Rate, +80% Dispersion, Rapid 75bps Cut',
          meanShift: -0.75,
          volMultiplier: 1.80,
          skewShift: -0.50,
        },
        {
          id: 'r_star_revision',
          name: 'Higher Neutral Rate (r*) Shift',
          description: '+0.25% Rate, +20% Vol, Structural Floor',
          meanShift: 0.25,
          volMultiplier: 1.20,
          skewShift: 0.20,
        },
      ];
    }

    // Default / Custom Markets
    return [
      {
        id: 'adverse_tail',
        name: 'Adverse Tail Event',
        description: '+0.40 Mean, +70% Volatility, Extreme Skew',
        meanShift: 0.40,
        volMultiplier: 1.70,
        skewShift: 0.50,
      },
      {
        id: 'downside_contraction',
        name: 'Severe Downside Contraction',
        description: '-0.40 Mean, +50% Volatility, Left-Tail Skew',
        meanShift: -0.40,
        volMultiplier: 1.50,
        skewShift: -0.45,
      },
      {
        id: 'vol_compression',
        name: 'Volatility Compression',
        description: '0bps Shift, -30% Volatility, Tight Distribution',
        meanShift: 0.0,
        volMultiplier: 0.70,
        skewShift: 0.0,
      },
    ];
  }, [market.category]);



  const applyPreset = (preset: ScenarioPreset) => {
    if (selectedPresetId === preset.id) {
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
  
  // Parametric 95% VaR estimation under Cornish-Fisher expansion
  const z95 = 1.645;
  const cfAdjustment = (stressedSkewness / 6) * (z95 * z95 - 1);
  const stressedVar95 = Number((stressedMean + (z95 + cfAdjustment) * stressedStdDev).toFixed(2));

  // Normal CDF helper
  const normalCdf = (z: number) => {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp((-z * z) / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - p : p;
  };

  // Stressed Tail Risk Probability (> Mode + 1.5*StdDev)
  const tailThreshold = moments.mode + 1.5 * moments.stdDev;
  const standardZ = (tailThreshold - stressedMean) / (stressedStdDev || 0.01);
  const stressedTailProb = Number((Math.max(0.1, Math.min(99.9, (1 - normalCdf(standardZ)) * 100))).toFixed(1));

  // Portfolio Hedging Sizing Calculation under Stress
  const baseLossEstimate = 45000;
  const baseHedgeCost = 364090;
  // Under stressed volatility & tail probability, probability of adverse breach expands
  const hedgePriceCents = Math.min(95, Math.max(5, Math.round(50 + (meanShift * 60) + (volMultiplier - 1) * 20)));
  const stressedLossEstimate = Math.round(baseLossEstimate * (1 + Math.abs(meanShift) * 1.5) * volMultiplier);
  const stressedContracts = Math.ceil(stressedLossEstimate / (1.0 - hedgePriceCents / 100));
  const stressedHedgePremium = Math.round(stressedContracts * (hedgePriceCents / 100));
  const deltaHedgePremium = stressedHedgePremium - baseHedgeCost;

  // Visual SVG Dual-Curve Generator
  const svgWidth = 800;
  const svgHeight = 240;
  const padding = { top: 25, right: 30, bottom: 40, left: 45 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  const minX = bins.length > 0 ? bins[0].lower - 0.2 : 0;
  const maxX = bins.length > 0 ? bins[bins.length - 1].upper + 0.2 : 10;
  const rangeX = Math.max(maxX - minX, 0.001);

  const scaleX = (val: number) => padding.left + ((val - minX) / rangeX) * graphWidth;
  const unscaleX = (svgXCoord: number) => minX + ((svgXCoord - padding.left) / graphWidth) * rangeX;
  const scaleY = (densityVal: number) => padding.top + graphHeight - (densityVal / 100) * graphHeight;

  // Generate Base & Stressed Curve Points
  const curvePoints = useMemo(() => {
    const numPoints = 100;
    const dx = rangeX / (numPoints - 1);
    const basePts: { x: number; y: number }[] = [];
    const stressPts: { x: number; y: number }[] = [];

    const baseMean = moments.mean;
    const baseStd = moments.stdDev || 0.15;

    for (let i = 0; i < numPoints; i++) {
      const x = minX + i * dx;

      // Base PDF
      const uBase = (x - baseMean) / baseStd;
      const baseDensity = (1 / (baseStd * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * uBase * uBase);
      const scaledBase = Math.min(95, baseDensity * baseStd * 2.4 * 100);
      basePts.push({ x, y: scaledBase });

      // Stressed PDF
      const uStress = (x - stressedMean) / (stressedStdDev || 0.01);
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

  // Clean, evenly spaced X-axis ticks (5 to 7 ticks max with ample spacing)
  const xAxisTicks = useMemo(() => {
    if (bins.length === 0) return [];

    const targetTickCount = 6;
    const rawStep = rangeX / (targetTickCount - 1);

    let niceStep = 0.1;
    if (rawStep > 1.5) niceStep = 2.0;
    else if (rawStep > 0.8) niceStep = 1.0;
    else if (rawStep > 0.35) niceStep = 0.5;
    else if (rawStep > 0.18) niceStep = 0.25;
    else if (rawStep > 0.12) niceStep = 0.2;
    else niceStep = 0.1;

    const startTick = Math.ceil((minX - 0.0001) / niceStep) * niceStep;
    const ticks: number[] = [];
    for (let t = startTick; t <= maxX + 0.001; t += niceStep) {
      ticks.push(Number(t.toFixed(2)));
    }

    if (ticks.length < 3) {
      return [minX, (minX + maxX) / 2, maxX].map((v) => Number(v.toFixed(1)));
    }
    if (ticks.length > 8) {
      return ticks.filter((_, idx) => idx % 2 === 0);
    }
    return ticks;
  }, [bins, minX, maxX, rangeX]);

  // Mouse hover handler
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgX = (clientX / rect.width) * svgWidth;
    const clampedSvgX = Math.max(padding.left, Math.min(svgWidth - padding.right, svgX));
    const val = Number(unscaleX(clampedSvgX).toFixed(2));

    // Density calculations at x
    const baseStd = moments.stdDev || 0.15;
    const uBase = (val - moments.mean) / baseStd;
    const baseDensity = Math.min(95, (1 / (baseStd * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * uBase * uBase) * baseStd * 2.4 * 100);
    const baseCdf = Number((normalCdf(uBase) * 100).toFixed(1));

    const uStress = (val - stressedMean) / (stressedStdDev || 0.01);
    const skewMod = 1 + (stressedSkewness * 0.4) * Math.tanh(uStress);
    const stressDensity = Math.max(0, Math.min(95, (1 / (stressedStdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * uStress * uStress) * skewMod * baseStd * 2.4 * 100));
    const stressCdf = Number((normalCdf(uStress) * 100).toFixed(1));

    const yCoord = scaleY(isStressed ? stressDensity : baseDensity);

    setHoverCursor({
      xVal: val,
      baseDensity: Number(baseDensity.toFixed(1)),
      stressDensity: Number(stressDensity.toFixed(1)),
      baseCdf,
      stressCdf,
      svgX: clampedSvgX,
      svgY: yCoord,
    });
  };

  const handleMouseLeave = () => {
    setHoverCursor(null);
  };

  return (
    <div className="bg-white dark:bg-[#131924] rounded-2xl border-2 border-black dark:border-white shadow-md shadow-gray-900/5 p-5 sm:p-6 mb-6 transition-colors">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b-2 border-gray-300 dark:border-white/30 mb-5">
        <div>
          <h3 className="text-base font-extrabold text-gray-950 dark:text-white tracking-tight">
            Stress Test
          </h3>
        </div>

        {/* Reset Button */}
        {isStressed && (
          <button
            onClick={resetToBaseline}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-800 dark:text-gray-200 hover:text-gray-950 dark:hover:text-white bg-gray-100 dark:bg-[#1A2332] hover:bg-gray-200 dark:hover:bg-[#202B3D] border-2 border-gray-400 dark:border-white rounded-xl transition-all self-start sm:self-auto shrink-0 shadow-2xs cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Base Case</span>
          </button>
        )}
      </div>

      {/* Preset Scenarios */}
      <div className="mb-5">
        <div className="text-xs font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wider mb-2.5">
          Quick Preset Shocks:
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {presets.map((preset) => {
            const isSelected = selectedPresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className={`p-3.5 text-left rounded-xl border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 dark:border-amber-500 shadow-sm ring-2 ring-amber-400/30'
                    : 'bg-gray-50/70 dark:bg-[#1A2332] hover:bg-white dark:hover:bg-[#202B3D] border-gray-300 dark:border-white/30 hover:border-gray-400 dark:hover:border-white/60 shadow-2xs'
                }`}
              >
                <div>
                  <div className="text-xs font-extrabold text-gray-950 dark:text-white flex items-center justify-between gap-1.5">
                    <span>{preset.name}</span>
                    {isSelected && (
                      <span className="text-[10px] bg-amber-200 dark:bg-amber-900/80 text-amber-950 dark:text-amber-100 font-black px-1.5 py-0.2 rounded font-mono">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-600 dark:text-gray-400 font-semibold mt-1 leading-tight">
                    {preset.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Shock Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5 p-4 rounded-xl bg-gray-50/80 dark:bg-[#1A2332] border-2 border-gray-300 dark:border-white/30">
        {/* Slider 1: Mean Shift */}
        <div className="p-3.5 bg-white dark:bg-[#131924] rounded-xl border-2 border-gray-300 dark:border-white/30 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-gray-800 dark:text-gray-200">
              Mean Shock (Δ µ)
            </label>
            <span className={`font-mono text-xs font-black px-2 py-0.5 rounded ${
              meanShift > 0 
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60' 
                : meanShift < 0 
                ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border border-blue-300 dark:border-blue-700/60' 
                : 'bg-gray-100 dark:bg-[#1E293B] text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-[#2D3D58]'
            }`}>
              {meanShift > 0 ? `+${meanShift.toFixed(2)}` : meanShift.toFixed(2)}{unitSuffix}
            </span>
          </div>

          <input
            type="range"
            min={-1.00}
            max={1.00}
            step={0.05}
            value={meanShift}
            onChange={(e) => {
              setSelectedPresetId(null);
              setMeanShift(parseFloat(e.target.value));
            }}
            className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#00D26A]"
          />

          <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-100 dark:border-[#1F293D]">
            <button
              onClick={() => { setSelectedPresetId(null); setMeanShift((prev) => Math.max(-1.00, Number((prev - 0.05).toFixed(2)))); }}
              className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-gray-100 dark:bg-[#1A2332] hover:bg-gray-200 dark:hover:bg-[#202B3D] text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-[#2D3D58] cursor-pointer"
            >
              -0.05
            </button>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono font-semibold">Baseline: 0.00{unitSuffix}</span>
            <button
              onClick={() => { setSelectedPresetId(null); setMeanShift((prev) => Math.min(1.00, Number((prev + 0.05).toFixed(2)))); }}
              className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-gray-100 dark:bg-[#1A2332] hover:bg-gray-200 dark:hover:bg-[#202B3D] text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-[#2D3D58] cursor-pointer"
            >
              +0.05
            </button>
          </div>
        </div>

        {/* Slider 2: Volatility Multiplier */}
        <div className="p-3.5 bg-white dark:bg-[#131924] rounded-xl border-2 border-gray-300 dark:border-white/30 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-gray-800 dark:text-gray-200">
              Implied Vol (× σ)
            </label>
            <span className={`font-mono text-xs font-black px-2 py-0.5 rounded ${
              volMultiplier > 1.0 
                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-300 border border-rose-300 dark:border-rose-700/60' 
                : volMultiplier < 1.0 
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60' 
                : 'bg-gray-100 dark:bg-[#1E293B] text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-[#2D3D58]'
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
            className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#00D26A]"
          />

          <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-100 dark:border-white/20">
            <button
              onClick={() => { setSelectedPresetId(null); setVolMultiplier((prev) => Math.max(0.5, Number((prev - 0.1).toFixed(1)))); }}
              className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-gray-100 dark:bg-[#1A2332] hover:bg-gray-200 dark:hover:bg-[#202B3D] text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-white/30 cursor-pointer"
            >
              -0.1x
            </button>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono font-semibold">1.0x (Live)</span>
            <button
              onClick={() => { setSelectedPresetId(null); setVolMultiplier((prev) => Math.min(2.5, Number((prev + 0.1).toFixed(1)))); }}
              className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-gray-100 dark:bg-[#1A2332] hover:bg-gray-200 dark:hover:bg-[#202B3D] text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-white/30 cursor-pointer"
            >
              +0.1x
            </button>
          </div>
        </div>

        {/* Slider 3: Skewness Shift */}
        <div className="p-3.5 bg-white dark:bg-[#131924] rounded-xl border-2 border-gray-300 dark:border-white/30 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-gray-800 dark:text-gray-200">
              Tail Skew (Δ γ₁)
            </label>
            <span className={`font-mono text-xs font-black px-2 py-0.5 rounded ${
              skewShift > 0 
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60' 
                : skewShift < 0 
                ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border border-blue-300 dark:border-blue-700/60' 
                : 'bg-gray-100 dark:bg-[#1E293B] text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-[#2D3D58]'
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
            className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#00D26A]"
          />

          <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-100 dark:border-white/20">
            <button
              onClick={() => { setSelectedPresetId(null); setSkewShift((prev) => Math.max(-0.80, Number((prev - 0.1).toFixed(1)))); }}
              className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-gray-100 dark:bg-[#1A2332] hover:bg-gray-200 dark:hover:bg-[#202B3D] text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-white/30 cursor-pointer"
            >
              -0.10
            </button>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono font-semibold">0.0 (Symmetric)</span>
            <button
              onClick={() => { setSelectedPresetId(null); setSkewShift((prev) => Math.min(0.80, Number((prev + 0.1).toFixed(1)))); }}
              className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-gray-100 dark:bg-[#1A2332] hover:bg-gray-200 dark:hover:bg-[#202B3D] text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-white/30 cursor-pointer"
            >
              +0.10
            </button>
          </div>
        </div>
      </div>

      {/* Dual Curve Visualization Overlay */}
      <div className="relative w-full bg-white dark:bg-[#0E1420] rounded-xl border-2 border-gray-400 dark:border-white/30 p-4 mb-5 overflow-hidden shadow-2xs transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-200 dark:border-white/20 mb-3 gap-2">
          <span className="text-xs font-extrabold text-gray-950 dark:text-white">
            Probability Density Shift Overlay
          </span>

          <div className="flex items-center gap-4 text-xs font-mono font-bold">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-1 bg-[#00D26A] rounded-full inline-block"></span>
              <span className="text-gray-700 dark:text-gray-300">Live Kalshi Base ({moments.mean}{unitSuffix})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-1 bg-amber-500 rounded-full inline-block border-t-2 border-dashed border-amber-600"></span>
              <span className="text-amber-800 dark:text-amber-400">Stressed Scenario ({stressedMean}{unitSuffix})</span>
            </div>
          </div>
        </div>

        <svg 
          ref={svgRef}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
          className="w-full h-auto select-none cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="stressBaseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00D26A" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#00D26A" stopOpacity="0.01" />
            </linearGradient>
            <linearGradient id="stressActiveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((lvl) => {
            const yPos = scaleY(lvl);
            return (
              <line
                key={`stress-grid-${lvl}`}
                x1={padding.left}
                y1={yPos}
                x2={svgWidth - padding.right}
                y2={yPos}
                stroke="currentColor"
                className="text-gray-100 dark:text-gray-800/80"
                strokeWidth="1"
              />
            );
          })}

          {/* Base Case Curve (Green) */}
          <path d={baseAreaPath} fill="url(#stressBaseGradient)" />
          <path d={baseCurvePath} fill="none" stroke="#00D26A" strokeWidth="2.5" strokeLinecap="round" />
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
              <path d={stressAreaPath} fill="url(#stressActiveGradient)" />
              <path
                d={stressCurvePath}
                fill="none"
                stroke="#F59E0B"
                strokeWidth="3"
                strokeDasharray="5 3"
                strokeLinecap="round"
                className="dark:drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
              />
              <line
                x1={scaleX(stressedMean)}
                y1={padding.top}
                x2={scaleX(stressedMean)}
                y2={padding.top + graphHeight}
                stroke="#F59E0B"
                strokeWidth="2"
                strokeDasharray="4 2"
              />
            </g>
          )}

          {/* Crosshair Cursor */}
          {hoverCursor && (
            <g pointerEvents="none">
              <line
                x1={hoverCursor.svgX}
                y1={padding.top}
                x2={hoverCursor.svgX}
                y2={padding.top + graphHeight}
                stroke="currentColor"
                className="text-gray-900 dark:text-gray-100"
                strokeWidth="1.5"
                strokeDasharray="2 2"
                opacity="0.8"
              />
              <circle
                cx={hoverCursor.svgX}
                cy={hoverCursor.svgY}
                r="5"
                fill="#F59E0B"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            </g>
          )}

          {/* X Axis Line & Ticks */}
          <line
            x1={padding.left}
            y1={padding.top + graphHeight}
            x2={svgWidth - padding.right}
            y2={padding.top + graphHeight}
            stroke="currentColor"
            className="text-gray-400 dark:text-gray-600"
            strokeWidth="1.5"
          />
          {xAxisTicks.map((tickVal) => {
            const xPos = scaleX(tickVal);
            if (xPos < padding.left - 2 || xPos > svgWidth - padding.right + 2) return null;
            return (
              <g key={`stress-xtick-${tickVal}`}>
                <line
                  x1={xPos}
                  y1={padding.top + graphHeight}
                  x2={xPos}
                  y2={padding.top + graphHeight + 5}
                  stroke="currentColor"
                  className="text-gray-400 dark:text-gray-600"
                  strokeWidth="1.5"
                />
                <text
                  x={xPos}
                  y={padding.top + graphHeight + 18}
                  textAnchor="middle"
                  fontSize="11"
                  fill="currentColor"
                  className="text-gray-600 dark:text-gray-400"
                  fontWeight="bold"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {tickVal.toFixed(1)}{unitSuffix}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Crosshair Callout */}
        {hoverCursor && (
          <div
            className="absolute z-20 pointer-events-none bg-gray-950 dark:bg-[#1A2332] text-white px-3 py-2 rounded-xl text-xs shadow-xl border-2 border-gray-700 dark:border-gray-600 font-mono transition-transform duration-75"
            style={{
              left: `${(hoverCursor.svgX / svgWidth) * 100}%`,
              top: `${Math.max(10, ((hoverCursor.svgY - 20) / svgHeight) * 100)}%`,
              transform: hoverCursor.svgX > svgWidth / 2 ? 'translate(-108%, -50%)' : 'translate(8%, -50%)',
            }}
          >
            <div className="font-bold text-amber-400 text-xs">
              Outcome: {hoverCursor.xVal.toFixed(2)}{unitSuffix}
            </div>
            <div className="mt-1 space-y-0.5 text-[11px] text-gray-300">
              <div className="flex justify-between gap-3">
                <span>Base PDF:</span>
                <strong className="text-emerald-400">{hoverCursor.baseDensity}%</strong>
              </div>
              <div className="flex justify-between gap-3">
                <span>Stressed PDF:</span>
                <strong className="text-amber-400">{hoverCursor.stressDensity}%</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Repriced Metric Comparison Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        {/* Metric 1: Expected Value */}
        <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-[#1A2332] border-2 border-gray-300 dark:border-white/30 hover:border-gray-400 dark:hover:border-white/60 shadow-xs transition-colors">
          <div className="text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
            Expected Value (µ)
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-sm text-gray-500 line-through">
              {moments.mean}{unitSuffix}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
            <span className={`font-mono text-base font-black ${
              stressedMean !== moments.mean ? 'text-amber-800 dark:text-amber-300' : 'text-gray-950 dark:text-white'
            }`}>
              {stressedMean}{unitSuffix}
            </span>
          </div>
          <div className="text-[11px] text-gray-600 dark:text-gray-400 font-semibold mt-1">
            {meanShift >= 0 ? `+${(meanShift * 100).toFixed(0)} bps` : `${(meanShift * 100).toFixed(0)} bps`} shift
          </div>
        </div>

        {/* Metric 2: 1-Sigma Volatility */}
        <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-[#1A2332] border-2 border-gray-300 dark:border-white/30 hover:border-gray-400 dark:hover:border-white/60 shadow-xs transition-colors">
          <div className="text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
            Implied Vol (1 Std Dev)
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-sm text-gray-500 line-through">
              ±{moments.stdDev}{unitSuffix}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
            <span className={`font-mono text-base font-black ${
              stressedStdDev !== moments.stdDev ? 'text-amber-800 dark:text-amber-300' : 'text-gray-950 dark:text-white'
            }`}>
              ±{stressedStdDev}{unitSuffix}
            </span>
          </div>
          <div className="text-[11px] text-gray-600 dark:text-gray-400 font-semibold mt-1">
            {volMultiplier > 1 ? `+${Math.round((volMultiplier - 1) * 100)}% expansion` : `${Math.round((volMultiplier - 1) * 100)}% compression`}
          </div>
        </div>

        {/* Metric 3: 95% VaR Threshold */}
        <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-[#1A2332] border-2 border-gray-300 dark:border-white/30 hover:border-gray-400 dark:hover:border-white/60 shadow-xs transition-colors">
          <div className="text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
            95% VaR Threshold
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-sm text-gray-500 line-through">
              {moments.var95}{unitSuffix}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-mono text-base font-black text-rose-600 dark:text-rose-400">
              {stressedVar95}{unitSuffix}
            </span>
          </div>
          <div className="text-[11px] text-gray-600 dark:text-gray-400 font-semibold mt-1">
            {stressedVar95 >= moments.var95 ? `+${((stressedVar95 - moments.var95) * 100).toFixed(0)} bps higher tail risk` : `${((stressedVar95 - moments.var95) * 100).toFixed(0)} bps lower tail risk`}
          </div>
        </div>

        {/* Metric 4: Tail Event Probability */}
        <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-[#1A2332] border-2 border-gray-300 dark:border-white/30 hover:border-gray-400 dark:hover:border-white/60 shadow-xs transition-colors">
          <div className="text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
            Tail Shock Prob (&gt; 1.5σ)
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-sm text-gray-500 line-through">
              {moments.upsideTailProb}%
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-mono text-base font-black text-amber-800 dark:text-amber-300">
              {stressedTailProb}%
            </span>
          </div>
          <div className="text-[11px] text-gray-600 dark:text-gray-400 font-semibold mt-1">
            {stressedTailProb >= moments.upsideTailProb ? `+${(stressedTailProb - moments.upsideTailProb).toFixed(1)}% surge` : `${(stressedTailProb - moments.upsideTailProb).toFixed(1)}% decrease`}
          </div>
        </div>
      </div>

      {/* Quant Portfolio Hedging Impact Breakdown */}
      {isStressed && (
        <div className="p-4 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-700/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
          <div>
            <div className="text-xs font-bold text-amber-950 dark:text-amber-300 uppercase tracking-wider">
              Stress Scenario Hedging Impact
            </div>
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-200 mt-0.5">
              Required hedge size increases to <strong className="font-mono text-amber-950 dark:text-amber-200 font-black">{stressedContracts.toLocaleString()}</strong> contracts (Est. portfolio loss: ${stressedLossEstimate.toLocaleString()}).
            </div>
          </div>

          <div className="flex items-center gap-5 border-t md:border-t-0 md:border-l-2 border-amber-300 dark:border-amber-700/60 pt-3 md:pt-0 md:pl-5 shrink-0">
            <div>
              <div className="text-[10px] uppercase text-amber-900 dark:text-amber-300 font-bold tracking-wider">
                Stressed Hedge Premium
              </div>
              <div className="text-base font-black font-mono text-gray-950 dark:text-white">
                ${stressedHedgePremium.toLocaleString()}
              </div>
              <div className={`text-[10px] font-mono font-bold ${deltaHedgePremium >= 0 ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                {deltaHedgePremium >= 0 ? `+$${deltaHedgePremium.toLocaleString()} (+${Math.round((deltaHedgePremium / baseHedgeCost) * 100)}%)` : `-$${Math.abs(deltaHedgePremium).toLocaleString()}`}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

