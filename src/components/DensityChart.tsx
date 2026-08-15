import React, { useState, useMemo, useRef, useEffect } from 'react';
import { MacroMarket, DistributionBin } from '../types/market';
import { generateSmoothedDensityPoints } from '../utils/distributionMath';
import { 
  BarChart2, 
  TrendingUp, 
  Layers, 
  GitCommit
} from 'lucide-react';

interface DensityChartProps {
  market: MacroMarket;
}

type ViewMode = 'smooth_pdf' | 'discrete_pmf' | 'cumulative_cdf' | 'options_compare';

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
  const [showConsensusBenchmark, setShowConsensusBenchmark] = useState<boolean>(true);

  // Hover cursor state for continuous hairline
  const [hoverCursor, setHoverCursor] = useState<HoverCursorState | null>(null);

  // Direct Click & Drag Range Selection state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartVal, setDragStartVal] = useState<number | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  const { bins, moments } = market;

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
      setIntervalX(parsed);
    }
  };

  const handleXBlur = () => {
    if (inputXStr.trim() === '' || isNaN(parseFloat(inputXStr))) {
      setInputXStr(String(intervalX));
    }
  };

  const handleYChange = (valStr: string) => {
    setInputYStr(valStr);
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed)) {
      setIntervalY(parsed);
    }
  };

  const handleYBlur = () => {
    if (inputYStr.trim() === '' || isNaN(parseFloat(inputYStr))) {
      setInputYStr(String(intervalY));
    }
  };

  const handleCdfChange = (valStr: string) => {
    setInputCdfStr(valStr);
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed)) {
      setCdfThreshold(parsed);
    }
  };

  const handleCdfBlur = () => {
    if (inputCdfStr.trim() === '' || isNaN(parseFloat(inputCdfStr))) {
      setInputCdfStr(String(cdfThreshold));
    }
  };

  // Generate continuous smoothed points
  const smoothedPoints = useMemo(() => {
    return generateSmoothedDensityPoints(bins, 140);
  }, [bins]);

  // Dimensions
  const svgWidth = 800;
  const svgHeight = 340;
  const padding = { top: 30, right: 30, bottom: 45, left: 45 };
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

  // Max discrete probability for bar height scaling
  const maxBinProb = Math.max(...bins.map((b) => b.probability), 1);

  // CDF helper function for precise interpolation
  const getCDFAt = (val: number): number => {
    if (bins.length === 0) return 0;
    if (val <= bins[0].lower) return 0;
    if (val >= bins[bins.length - 1].upper) return 100;

    let cumulativeBefore = 0;
    for (let i = 0; i < bins.length; i++) {
      const b = bins[i];
      if (val <= b.upper) {
        const fraction = b.upper > b.lower ? (val - b.lower) / (b.upper - b.lower) : 0;
        return cumulativeBefore + b.probability * fraction;
      }
      cumulativeBefore += b.probability;
    }
    return 100;
  };

  // Interpolate PDF density value at arbitrary x
  const getDensityAt = (val: number): number => {
    if (smoothedPoints.length === 0) return 0;
    if (val <= smoothedPoints[0].x) return smoothedPoints[0].density;
    if (val >= smoothedPoints[smoothedPoints.length - 1].x) return smoothedPoints[smoothedPoints.length - 1].density;

    for (let i = 0; i < smoothedPoints.length - 1; i++) {
      const p1 = smoothedPoints[i];
      const p2 = smoothedPoints[i + 1];
      if (val >= p1.x && val <= p2.x) {
        const factor = (val - p1.x) / (p2.x - p1.x);
        return p1.density + factor * (p2.density - p1.density);
      }
    }
    return 0;
  };

  // Calculate probability mass in [intervalX, intervalY]
  const intervalProbability = useMemo(() => {
    const low = Math.min(intervalX, intervalY);
    const high = Math.max(intervalX, intervalY);
    const cdfLow = getCDFAt(low);
    const cdfHigh = getCDFAt(high);
    const prob = Math.max(0, Math.min(100, cdfHigh - cdfLow));
    return Number(prob.toFixed(1));
  }, [intervalX, intervalY, bins]);

  // Calculate CDF threshold probability
  const cdfProbValue = useMemo(() => {
    return Number(getCDFAt(cdfThreshold).toFixed(1));
  }, [cdfThreshold, bins]);

  // SVG Path for smoothed continuous PDF
  const pdfPathData = useMemo(() => {
    if (smoothedPoints.length === 0) return '';
    let d = `M ${scaleX(smoothedPoints[0].x)} ${scaleYDensity(smoothedPoints[0].density)}`;
    for (let i = 1; i < smoothedPoints.length; i++) {
      const p = smoothedPoints[i];
      d += ` L ${scaleX(p.x)} ${scaleYDensity(p.density)}`;
    }
    return d;
  }, [smoothedPoints, minX, rangeX]);

  const pdfAreaPathData = useMemo(() => {
    if (smoothedPoints.length === 0) return '';
    const firstX = scaleX(smoothedPoints[0].x);
    const lastX = scaleX(smoothedPoints[smoothedPoints.length - 1].x);
    const bottomY = padding.top + graphHeight;
    return `${pdfPathData} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [pdfPathData, smoothedPoints]);

  // SVG Path for interval [X, Y] highlighted area slice under PDF
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

    // If dragging to select range [X, Y]
    if (isDragging && dragStartVal !== null) {
      if (viewMode !== 'cumulative_cdf') {
        const lower = Math.min(dragStartVal, val);
        const upper = Math.max(dragStartVal, val);
        setIntervalX(lower);
        setIntervalY(upper);
        setInputXStr(String(lower));
        setInputYStr(String(upper));
      } else {
        setCdfThreshold(val);
        setInputCdfStr(String(val));
      }
    }
  };

  // Mouse Down Handler: Start Drag Selection
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const coords = getSvgCoordinates(e);
    if (!coords) return;

    setIsDragging(true);
    setDragStartVal(coords.val);

    if (viewMode === 'cumulative_cdf') {
      setCdfThreshold(coords.val);
      setInputCdfStr(String(coords.val));
    }
  };

  // Mouse Up Handler: End Drag Selection
  const handleMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging && dragStartVal !== null) {
      const coords = getSvgCoordinates(e);
      if (coords) {
        if (viewMode !== 'cumulative_cdf') {
          // If clicked single point without dragging
          if (Math.abs(coords.val - dragStartVal) < 0.02) {
            const distToX = Math.abs(coords.val - intervalX);
            const distToY = Math.abs(coords.val - intervalY);
            if (distToX < distToY) {
              setIntervalX(coords.val);
              setInputXStr(String(coords.val));
            } else {
              setIntervalY(coords.val);
              setInputYStr(String(coords.val));
            }
          } else {
            const low = Math.min(dragStartVal, coords.val);
            const high = Math.max(dragStartVal, coords.val);
            setIntervalX(low);
            setIntervalY(high);
            setInputXStr(String(low));
            setInputYStr(String(high));
          }
        } else {
          setCdfThreshold(coords.val);
          setInputCdfStr(String(coords.val));
        }
      }
    }
    setIsDragging(false);
    setDragStartVal(null);
  };

  const handleMouseLeave = () => {
    setHoveredBin(null);
    setHoverCursor(null);
    setIsDragging(false);
    setDragStartVal(null);
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-black shadow-md shadow-gray-900/5 p-5 sm:p-6 mb-6">
      {/* Header Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b-2 border-gray-300">
        <div>
          <h2 className="text-base font-extrabold text-gray-950 tracking-tight">
            Market-Implied Distribution
          </h2>
        </div>

        {/* View Mode Toggle Buttons */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border-2 border-gray-300">
          <button
            onClick={() => setViewMode('smooth_pdf')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              viewMode === 'smooth_pdf'
                ? 'bg-white text-gray-950 shadow-xs border border-gray-300'
                : 'text-gray-600 hover:text-gray-950'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-[#00D26A]" />
            <span>PDF</span>
          </button>

          <button
            onClick={() => setViewMode('discrete_pmf')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              viewMode === 'discrete_pmf'
                ? 'bg-white text-gray-950 shadow-xs border border-gray-300'
                : 'text-gray-600 hover:text-gray-950'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5 text-[#00D26A]" />
            <span>PMF</span>
          </button>

          <button
            onClick={() => setViewMode('cumulative_cdf')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              viewMode === 'cumulative_cdf'
                ? 'bg-white text-gray-950 shadow-xs border border-gray-300'
                : 'text-gray-600 hover:text-gray-950'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#00D26A]" />
            <span>CDF</span>
          </button>

          <button
            onClick={() => setViewMode('options_compare')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              viewMode === 'options_compare'
                ? 'bg-white text-gray-950 shadow-xs border border-gray-300'
                : 'text-gray-600 hover:text-gray-950'
            }`}
          >
            <GitCommit className="w-3.5 h-3.5 text-indigo-600" />
            <span>vs. Options</span>
          </button>
        </div>
      </div>

      {/* Main SVG Graph Container */}
      <div className="relative w-full overflow-hidden my-3">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto select-none cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {/* Green Gradient Fill for PDF */}
            <linearGradient id="pdfGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00D26A" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#00D26A" stopOpacity="0.01" />
            </linearGradient>

            {/* Vibrant Green Gradient Fill for Interval [X, Y] Slice */}
            <linearGradient id="sliceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00D26A" stopOpacity="0.65" />
              <stop offset="70%" stopColor="#00D26A" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#00D26A" stopOpacity="0.08" />
            </linearGradient>

            {/* CDF Gradient */}
            <linearGradient id="cdfGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284C7" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#0284C7" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid lines (Horizontal) */}
          {[0, 25, 50, 75, 100].map((level) => {
            const yPos = scaleYDensity(level);
            return (
              <g key={`grid-${level}`}>
                <line
                  x1={padding.left}
                  y1={yPos}
                  x2={svgWidth - padding.right}
                  y2={yPos}
                  stroke="#E5E7EB"
                  strokeWidth="1"
                  strokeDasharray={level === 0 ? 'none' : '3 3'}
                />
                <text
                  x={padding.left - 8}
                  y={yPos + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="#6B7280"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="bold"
                >
                  {level}%
                </text>
              </g>
            );
          })}

          {/* 1. Discrete PMF Bar View */}
          {viewMode === 'discrete_pmf' && (
            <g>
              {bins.map((bin) => {
                const x1 = scaleX(bin.lower);
                const x2 = scaleX(bin.upper);
                const barWidth = Math.max(4, x2 - x1 - 4);
                const barHeight = (bin.probability / maxBinProb) * (graphHeight - 20);
                const barY = padding.top + graphHeight - barHeight;
                const isHovered = hoveredBin?.id === bin.id;

                return (
                  <g
                    key={bin.id}
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() => setHoveredBin(bin)}
                  >
                    <rect
                      x={x1 + 2}
                      y={barY}
                      width={barWidth}
                      height={barHeight}
                      rx="4"
                      fill={bin.isMode ? '#00D26A' : bin.isTail ? '#FB7185' : isHovered ? '#10B981' : '#E5E7EB'}
                      fillOpacity={bin.isMode ? 0.9 : isHovered ? 0.8 : 0.65}
                      stroke={bin.isMode ? '#008A45' : isHovered ? '#059669' : '#9CA3AF'}
                      strokeWidth="2"
                    />

                    {/* Probability Label atop each bar */}
                    <text
                      x={x1 + 2 + barWidth / 2}
                      y={barY - 6}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="bold"
                      fill={bin.isMode ? '#008A45' : '#111827'}
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {bin.probability}%
                    </text>

                    {/* Bin Label */}
                    <text
                      x={x1 + 2 + barWidth / 2}
                      y={padding.top + graphHeight + 18}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#4B5563"
                      fontWeight="bold"
                      fontFamily="Plus Jakarta Sans, sans-serif"
                    >
                      {bin.label}
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

              {/* Highlighted [X, Y] Slice Area */}
              {intervalSlicePathData && (
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
              />

              {/* Vertical Markers for X (Lower bound) and Y (Upper bound) */}
              <g>
                {/* Marker line X */}
                <line
                  x1={scaleX(intervalX)}
                  y1={padding.top}
                  x2={scaleX(intervalX)}
                  y2={padding.top + graphHeight}
                  stroke="#008A45"
                  strokeWidth="2.5"
                  strokeDasharray="4 3"
                />
                <circle
                  cx={scaleX(intervalX)}
                  cy={padding.top + graphHeight}
                  r="4.5"
                  fill="#008A45"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />

                {/* Marker line Y */}
                <line
                  x1={scaleX(intervalY)}
                  y1={padding.top}
                  x2={scaleX(intervalY)}
                  y2={padding.top + graphHeight}
                  stroke="#008A45"
                  strokeWidth="2.5"
                  strokeDasharray="4 3"
                />
                <circle
                  cx={scaleX(intervalY)}
                  cy={padding.top + graphHeight}
                  r="4.5"
                  fill="#008A45"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
              </g>

              {/* Consensus Benchmark Line (Feature 1) */}
              {showConsensusBenchmark && consensusVal !== null && consensusVal >= minX && consensusVal <= maxX && (
                <g>
                  <line
                    x1={scaleX(consensusVal)}
                    y1={padding.top}
                    x2={scaleX(consensusVal)}
                    y2={padding.top + graphHeight}
                    stroke="#2563EB"
                    strokeWidth="2"
                    strokeDasharray="3 3"
                  />
                  {/* Pin label top */}
                  <g transform={`translate(${scaleX(consensusVal)}, ${padding.top - 8})`}>
                    <rect
                      x="-42"
                      y="-14"
                      width="84"
                      height="18"
                      rx="4"
                      fill="#2563EB"
                      stroke="#FFFFFF"
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="-2"
                      textAnchor="middle"
                      fontSize="9.5"
                      fill="#FFFFFF"
                      fontWeight="bold"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      Consensus {consensusVal}{market.unitSuffix}
                    </text>
                  </g>
                </g>
              )}

              {/* Mode Peak Marker */}
              <line
                x1={scaleX(moments.mode)}
                y1={padding.top}
                x2={scaleX(moments.mode)}
                y2={padding.top + graphHeight}
                stroke="#111827"
                strokeWidth="1.5"
                strokeDasharray="2 2"
                opacity="0.5"
              />

              {/* Options Black-Scholes comparison curve if active */}
              {viewMode === 'options_compare' && (
                <path
                  d={bsPathData}
                  fill="none"
                  stroke="#6366F1"
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

          {/* Interactive Hairline Cursor Overlay (Feature 2) */}
          {hoverCursor && (
            <g pointerEvents="none">
              {/* Vertical Hairline */}
              <line
                x1={hoverCursor.svgX}
                y1={padding.top}
                x2={hoverCursor.svgX}
                y2={padding.top + graphHeight}
                stroke="#111827"
                strokeWidth="1.5"
                strokeDasharray="2 2"
                opacity="0.75"
              />

              {/* Snapping Pulse Circle on the Curve */}
              <circle
                cx={hoverCursor.svgX}
                cy={hoverCursor.svgY}
                r="5.5"
                fill="#111827"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            </g>
          )}

          {/* X Axis Base Line & Ticks */}
          <line
            x1={padding.left}
            y1={padding.top + graphHeight}
            x2={svgWidth - padding.right}
            y2={padding.top + graphHeight}
            stroke="#9CA3AF"
            strokeWidth="2"
          />

          {bins.map((bin) => {
            const xPos = scaleX(bin.midpoint);
            return (
              <g key={`tick-${bin.id}`}>
                <line
                  x1={xPos}
                  y1={padding.top + graphHeight}
                  x2={xPos}
                  y2={padding.top + graphHeight + 5}
                  stroke="#6B7280"
                  strokeWidth="1.5"
                />
                {viewMode !== 'discrete_pmf' && (
                  <text
                    x={xPos}
                    y={padding.top + graphHeight + 18}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#374151"
                    fontWeight="bold"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {bin.midpoint.toFixed(1)}{market.unitSuffix}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Dynamic Hairline Tooltip Callout (Feature 2) */}
        {hoverCursor && (
          <div
            className="absolute z-20 pointer-events-none bg-gray-950 text-white px-3 py-2 rounded-xl text-xs shadow-xl border-2 border-gray-700 font-mono transition-transform duration-75"
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

        {/* Hover / Point Overlay Callout for Discrete Bins */}
        {hoveredBin && viewMode === 'discrete_pmf' && !hoverCursor && (
          <div className="absolute top-3 right-3 bg-gray-900 text-white px-3 py-2 rounded-xl text-xs shadow-lg animate-fade-in pointer-events-none border-2 border-gray-700">
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
      <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col gap-4 bg-gray-50/80 p-4 rounded-xl border-2 border-gray-200">
        {viewMode !== 'cumulative_cdf' ? (
          /* PDF Mode: Interval [X, Y] Evaluation and Mass on the SAME LINE */
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3 rounded-xl border-2 border-gray-300 shadow-2xs">
            {/* Left: Inputs */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Input X (Lower Bound) */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-800">Lower Bound (X):</span>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={inputXStr}
                    onChange={(e) => handleXChange(e.target.value)}
                    onBlur={handleXBlur}
                    placeholder="X"
                    className="w-20 px-2 py-1 text-center font-mono font-bold text-xs text-gray-950 bg-gray-50 border-2 border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00D26A]/30 focus:border-[#00D26A]"
                  />
                  <span className="text-gray-700 font-mono text-xs font-bold">{market.unitSuffix}</span>
                </div>
              </div>

              <span className="text-gray-400 font-black text-xs">to</span>

              {/* Input Y (Upper Bound) */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-800">Upper Bound (Y):</span>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={inputYStr}
                    onChange={(e) => handleYChange(e.target.value)}
                    onBlur={handleYBlur}
                    placeholder="Y"
                    className="w-20 px-2 py-1 text-center font-mono font-bold text-xs text-gray-950 bg-gray-50 border-2 border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00D26A]/30 focus:border-[#00D26A]"
                  />
                  <span className="text-gray-700 font-mono text-xs font-bold">{market.unitSuffix}</span>
                </div>
              </div>
            </div>

            {/* Right: Harmoniously sized Probability Mass Statement */}
            <div className="font-mono font-bold text-xs sm:text-sm text-gray-950 flex items-center gap-1.5 flex-wrap shrink-0">
              <span>P({Math.min(intervalX, intervalY).toFixed(2)}{market.unitSuffix} ≤ Outcome ≤ {Math.max(intervalX, intervalY).toFixed(2)}{market.unitSuffix}) =</span>
              <span className="text-[#008A45] bg-[#F0FDF4] px-2.5 py-0.5 rounded-lg border-2 border-[#86EFAC] text-xs sm:text-sm font-black shadow-2xs">
                {intervalProbability}%
              </span>
            </div>
          </div>
        ) : (
          /* CDF Mode: Cumulative Threshold Evaluation and Value on the SAME LINE */
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border-2 border-gray-300 shadow-2xs">
            {/* Left: Input */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-800">Threshold (X):</span>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  inputMode="decimal"
                  value={inputCdfStr}
                  onChange={(e) => handleCdfChange(e.target.value)}
                  onBlur={handleCdfBlur}
                  placeholder="X"
                  className="w-20 px-2 py-1 text-center font-mono font-bold text-xs text-gray-950 bg-gray-50 border-2 border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0284C7]/30 focus:border-[#0284C7]"
                />
                <span className="text-gray-700 font-mono text-xs font-bold">{market.unitSuffix}</span>
              </div>
            </div>

            {/* Right: Resulting CDF equation */}
            <div className="font-mono font-bold text-xs sm:text-sm text-gray-950 flex items-center gap-1.5 shrink-0">
              <span>P(Outcome ≤ {cdfThreshold.toFixed(2)}{market.unitSuffix}) =</span>
              <span className="text-[#0284C7] bg-sky-50 px-2.5 py-0.5 rounded-lg border-2 border-sky-300 text-xs sm:text-sm font-black shadow-2xs">
                {cdfProbValue}%
              </span>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200 text-xs flex-wrap gap-3">
          <div className="flex items-center gap-4 text-xs flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#00D26A]"></span>
              <span className="text-gray-700 font-medium">Peak Mode ({moments.modeRange})</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-gray-950"></span>
              <span className="text-gray-700 font-medium">E[X] ({moments.mean}{market.unitSuffix})</span>
            </div>

            {/* Consensus Benchmark Legend Toggle */}
            {consensusVal !== null && (
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-gray-700 font-bold">
                <input
                  type="checkbox"
                  checked={showConsensusBenchmark}
                  onChange={(e) => setShowConsensusBenchmark(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                />
                <span className="w-3 h-0.5 border-t-2 border-dashed border-blue-600 inline-block"></span>
                <span className="text-blue-700 font-bold">Consensus ({consensusVal}{market.unitSuffix})</span>
              </label>
            )}

            {viewMode === 'options_compare' && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t-2 border-dashed border-indigo-500"></span>
                <span className="text-indigo-700 font-bold">Black-Scholes Normal</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
