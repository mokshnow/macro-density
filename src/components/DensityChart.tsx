import React, { useState, useMemo, useRef, useEffect } from 'react';
import { MacroMarket, DistributionBin } from '../types/market';
import { generateSmoothedDensityPoints } from '../utils/distributionMath';
import { 
  BarChart2, 
  TrendingUp, 
  Layers, 
  GitCommit,
  History
} from 'lucide-react';

interface DensityChartProps {
  market: MacroMarket;
}

type ViewMode = 'smooth_pdf' | 'discrete_pmf' | 'cumulative_cdf' | 'options_compare' | 'historical_shift';

interface HoverCursorState {
  xVal: number;
  densityVal: number;
  cdfVal: number;
  svgX: number;
  svgY: number;
}

export const DensityChart: React.FC<DensityChartProps> = ({ market }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('smooth_pdf');
  const [hoveredBin, setHoveredBin] = useState<DistributionBin | null>(null);



  // Interactive Graph Line / Overlay Visibility Toggles
  const [showMeanPin, setShowMeanPin] = useState<boolean>(true); // E[X] Indicator
  const [showConsensusPin, setShowConsensusPin] = useState<boolean>(true); // Consensus Benchmark
  const [showIntervalSlice, setShowIntervalSlice] = useState<boolean>(true); // [X, Y] Range Area & Cutoffs
  const [showOptionsCurve, setShowOptionsCurve] = useState<boolean>(true); // Black-Scholes Normal
  const [showHistMean, setShowHistMean] = useState<boolean>(true); // Historical E[X]
  const [showHistBand, setShowHistBand] = useState<boolean>(true); // Historical 68% Band
  const [showHistConsensus, setShowHistConsensus] = useState<boolean>(true); // Historical Consensus

  // Hover cursor state for continuous hairline
  const [hoverCursor, setHoverCursor] = useState<HoverCursorState | null>(null);

  // Direct Click & Drag Range Selection state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartVal, setDragStartVal] = useState<number | null>(null);
  const [dragTarget, setDragTarget] = useState<'x' | 'y' | 'range' | 'cdf' | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  const { bins, moments } = market;

  // Dimensions
  const svgWidth = 800;
  const svgHeight = 370;
  const padding = { top: 46, right: 30, bottom: 64, left: 45 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  // X and Y scales
  const minX = bins.length > 0 ? bins[0].lower : 0;
  const maxX = bins.length > 0 ? bins[bins.length - 1].upper : 10;
  const rangeX = Math.max(maxX - minX, 0.001);

  const scaleX = (val: number) => padding.left + ((val - minX) / rangeX) * graphWidth;
  const unscaleX = (svgXCoord: number) => minX + ((svgXCoord - padding.left) / graphWidth) * rangeX;
  const scaleYDensity = (densityVal: number) => padding.top + graphHeight - (densityVal / 100) * graphHeight;
  const scaleYCdf = (cdfPct: number) => padding.top + graphHeight - (cdfPct / 100) * graphHeight;

  // Primary Consensus Benchmark Value
  const consensusVal = market.consensus && market.consensus.length > 0 
    ? market.consensus[0].value 
    : null;

  // X and Y Interval bounds for PDF integration P(X <= Outcome <= Y)
  const defaultX = Number((moments.mean - moments.stdDev).toFixed(2));
  const defaultY = Number((moments.mean + moments.stdDev).toFixed(2));
  const [intervalX, setIntervalX] = useState<number>(defaultX);
  const [intervalY, setIntervalY] = useState<number>(defaultY);

  // Raw string states for inputs to allow smooth deleting without forcing 0
  const [inputXStr, setInputXStr] = useState<string>(String(defaultX));
  const [inputYStr, setInputYStr] = useState<string>(String(defaultY));

  // Single threshold for CDF mode
  const [cdfThreshold, setCdfThreshold] = useState<number>(moments.median);
  const [inputCdfStr, setInputCdfStr] = useState<string>(String(moments.median));

  // Sync inputs when active market changes
  useEffect(() => {
    const newX = Number((moments.mean - moments.stdDev).toFixed(2));
    const newY = Number((moments.mean + moments.stdDev).toFixed(2));
    setIntervalX(newX);
    setIntervalY(newY);
    setInputXStr(String(newX));
    setInputYStr(String(newY));
    setCdfThreshold(moments.median);
    setInputCdfStr(String(moments.median));
  }, [market.id, moments.mean, moments.stdDev, moments.median]);

  // Input change handlers
  const handleXChange = (valStr: string) => {
    setInputXStr(valStr);
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed)) {
      const clamped = Number(Math.max(minX, Math.min(maxX, parsed)).toFixed(2));
      setIntervalX(clamped);
    }
  };

  const handleXBlur = () => {
    if (inputXStr.trim() === '' || isNaN(parseFloat(inputXStr))) {
      setInputXStr(String(intervalX));
    } else {
      const parsed = parseFloat(inputXStr);
      const clamped = Number(Math.max(minX, Math.min(maxX, parsed)).toFixed(2));
      setIntervalX(clamped);
      setInputXStr(String(clamped));
    }
  };

  const handleYChange = (valStr: string) => {
    setInputYStr(valStr);
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed)) {
      const clamped = Number(Math.max(minX, Math.min(maxX, parsed)).toFixed(2));
      setIntervalY(clamped);
    }
  };

  const handleYBlur = () => {
    if (inputYStr.trim() === '' || isNaN(parseFloat(inputYStr))) {
      setInputYStr(String(intervalY));
    } else {
      const parsed = parseFloat(inputYStr);
      const clamped = Number(Math.max(minX, Math.min(maxX, parsed)).toFixed(2));
      setIntervalY(clamped);
      setInputYStr(String(clamped));
    }
  };

  const handleCdfChange = (valStr: string) => {
    setInputCdfStr(valStr);
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed)) {
      const clamped = Number(Math.max(minX, Math.min(maxX, parsed)).toFixed(2));
      setCdfThreshold(clamped);
    }
  };

  const handleCdfBlur = () => {
    if (inputCdfStr.trim() === '' || isNaN(parseFloat(inputCdfStr))) {
      setInputCdfStr(String(cdfThreshold));
    } else {
      const parsed = parseFloat(inputCdfStr);
      const clamped = Number(Math.max(minX, Math.min(maxX, parsed)).toFixed(2));
      setCdfThreshold(clamped);
      setInputCdfStr(String(clamped));
    }
  };

  // Generate continuous smoothed points
  const smoothedPoints = useMemo(() => {
    return generateSmoothedDensityPoints(bins, 140);
  }, [bins]);

  // Filter non-zero probability bins for discrete PMF
  const nonZeroBins = useMemo(() => {
    const active = bins.filter((b) => b.probability > 0);
    return active.length > 0 ? active : bins;
  }, [bins]);

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

  // Historical Snapshots computation (no fabricated prior points)
  const histSnapshots = useMemo(() => {
    if (market.historicalSnapshots && market.historicalSnapshots.length > 0) {
      return market.historicalSnapshots;
    }
    return [
      { timestamp: 'Live Order Book', mean: moments.mean, stdDev: moments.stdDev, confidence68: moments.confidence68, consensus: consensusVal || undefined },
    ];
  }, [market.historicalSnapshots, moments, consensusVal]);


  const histPoints = useMemo(() => {
    return histSnapshots.map((s, idx) => ({
      idx,
      timestamp: s.timestamp,
      mean: s.mean,
      stdDev: s.stdDev || 0.15,
      upper: s.confidence68 ? s.confidence68[1] : Number((s.mean + (s.stdDev || 0.15)).toFixed(2)),
      lower: s.confidence68 ? s.confidence68[0] : Number((s.mean - (s.stdDev || 0.15)).toFixed(2)),
      consensus: s.consensus,
    }));
  }, [histSnapshots]);

  const histYBounds = useMemo(() => {
    const vals = histPoints.flatMap((p) => [p.lower, p.upper, p.consensus].filter((v) => v !== undefined) as number[]);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = Math.max(0.08, (max - min) * 0.15);
    return { min: Number((min - pad).toFixed(2)), max: Number((max + pad).toFixed(2)) };
  }, [histPoints]);

  const scaleHistX = (idx: number) =>
    histPoints.length === 1
      ? padding.left + graphWidth / 2
      : padding.left + (idx / Math.max(1, histPoints.length - 1)) * graphWidth;
  const scaleHistY = (val: number) => padding.top + graphHeight - ((val - histYBounds.min) / Math.max(0.01, histYBounds.max - histYBounds.min)) * graphHeight;


  // Path for uncertainty band in Historical View
  const histBandPath = useMemo(() => {
    if (histPoints.length < 2) return '';
    let topPath = `M ${scaleHistX(0)} ${scaleHistY(histPoints[0].upper)}`;
    let bottomPath = '';
    for (let i = 1; i < histPoints.length; i++) {
      topPath += ` L ${scaleHistX(i)} ${scaleHistY(histPoints[i].upper)}`;
    }
    for (let i = histPoints.length - 1; i >= 0; i--) {
      bottomPath += ` L ${scaleHistX(i)} ${scaleHistY(histPoints[i].lower)}`;
    }
    return topPath + bottomPath + ' Z';
  }, [histPoints, histYBounds, graphWidth, graphHeight]);

  // Path for Historical Mean Line
  const histMeanPath = useMemo(() => {
    if (histPoints.length < 2) return '';
    let d = `M ${scaleHistX(0)} ${scaleHistY(histPoints[0].mean)}`;
    for (let i = 1; i < histPoints.length; i++) {
      d += ` L ${scaleHistX(i)} ${scaleHistY(histPoints[i].mean)}`;
    }
    return d;
  }, [histPoints, histYBounds, graphWidth, graphHeight]);

  // Path for Historical Consensus Benchmark Line
  const histConsensusPath = useMemo(() => {
    const valid = histPoints.filter((p) => p.consensus !== undefined);
    if (valid.length < 2) return '';
    let d = `M ${scaleHistX(valid[0].idx)} ${scaleHistY(valid[0].consensus!)}`;
    for (let i = 1; i < valid.length; i++) {
      d += ` L ${scaleHistX(valid[i].idx)} ${scaleHistY(valid[i].consensus!)}`;
    }
    return d;
  }, [histPoints, histYBounds, graphWidth, graphHeight]);

  // Max probability across bins for scaling PMF
  const maxBinProb = useMemo(() => {
    const max = Math.max(...bins.map((b) => b.probability), 1);
    return Math.ceil(max * 1.15);
  }, [bins]);

  // CDF Interpolation Function
  const getCDFAt = (x: number): number => {
    if (bins.length === 0) return 0;
    if (x <= minX) return 0;
    if (x >= maxX) return 100;

    for (let i = 0; i < smoothedPoints.length - 1; i++) {
      const p1 = smoothedPoints[i];
      const p2 = smoothedPoints[i + 1];
      if (x >= p1.x && x <= p2.x) {
        const factor = (x - p1.x) / (p2.x - p1.x);
        return p1.cumulative + factor * (p2.cumulative - p1.cumulative);
      }
    }
    return 100;
  };

  // Density Interpolation Function
  const getDensityAt = (x: number): number => {
    if (bins.length === 0) return 0;
    if (x <= minX || x >= maxX) return 0;

    for (let i = 0; i < smoothedPoints.length - 1; i++) {
      const p1 = smoothedPoints[i];
      const p2 = smoothedPoints[i + 1];
      if (x >= p1.x && x <= p2.x) {
        const factor = (x - p1.x) / (p2.x - p1.x);
        return p1.density + factor * (p2.density - p1.density);
      }
    }
    return 0;
  };

  // Exact evaluated probability for interval [intervalX, intervalY]
  const intervalProbability = useMemo(() => {
    const low = Math.min(intervalX, intervalY);
    const high = Math.max(intervalX, intervalY);
    const cdfHigh = getCDFAt(high);
    const cdfLow = getCDFAt(low);
    return Math.max(0, Math.min(100, Number((cdfHigh - cdfLow).toFixed(1))));
  }, [intervalX, intervalY, smoothedPoints]);

  // Single CDF Threshold value
  const cdfProbValue = useMemo(() => {
    return Number(getCDFAt(cdfThreshold).toFixed(1));
  }, [cdfThreshold, smoothedPoints]);

  // Full SVG Path for Smooth PDF
  const pdfPathData = useMemo(() => {
    if (smoothedPoints.length === 0) return '';
    let d = `M ${scaleX(smoothedPoints[0].x)} ${scaleYDensity(smoothedPoints[0].density)}`;
    for (let i = 1; i < smoothedPoints.length; i++) {
      const p = smoothedPoints[i];
      d += ` L ${scaleX(p.x)} ${scaleYDensity(p.density)}`;
    }
    return d;
  }, [smoothedPoints, minX, rangeX]);

  // Area under whole PDF
  const pdfAreaPathData = useMemo(() => {
    if (smoothedPoints.length === 0) return '';
    const bottomY = padding.top + graphHeight;
    let d = `M ${scaleX(smoothedPoints[0].x)} ${scaleYDensity(smoothedPoints[0].density)}`;
    for (let i = 1; i < smoothedPoints.length; i++) {
      d += ` L ${scaleX(smoothedPoints[i].x)} ${scaleYDensity(smoothedPoints[i].density)}`;
    }
    d += ` L ${scaleX(smoothedPoints[smoothedPoints.length - 1].x)} ${bottomY} L ${scaleX(smoothedPoints[0].x)} ${bottomY} Z`;
    return d;
  }, [smoothedPoints, minX, rangeX]);


  // Highlighted [X, Y] Slice Area Path
  const intervalSlicePathData = useMemo(() => {
    if (smoothedPoints.length === 0) return '';
    const low = Math.min(intervalX, intervalY);
    const high = Math.max(intervalX, intervalY);

    const slicePoints = smoothedPoints.filter((p) => p.x >= low && p.x <= high);
    if (slicePoints.length === 0) return '';

    const bottomY = padding.top + graphHeight;
    let d = `M ${scaleX(slicePoints[0].x)} ${scaleYDensity(slicePoints[0].density)}`;
    for (let i = 1; i < slicePoints.length; i++) {
      d += ` L ${scaleX(slicePoints[i].x)} ${scaleYDensity(slicePoints[i].density)}`;
    }
    d += ` L ${scaleX(slicePoints[slicePoints.length - 1].x)} ${bottomY} L ${scaleX(slicePoints[0].x)} ${bottomY} Z`;
    return d;
  }, [smoothedPoints, intervalX, intervalY, minX, rangeX]);

  // CDF Path
  const cdfPathData = useMemo(() => {
    if (smoothedPoints.length === 0) return '';
    let d = `M ${scaleX(smoothedPoints[0].x)} ${scaleYCdf(smoothedPoints[0].cumulative)}`;
    for (let i = 1; i < smoothedPoints.length; i++) {
      const p = smoothedPoints[i];
      d += ` L ${scaleX(p.x)} ${scaleYCdf(p.cumulative)}`;
    }
    return d;
  }, [smoothedPoints, minX, rangeX]);

  // Black-Scholes Gaussian bell comparison path
  const bsPathData = useMemo(() => {
    if (smoothedPoints.length === 0) return '';
    const mean = moments.mean;
    const std = moments.stdDev || 0.15;
    let d = '';
    for (let i = 0; i < smoothedPoints.length; i++) {
      const x = smoothedPoints[i].x;
      const u = (x - mean) / std;
      const normalDensity = (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * u * u);
      const scaled = Math.min(100, normalDensity * std * 2.5 * 100);
      const px = scaleX(x);
      const py = scaleYDensity(scaled);
      if (i === 0) d = `M ${px} ${py}`;
      else d += ` L ${px} ${py}`;
    }
    return d;
  }, [smoothedPoints, moments]);

  // Coordinate conversion helper for mouse events
  const getSvgCoordinates = (e: React.MouseEvent<SVGSVGElement>): { svgX: number; val: number } | null => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgX = (clientX / rect.width) * svgWidth;
    const clampedSvgX = Math.max(padding.left, Math.min(svgWidth - padding.right, svgX));
    const val = Number(unscaleX(clampedSvgX).toFixed(2));
    return { svgX: clampedSvgX, val };
  };

  // Mouse Move Handler: Hairline Cursor & Drag Selection
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (viewMode === 'historical_shift') return;

    const coords = getSvgCoordinates(e);
    if (!coords) return;

    const { svgX, val } = coords;
    const density = getDensityAt(val);
    const cdf = getCDFAt(val);
    const yCoord = viewMode === 'cumulative_cdf' ? scaleYCdf(cdf) : scaleYDensity(density);

    setHoverCursor({
      xVal: val,
      densityVal: density,
      cdfVal: cdf,
      svgX,
      svgY: yCoord,
    });

    if (isDragging) {
      if (viewMode === 'cumulative_cdf' || dragTarget === 'cdf') {
        const clamped = Number(Math.max(minX, Math.min(maxX, val)).toFixed(2));
        setCdfThreshold(clamped);
        setInputCdfStr(String(clamped));
      } else if (dragTarget === 'x') {
        const clamped = Number(Math.max(minX, Math.min(maxX, val)).toFixed(2));
        setIntervalX(clamped);
        setInputXStr(String(clamped));
      } else if (dragTarget === 'y') {
        const clamped = Number(Math.max(minX, Math.min(maxX, val)).toFixed(2));
        setIntervalY(clamped);
        setInputYStr(String(clamped));
      } else if (dragTarget === 'range' && dragStartVal !== null) {
        const lower = Number(Math.min(dragStartVal, val).toFixed(2));
        const upper = Number(Math.max(dragStartVal, val).toFixed(2));
        setIntervalX(lower);
        setIntervalY(upper);
        setInputXStr(String(lower));
        setInputYStr(String(upper));
      }
    }
  };

  // Mouse Down Handler: Start Drag Selection
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (viewMode === 'historical_shift') return;
    const coords = getSvgCoordinates(e);
    if (!coords) return;

    setIsDragging(true);

    if (viewMode === 'cumulative_cdf') {
      setDragTarget('cdf');
      setCdfThreshold(coords.val);
      setInputCdfStr(String(coords.val));
    } else {
      const minVal = Math.min(intervalX, intervalY);
      const maxVal = Math.max(intervalX, intervalY);
      const distToMin = Math.abs(coords.val - minVal);
      const distToMax = Math.abs(coords.val - maxVal);
      const grabRadius = rangeX * 0.06; // 6% of graph width grab zone

      if (distToMin <= grabRadius && distToMin <= distToMax) {
        setDragTarget(intervalX <= intervalY ? 'x' : 'y');
      } else if (distToMax <= grabRadius) {
        setDragTarget(intervalX > intervalY ? 'x' : 'y');
      } else {
        setDragTarget('range');
        setDragStartVal(coords.val);
      }
    }
  };

  // Mouse Up Handler: End Drag Selection
  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStartVal(null);
    setDragTarget(null);
  };

  const handleMouseLeave = () => {
    setHoveredBin(null);
    setHoverCursor(null);
    setIsDragging(false);
    setDragStartVal(null);
  };

  return (
    <div className="bg-white dark:bg-[#131924] rounded-2xl border-2 border-black dark:border-white shadow-md shadow-gray-900/5 p-5 sm:p-6 mb-6 transition-colors">
      {/* Header Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b-2 border-gray-300 dark:border-white/30">
        <div>
          <h2 className="text-base font-extrabold text-gray-950 dark:text-white tracking-tight">
            Market-Implied Distribution
          </h2>
        </div>

        {/* View Mode Toggle Buttons */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#1A2332] p-1 rounded-xl border-2 border-gray-300 dark:border-white/30 flex-wrap">
          <button
            onClick={() => setViewMode('smooth_pdf')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              viewMode === 'smooth_pdf'
                ? 'bg-white dark:bg-[#131924] text-gray-950 dark:text-white shadow-xs border border-gray-300 dark:border-white/40'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-[#00D26A]" />
            <span>PDF</span>
          </button>

          <button
            onClick={() => setViewMode('discrete_pmf')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              viewMode === 'discrete_pmf'
                ? 'bg-white dark:bg-[#131924] text-gray-950 dark:text-white shadow-xs border border-gray-300 dark:border-white/40'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5 text-[#00D26A]" />
            <span>PMF</span>
          </button>

          <button
            onClick={() => setViewMode('cumulative_cdf')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              viewMode === 'cumulative_cdf'
                ? 'bg-white dark:bg-[#131924] text-gray-950 dark:text-white shadow-xs border border-gray-300 dark:border-white/40'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#00D26A]" />
            <span>CDF</span>
          </button>

          <button
            onClick={() => setViewMode('options_compare')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              viewMode === 'options_compare'
                ? 'bg-white dark:bg-[#131924] text-gray-950 dark:text-white shadow-xs border border-gray-300 dark:border-white/40'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white'
            }`}
          >
            <GitCommit className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>vs. Options</span>
          </button>

          <button
            onClick={() => setViewMode('historical_shift')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              viewMode === 'historical_shift'
                ? 'bg-white dark:bg-[#131924] text-gray-950 dark:text-white shadow-xs border border-gray-300 dark:border-white/40'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>History</span>
          </button>
        </div>
      </div>

      {/* Main SVG Graph Container */}
      <div className="relative w-full bg-white dark:bg-[#0E1420] rounded-xl border-2 border-gray-300 dark:border-white/30 p-3 sm:p-4 my-3 overflow-hidden transition-colors shadow-2xs">
        <svg


          ref={svgRef}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto cursor-crosshair select-none"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {/* Smooth PDF Gradient */}
            <linearGradient id="pdfGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00D26A" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#00D26A" stopOpacity="0.02" />
            </linearGradient>

            {/* Shaded Interval [X, Y] Slice Gradient */}
            <linearGradient id="sliceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#008A45" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#008A45" stopOpacity="0.25" />
            </linearGradient>

            {/* CDF Gradient */}
            <linearGradient id="cdfGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284C7" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#0284C7" stopOpacity="0.02" />
            </linearGradient>

            {/* Historical Uncertainty Band Gradient */}
            <linearGradient id="histBandGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00D26A" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#00D26A" stopOpacity="0.08" />
            </linearGradient>
          </defs>


          {/* Grid lines (Horizontal) */}
          {viewMode !== 'historical_shift' ? (
            [0, 25, 50, 75, 100].map((level) => {
              const yPos = scaleYDensity(level);
              return (
                <g key={`grid-${level}`}>
                  <line
                    x1={padding.left}
                    y1={yPos}
                    x2={svgWidth - padding.right}
                    y2={yPos}
                    stroke="currentColor"
                    className="text-gray-200 dark:text-gray-800/80"
                    strokeWidth="1"
                    strokeDasharray={level === 0 ? 'none' : '3 3'}
                  />
                  <text
                    x={padding.left - 8}
                    y={yPos + 3}
                    textAnchor="end"
                    fontSize="11"
                    fill="currentColor"
                    className="text-gray-700 dark:text-gray-400"
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight="bold"
                  >
                    {level}%
                  </text>
                </g>
              );
            })
          ) : (
            // Historical Mode Y-Axis Grid Lines
            [0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
              const val = histYBounds.min + frac * (histYBounds.max - histYBounds.min);
              const yPos = scaleHistY(val);
              return (
                <g key={`hist-grid-${idx}`}>
                  <line
                    x1={padding.left}
                    y1={yPos}
                    x2={svgWidth - padding.right}
                    y2={yPos}
                    stroke="currentColor"
                    className="text-gray-200 dark:text-gray-800/80"
                    strokeWidth="1"
                    strokeDasharray={idx === 0 ? 'none' : '3 3'}
                  />
                  <text
                    x={padding.left - 8}
                    y={yPos + 3}
                    textAnchor="end"
                    fontSize="11"
                    fill="currentColor"
                    className="text-gray-700 dark:text-gray-400"
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight="bold"
                  >
                    {val.toFixed(2)}{market.unitSuffix}
                  </text>
                </g>
              );
            })
          )}

          {/* 1. Discrete PMF Bar View */}
          {viewMode === 'discrete_pmf' && (
            <g>
              {nonZeroBins.map((bin, idx) => {
                const slotWidth = graphWidth / nonZeroBins.length;
                const barWidth = Math.min(84, Math.max(32, slotWidth * 0.72));
                const centerX = padding.left + (idx + 0.5) * slotWidth;
                const barX = centerX - barWidth / 2;
                const barHeight = Math.max(6, (bin.probability / maxBinProb) * (graphHeight - 28));
                const barY = padding.top + graphHeight - barHeight;
                const isHovered = hoveredBin?.id === bin.id;

                return (
                  <g
                    key={bin.id}
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() => setHoveredBin(bin)}
                  >
                    <rect
                      x={barX}
                      y={barY}
                      width={barWidth}
                      height={barHeight}
                      rx="4"
                      fill={bin.isMode ? '#00D26A' : bin.isTail ? '#FB7185' : isHovered ? '#10B981' : '#94A3B8'}
                      fillOpacity={bin.isMode ? 0.9 : isHovered ? 0.8 : 0.45}
                      stroke={bin.isMode ? '#008A45' : isHovered ? '#059669' : '#64748B'}
                      strokeWidth="2"
                    />

                    {/* Probability Label atop each bar */}
                    <text
                      x={centerX}
                      y={barY - 6}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="bold"
                      fill="currentColor"
                      className={bin.isMode ? 'text-[#008A45] dark:text-[#00E676]' : 'text-gray-900 dark:text-gray-200'}
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {bin.probability}%
                    </text>

                    {/* Range Label */}
                    <text
                      x={centerX}
                      y={bin.isTail ? padding.top + graphHeight + 24 : padding.top + graphHeight + 16}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="bold"
                      fill="currentColor"
                      className="text-gray-700 dark:text-gray-300"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {bin.isTail ? (
                        bin.tailDirection === 'left'
                          ? `< ${bin.upper.toFixed(1)}${market.unitSuffix}`
                          : `> ${bin.lower.toFixed(1)}${market.unitSuffix}`
                      ) : (
                        <>
                          <tspan x={centerX} dy="0">{bin.lower.toFixed(1)}</tspan>
                          <tspan x={centerX} dy="12">-</tspan>
                          <tspan x={centerX} dy="12">{bin.upper.toFixed(1)}{market.unitSuffix}</tspan>
                        </>
                      )}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* 2. Smooth PDF View */}
          {(viewMode === 'smooth_pdf' || viewMode === 'options_compare') && (
            <g>
              {/* Background Area */}
              <path d={pdfAreaPathData} fill="url(#pdfGradient)" />

              {/* Highlighted [X, Y] Range Slice (Smoothed) */}
              {showIntervalSlice && intervalSlicePathData && (
                <path d={intervalSlicePathData} fill="url(#sliceGradient)" />
              )}

              {/* Full Density Line */}
              <path
                d={pdfPathData}
                fill="none"
                stroke="#00D26A"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="dark:drop-shadow-[0_0_8px_rgba(0,210,106,0.4)]"
              />

              {/* Lower Bound X Cutoff Pin Line */}
              {showIntervalSlice && (
                <g
                  className="cursor-ew-resize select-none"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setIsDragging(true);
                    setDragTarget(intervalX <= intervalY ? 'x' : 'y');
                  }}
                >
                  <line
                    x1={scaleX(Math.min(intervalX, intervalY))}
                    y1={padding.top - 20}
                    x2={scaleX(Math.min(intervalX, intervalY))}
                    y2={padding.top + graphHeight}
                    stroke="transparent"
                    strokeWidth="28"
                    pointerEvents="all"
                  />
                  <line
                    x1={scaleX(Math.min(intervalX, intervalY))}
                    y1={padding.top}
                    x2={scaleX(Math.min(intervalX, intervalY))}
                    y2={padding.top + graphHeight}
                    stroke="#00A854"
                    strokeWidth="2.5"
                  />
                  <rect
                    x={scaleX(Math.min(intervalX, intervalY)) - 22}
                    y={padding.top - 19}
                    width="44"
                    height="18"
                    rx="4"
                    fill="#00A854"
                    filter="drop-shadow(0 1px 2px rgba(0,0,0,0.15))"
                  />
                  <text
                    x={scaleX(Math.min(intervalX, intervalY))}
                    y={padding.top - 6}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#FFFFFF"
                    fontWeight="bold"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {Math.min(intervalX, intervalY).toFixed(2)}
                  </text>
                </g>
              )}

              {/* Upper Bound Y Cutoff Pin Line */}
              {showIntervalSlice && (
                <g
                  className="cursor-ew-resize select-none"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setIsDragging(true);
                    setDragTarget(intervalX <= intervalY ? 'y' : 'x');
                  }}
                >
                  <line
                    x1={scaleX(Math.max(intervalX, intervalY))}
                    y1={padding.top - 20}
                    x2={scaleX(Math.max(intervalX, intervalY))}
                    y2={padding.top + graphHeight}
                    stroke="transparent"
                    strokeWidth="28"
                    pointerEvents="all"
                  />
                  <line
                    x1={scaleX(Math.max(intervalX, intervalY))}
                    y1={padding.top}
                    x2={scaleX(Math.max(intervalX, intervalY))}
                    y2={padding.top + graphHeight}
                    stroke="#00A854"
                    strokeWidth="2.5"
                  />
                  <rect
                    x={scaleX(Math.max(intervalX, intervalY)) - 22}
                    y={padding.top - 19}
                    width="44"
                    height="18"
                    rx="4"
                    fill="#00A854"
                    filter="drop-shadow(0 1px 2px rgba(0,0,0,0.15))"
                  />
                  <text
                    x={scaleX(Math.max(intervalX, intervalY))}
                    y={padding.top - 6}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#FFFFFF"
                    fontWeight="bold"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {Math.max(intervalX, intervalY).toFixed(2)}
                  </text>
                </g>
              )}

              {/* Indicator Lines */}
              {showMeanPin && (
                <line
                  x1={scaleX(moments.mean)}
                  y1={padding.top - 22}
                  x2={scaleX(moments.mean)}
                  y2={padding.top + graphHeight}
                  stroke="currentColor"
                  className="text-gray-900 dark:text-gray-200"
                  strokeWidth="2"
                  strokeDasharray="2 2"
                  opacity="0.8"
                />
              )}

              {showConsensusPin && consensusVal !== null && (
                <line
                  x1={scaleX(consensusVal)}
                  y1={padding.top}
                  x2={scaleX(consensusVal)}
                  y2={padding.top + graphHeight}
                  stroke="#38BDF8"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
              )}

              {/* Badges */}
              {showMeanPin && (
                <g transform={`translate(${scaleX(moments.mean)}, ${padding.top - 31})`}>
                  <rect
                    x="-40"
                    y="-9"
                    width="80"
                    height="18"
                    rx="4"
                    fill="#111827"
                    className="dark:fill-gray-800"
                  />
                  <text
                    x="0"
                    y="3.5"
                    textAnchor="middle"
                    fontSize="9.5"
                    fill="#FFFFFF"
                    fontWeight="bold"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    E[X] {moments.mean}{market.unitSuffix}
                  </text>
                </g>
              )}

              {showConsensusPin && consensusVal !== null && (
                <g transform={`translate(${scaleX(consensusVal)}, ${padding.top - 10})`}>
                  <rect
                    x="-48"
                    y="-9"
                    width="96"
                    height="18"
                    rx="4"
                    fill="#0284C7"
                  />
                  <text
                    x="0"
                    y="3.5"
                    textAnchor="middle"
                    fontSize="9.5"
                    fill="#FFFFFF"
                    fontWeight="bold"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    Consensus {consensusVal}{market.unitSuffix}
                  </text>
                </g>
              )}

              {/* Options Black-Scholes comparison curve if active */}
              {viewMode === 'options_compare' && showOptionsCurve && (
                <path
                  d={bsPathData}
                  fill="none"
                  stroke="#818CF8"
                  strokeWidth="2.5"
                  strokeDasharray="5 5"
                />
              )}
            </g>
          )}

          {/* 3. Cumulative CDF View */}
          {viewMode === 'cumulative_cdf' && (
            <g>
              <path
                d={`${cdfPathData} L ${scaleX(maxX)} ${padding.top + graphHeight} L ${scaleX(minX)} ${padding.top + graphHeight} Z`}
                fill="url(#cdfGradient)"
              />
              <path
                d={cdfPathData}
                fill="none"
                stroke="#0284C7"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Threshold Marker */}
              <line
                x1={scaleX(cdfThreshold)}
                y1={scaleYCdf(cdfProbValue)}
                x2={scaleX(cdfThreshold)}
                y2={padding.top + graphHeight}
                stroke="#0284C7"
                strokeWidth="2"
                strokeDasharray="3 3"
              />
              <line
                x1={padding.left}
                y1={scaleYCdf(cdfProbValue)}
                x2={scaleX(cdfThreshold)}
                y2={scaleYCdf(cdfProbValue)}
                stroke="#0284C7"
                strokeWidth="2"
                strokeDasharray="3 3"
              />
              <circle
                cx={scaleX(cdfThreshold)}
                cy={scaleYCdf(cdfProbValue)}
                r="5"
                fill="#0284C7"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            </g>
          )}

          {/* 4. Historical Shift View */}
          {viewMode === 'historical_shift' && (
            <g>
              {/* Shaded Uncertainty Corridor Area (68% Confidence Band) */}
              {showHistBand && histBandPath && (
                <path d={histBandPath} fill="url(#histBandGradient)" />
              )}

              {/* Historical Consensus Benchmark Line */}
              {showHistConsensus && histConsensusPath && (
                <path
                  d={histConsensusPath}
                  fill="none"
                  stroke="#0284C7"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
              )}

              {/* Historical Expected Value Line */}
              {showHistMean && (
                <path
                  d={histMeanPath}
                  fill="none"
                  stroke="#00D26A"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Snapshot Points & Callouts */}
              {histPoints.map((p) => {
                const cx = scaleHistX(p.idx);
                const cy = scaleHistY(p.mean);
                return (
                  <g key={`hist-node-${p.idx}`}>
                    {showHistBand && (
                      <line
                        x1={cx}
                        y1={scaleHistY(p.lower)}
                        x2={cx}
                        y2={scaleHistY(p.upper)}
                        stroke="#008A45"
                        strokeWidth="2"
                        opacity="0.4"
                      />
                    )}

                    {showHistConsensus && p.consensus !== undefined && (
                      <rect
                        x={cx - 3.5}
                        y={scaleHistY(p.consensus) - 3.5}
                        width="7"
                        height="7"
                        fill="#0284C7"
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                      />
                    )}

                    {showHistMean && (
                      <>
                        <circle
                          cx={cx}
                          cy={cy}
                          r="5.5"
                          fill="#00D26A"
                          stroke="#FFFFFF"
                          strokeWidth="2.5"
                        />
                        <text
                          x={cx}
                          y={cy - 10}
                          textAnchor="middle"
                          fontSize="11.5"
                          fontWeight="800"
                          fill="currentColor"
                          className="text-gray-950 dark:text-white"
                          fontFamily="JetBrains Mono, monospace"
                        >
                          {p.mean.toFixed(2)}{market.unitSuffix}
                        </text>
                      </>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* Interactive Hairline Cursor Overlay */}
          {hoverCursor && viewMode !== 'historical_shift' && (
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
                opacity="0.75"
              />
              <circle
                cx={hoverCursor.svgX}
                cy={hoverCursor.svgY}
                r="5.5"
                fill="#00D26A"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            </g>
          )}

          {/* X Axis Base Line & Clean Ticks */}
          <line
            x1={padding.left}
            y1={padding.top + graphHeight}
            x2={svgWidth - padding.right}
            y2={padding.top + graphHeight}
            stroke="currentColor"
            className="text-gray-400 dark:text-gray-600"
            strokeWidth="1.5"
          />

          {viewMode === 'historical_shift'
            ? histPoints.map((p) => {
                const cx = scaleHistX(p.idx);
                return (
                  <g key={`hist-xtick-${p.idx}`}>
                    <line
                      x1={cx}
                      y1={padding.top + graphHeight}
                      x2={cx}
                      y2={padding.top + graphHeight + 5}
                      stroke="currentColor"
                      className="text-gray-500 dark:text-gray-500"
                      strokeWidth="1.5"
                    />
                    <text
                      x={cx}
                      y={padding.top + graphHeight + 18}
                      textAnchor="middle"
                      fontSize="11"
                      fill="currentColor"
                      className="text-gray-700 dark:text-gray-300"
                      fontWeight="bold"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {p.timestamp}
                    </text>
                  </g>
                );
              })
            : viewMode === 'discrete_pmf'
            ? nonZeroBins.map((bin, idx) => {
                const slotWidth = graphWidth / nonZeroBins.length;
                const centerX = padding.left + (idx + 0.5) * slotWidth;
                return (
                  <line
                    key={`pmf-tick-${bin.id}`}
                    x1={centerX}
                    y1={padding.top + graphHeight}
                    x2={centerX}
                    y2={padding.top + graphHeight + 5}
                    stroke="currentColor"
                    className="text-gray-500 dark:text-gray-500"
                    strokeWidth="1.5"
                  />
                );
              })
            : xAxisTicks.map((tickVal) => {
                const xPos = scaleX(tickVal);
                if (xPos < padding.left - 2 || xPos > svgWidth - padding.right + 2) return null;
                return (
                  <g key={`xtick-${tickVal}`}>
                    <line
                      x1={xPos}
                      y1={padding.top + graphHeight}
                      x2={xPos}
                      y2={padding.top + graphHeight + 5}
                      stroke="currentColor"
                      className="text-gray-500 dark:text-gray-500"
                      strokeWidth="1.5"
                    />
                    <text
                      x={xPos}
                      y={padding.top + graphHeight + 18}
                      textAnchor="middle"
                      fontSize="11"
                      fill="currentColor"
                      className="text-gray-700 dark:text-gray-300"
                      fontWeight="bold"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {tickVal.toFixed(1)}{market.unitSuffix}
                    </text>
                  </g>
                );
              })}
        </svg>

        {/* Dynamic Hairline Tooltip Callout */}
        {hoverCursor && viewMode !== 'historical_shift' && (
          <div
            className="absolute z-20 pointer-events-none bg-gray-950 dark:bg-[#1A2332] text-white px-3 py-2 rounded-xl text-xs shadow-xl border-2 border-gray-700 dark:border-gray-600 font-mono transition-transform duration-75"
            style={{
              left: `${(hoverCursor.svgX / svgWidth) * 100}%`,
              top: `${Math.max(10, ((hoverCursor.svgY - 20) / svgHeight) * 100)}%`,
              transform: hoverCursor.svgX > svgWidth / 2 ? 'translate(-108%, -50%)' : 'translate(8%, -50%)',
            }}
          >
            <div className="font-bold text-[#00D26A] text-xs">
              {hoverCursor.xVal.toFixed(2)}{market.unitSuffix}
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-300">
              <span>Density: <strong className="text-white">{hoverCursor.densityVal.toFixed(1)}%</strong></span>
              <span>•</span>
              <span>CDF: <strong className="text-white">{hoverCursor.cdfVal.toFixed(1)}%</strong></span>
            </div>
          </div>
        )}

        {/* Hover Callout for Discrete Bins */}
        {hoveredBin && viewMode === 'discrete_pmf' && !hoverCursor && (
          <div className="absolute top-3 right-3 bg-gray-900 dark:bg-[#1A2332] text-white px-3 py-2 rounded-xl text-xs shadow-lg animate-fade-in pointer-events-none border-2 border-gray-700 dark:border-gray-600">
            <div className="font-semibold text-emerald-400">{hoveredBin.label}</div>
            <div className="flex items-center gap-2 mt-0.5 font-mono">
              <span>Mass: <strong>{hoveredBin.probability}%</strong></span>
              <span>•</span>
              <span>CDF: <strong>{hoveredBin.cumulativeProb}%</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Probability Range [X, Y] Controls & Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/20 flex flex-col gap-4 bg-gray-50/80 dark:bg-[#1A2332] p-4 rounded-xl border-2 border-gray-200 dark:border-white/30">
        {viewMode === 'historical_shift' ? (
          /* Historical Revision Tracker Summary */
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#131924] p-3 rounded-xl border-2 border-gray-300 dark:border-white/30 shadow-2xs">
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider block">
                  Forecast Shift ({histPoints[0].timestamp} → {histPoints[histPoints.length - 1].timestamp})
                </span>
                <div className="text-sm font-extrabold font-mono text-gray-950 dark:text-white flex items-center gap-2 mt-0.5">
                  <span>{histPoints[0].mean.toFixed(2)}{market.unitSuffix}</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-[#008A45] dark:text-[#00E676]">{histPoints[histPoints.length - 1].mean.toFixed(2)}{market.unitSuffix}</span>
                  <span className={`text-xs px-1.5 py-0.2 rounded border font-bold ${
                    histPoints[histPoints.length - 1].mean >= histPoints[0].mean
                      ? 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700/60'
                      : 'text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700/60'
                  }`}>
                    {histPoints[histPoints.length - 1].mean >= histPoints[0].mean ? '+' : ''}
                    {((histPoints[histPoints.length - 1].mean - histPoints[0].mean) * 100).toFixed(0)} bps
                  </span>
                </div>
              </div>
            </div>

            <div className="font-mono text-xs text-gray-700 dark:text-gray-300 shrink-0">
              <span>Uncertainty: <strong>±{histPoints[histPoints.length - 1].stdDev.toFixed(2)}{market.unitSuffix}</strong> (vs. ±{histPoints[0].stdDev.toFixed(2)}{market.unitSuffix} initially)</span>
            </div>
          </div>
        ) : viewMode !== 'cumulative_cdf' ? (
          /* PDF Mode: Interval [X, Y] Evaluation and Mass on the SAME LINE */
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-[#131924] p-3 rounded-xl border-2 border-gray-300 dark:border-white/30 shadow-2xs">
            {/* Left: Inputs */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Input X (Lower Bound) */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Lower Bound (X):</span>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={inputXStr}
                    onChange={(e) => handleXChange(e.target.value)}
                    onBlur={handleXBlur}
                    placeholder="X"
                    className="w-20 px-2 py-1 text-center font-mono font-bold text-xs text-gray-950 dark:text-white bg-gray-50 dark:bg-[#1A2332] border-2 border-gray-300 dark:border-white/40 rounded-lg focus:bg-white dark:focus:bg-[#202B3D] focus:outline-none focus:ring-2 focus:ring-[#00D26A]/30 focus:border-[#00D26A]"
                  />
                  <span className="text-gray-700 dark:text-gray-300 font-mono text-xs font-bold">{market.unitSuffix}</span>
                </div>
              </div>

              <span className="text-gray-400 dark:text-gray-500 font-black text-xs">to</span>

              {/* Input Y (Upper Bound) */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Upper Bound (Y):</span>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={inputYStr}
                    onChange={(e) => handleYChange(e.target.value)}
                    onBlur={handleYBlur}
                    placeholder="Y"
                    className="w-20 px-2 py-1 text-center font-mono font-bold text-xs text-gray-950 dark:text-white bg-gray-50 dark:bg-[#1A2332] border-2 border-gray-300 dark:border-white/40 rounded-lg focus:bg-white dark:focus:bg-[#202B3D] focus:outline-none focus:ring-2 focus:ring-[#00D26A]/30 focus:border-[#00D26A]"
                  />
                  <span className="text-gray-700 dark:text-gray-300 font-mono text-xs font-bold">{market.unitSuffix}</span>
                </div>
              </div>
            </div>

            {/* Right: Harmoniously sized Probability Mass Statement */}
            <div className="font-mono font-bold text-xs sm:text-sm text-gray-950 dark:text-white flex items-center gap-1.5 flex-wrap shrink-0">
              <span>P({Math.min(intervalX, intervalY).toFixed(2)}{market.unitSuffix} ≤ Outcome ≤ {Math.max(intervalX, intervalY).toFixed(2)}{market.unitSuffix}) =</span>
              <span className="text-[#008A45] dark:text-[#00E676] bg-[#F0FDF4] dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-lg border-2 border-[#86EFAC] dark:border-emerald-700/60 text-xs sm:text-sm font-black shadow-2xs">
                {intervalProbability}%
              </span>
            </div>
          </div>
        ) : (
          /* CDF Mode: Cumulative Threshold Evaluation and Value on the SAME LINE */
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#131924] p-3 rounded-xl border-2 border-gray-300 dark:border-white/30 shadow-2xs">
            {/* Left: Input */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Threshold (X):</span>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  inputMode="decimal"
                  value={inputCdfStr}
                  onChange={(e) => handleCdfChange(e.target.value)}
                  onBlur={handleCdfBlur}
                  placeholder="X"
                  className="w-20 px-2 py-1 text-center font-mono font-bold text-xs text-gray-950 dark:text-white bg-gray-50 dark:bg-[#1A2332] border-2 border-gray-300 dark:border-white/40 rounded-lg focus:bg-white dark:focus:bg-[#202B3D] focus:outline-none focus:ring-2 focus:ring-[#0284C7]/30 focus:border-[#0284C7]"
                />
                <span className="text-gray-700 dark:text-gray-300 font-mono text-xs font-bold">{market.unitSuffix}</span>
              </div>
            </div>

            {/* Right: Resulting CDF equation */}
            <div className="font-mono font-bold text-xs sm:text-sm text-gray-950 dark:text-white flex items-center gap-1.5 shrink-0">
              <span>P(Outcome ≤ {cdfThreshold.toFixed(2)}{market.unitSuffix}) =</span>
              <span className="text-[#0284C7] dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-2.5 py-0.5 rounded-lg border-2 border-sky-300 dark:border-sky-700/60 text-xs sm:text-sm font-black shadow-2xs">
                {cdfProbValue}%
              </span>
            </div>
          </div>
        )}

        {/* Interactive Graph Line Legend & Visibility Selector */}
        <div className="pt-3 border-t-2 border-gray-200 dark:border-white/20">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <span>Legend</span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-normal">(click to toggle on/off)</span>
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs flex-wrap">
            {viewMode === 'historical_shift' ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowHistMean(!showHistMean)}
                  className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border-2 text-xs font-bold transition-all cursor-pointer ${
                    showHistMean
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-300 border-emerald-500 shadow-2xs'
                      : 'bg-gray-100 dark:bg-[#131924] text-gray-400 dark:text-gray-500 border-gray-300 dark:border-white/30 opacity-60 line-through'
                  }`}
                >
                  <span className={`w-3 h-1 rounded-full ${showHistMean ? 'bg-[#00D26A]' : 'bg-gray-400'}`}></span>
                  <span>Kalshi Mean E[X]</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowHistBand(!showHistBand)}
                  className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border-2 text-xs font-bold transition-all cursor-pointer ${
                    showHistBand
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-300 border-emerald-500 shadow-2xs'
                      : 'bg-gray-100 dark:bg-[#131924] text-gray-400 dark:text-gray-500 border-gray-300 dark:border-white/30 opacity-60 line-through'
                  }`}
                >
                  <span className={`w-3 h-3 rounded ${showHistBand ? 'bg-[#00D26A]/30 border border-[#00D26A]' : 'bg-gray-300 dark:bg-gray-600'}`}></span>
                  <span>68% Uncertainty Band (±1σ)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowHistConsensus(!showHistConsensus)}
                  className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border-2 text-xs font-bold transition-all cursor-pointer ${
                    showHistConsensus
                      ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-950 dark:text-sky-300 border-sky-500 shadow-2xs'
                      : 'bg-gray-100 dark:bg-[#131924] text-gray-400 dark:text-gray-500 border-gray-300 dark:border-white/30 opacity-60 line-through'
                  }`}
                >
                  <span className={`w-3 h-0.5 border-t-2 border-dashed ${showHistConsensus ? 'border-sky-500' : 'border-gray-400 dark:border-gray-600'}`}></span>
                  <span>Consensus Benchmark</span>
                </button>
              </>
            ) : (
              <>
                {/* 1. E[X] Pin */}
                <button
                  type="button"
                  onClick={() => setShowMeanPin(!showMeanPin)}
                  className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border-2 text-xs font-bold transition-all cursor-pointer ${
                    showMeanPin
                      ? 'bg-gray-950 dark:bg-gray-800 text-white border-gray-950 dark:border-white/40 shadow-2xs'
                      : 'bg-gray-100 dark:bg-[#131924] text-gray-400 dark:text-gray-500 border-gray-300 dark:border-white/30 opacity-60 line-through'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-xs ${showMeanPin ? 'bg-white' : 'bg-gray-400'}`}></span>
                  <span>E[X] ({moments.mean}{market.unitSuffix})</span>
                </button>

                {/* 2. Consensus Pin */}
                {consensusVal !== null && (
                  <button
                    type="button"
                    onClick={() => setShowConsensusPin(!showConsensusPin)}
                    className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border-2 text-xs font-bold transition-all cursor-pointer ${
                      showConsensusPin
                        ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                        : 'bg-gray-100 dark:bg-[#131924] text-gray-400 dark:text-gray-500 border-gray-300 dark:border-white/30 opacity-60 line-through'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-xs ${showConsensusPin ? 'bg-white' : 'bg-gray-400'}`}></span>
                    <span>Consensus ({consensusVal}{market.unitSuffix})</span>
                  </button>
                )}

                {/* 4. Range Slice & Cutoff Pins (for PDF mode) */}
                {viewMode === 'smooth_pdf' && (
                  <button
                    type="button"
                    onClick={() => setShowIntervalSlice(!showIntervalSlice)}
                    className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border-2 text-xs font-bold transition-all cursor-pointer ${
                      showIntervalSlice
                        ? 'bg-emerald-800 dark:bg-emerald-900 text-white border-emerald-800 dark:border-emerald-700 shadow-2xs'
                        : 'bg-gray-100 dark:bg-[#131924] text-gray-400 dark:text-gray-500 border-gray-300 dark:border-white/30 opacity-60 line-through'
                    }`}
                  >
                    <span className={`w-3 h-2 rounded-xs ${showIntervalSlice ? 'bg-[#00D26A]' : 'bg-gray-400'}`}></span>
                    <span>[X, Y] Range Area</span>
                  </button>
                )}

                {/* 5. Black-Scholes vs Options */}
                {viewMode === 'options_compare' && (
                  <button
                    type="button"
                    onClick={() => setShowOptionsCurve(!showOptionsCurve)}
                    className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border-2 text-xs font-bold transition-all cursor-pointer ${
                      showOptionsCurve
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-gray-100 dark:bg-[#131924] text-gray-400 dark:text-gray-500 border-gray-300 dark:border-white/30 opacity-60 line-through'
                    }`}
                  >
                    <span className={`w-3 h-0.5 border-t-2 border-dashed ${showOptionsCurve ? 'border-white' : 'border-gray-400'}`}></span>
                    <span>Black-Scholes Normal</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

