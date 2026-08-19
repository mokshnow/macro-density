import React, { useState, useMemo, useRef } from 'react';
import { FedMeetingProjection } from '../types/market';
import { 
  TrendingDown, 
  Layers, 
  CircleDot, 
  History, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  Calendar,
  Zap,
  Activity
} from 'lucide-react';

interface FedRatePathFanChartProps {
  ratePath: FedMeetingProjection[];
  unitSuffix?: string;
}

export const FedRatePathFanChart: React.FC<FedRatePathFanChartProps> = ({
  ratePath,
  unitSuffix = '%',
}) => {
  const [selectedMeetingIndex, setSelectedMeetingIndex] = useState<number | null>(null);
  const [hoverMeetingIndex, setHoverMeetingIndex] = useState<number | null>(null);

  // Overlay Visibility Toggles
  const [showFanRibbons, setShowFanRibbons] = useState<boolean>(true);
  const [showFomcDots, setShowFomcDots] = useState<boolean>(true);
  const [showPriorMonth, setShowPriorMonth] = useState<boolean>(true);
  const [showCmePath, setShowCmePath] = useState<boolean>(true);
  const [showModelDetails, setShowModelDetails] = useState<boolean>(false);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Dimensions
  const svgWidth = 840;
  const svgHeight = 380;
  const padding = { top: 48, right: 40, bottom: 64, left: 55 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  // Rate Y-Bounds (e.g. 2.75% to 5.75%)
  const yMin = 2.75;
  const yMax = 5.75;
  const yRange = yMax - yMin;

  const scaleX = (index: number) => {
    if (ratePath.length <= 1) return padding.left + graphWidth / 2;
    return padding.left + (index / (ratePath.length - 1)) * graphWidth;
  };

  const scaleY = (rate: number) => {
    return padding.top + graphHeight - ((rate - yMin) / yRange) * graphHeight;
  };

  // Smooth Bézier Spline Helper for Fan Ribbons
  const createSmoothRibbonPath = (
    upperPoints: { x: number; y: number }[],
    lowerPoints: { x: number; y: number }[]
  ): string => {
    if (upperPoints.length < 2) return '';

    // Upper curve (left to right)
    let path = `M ${upperPoints[0].x} ${upperPoints[0].y}`;
    for (let i = 0; i < upperPoints.length - 1; i++) {
      const p0 = upperPoints[Math.max(0, i - 1)];
      const p1 = upperPoints[i];
      const p2 = upperPoints[i + 1];
      const p3 = upperPoints[Math.min(upperPoints.length - 1, i + 2)];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    // Lower curve (right to left)
    const reversedLower = [...lowerPoints].reverse();
    path += ` L ${reversedLower[0].x} ${reversedLower[0].y}`;
    for (let i = 0; i < reversedLower.length - 1; i++) {
      const p0 = reversedLower[Math.max(0, i - 1)];
      const p1 = reversedLower[i];
      const p2 = reversedLower[i + 1];
      const p3 = reversedLower[Math.min(reversedLower.length - 1, i + 2)];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    path += ' Z';
    return path;
  };

  // Smooth Line Path Helper
  const createSmoothLinePath = (points: { x: number; y: number }[]): string => {
    if (points.length < 2) return '';
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return path;
  };

  // 1. 90% Confidence Corridor Points & Path
  const band90Upper = useMemo(() => ratePath.map((m, i) => ({ x: scaleX(i), y: scaleY(m.confidence90[1]) })), [ratePath]);
  const band90Lower = useMemo(() => ratePath.map((m, i) => ({ x: scaleX(i), y: scaleY(m.confidence90[0]) })), [ratePath]);
  const path90Band = useMemo(() => createSmoothRibbonPath(band90Upper, band90Lower), [band90Upper, band90Lower]);

  // 2. 68% Confidence Corridor Points & Path (1-Sigma)
  const band68Upper = useMemo(() => ratePath.map((m, i) => ({ x: scaleX(i), y: scaleY(m.confidence68[1]) })), [ratePath]);
  const band68Lower = useMemo(() => ratePath.map((m, i) => ({ x: scaleX(i), y: scaleY(m.confidence68[0]) })), [ratePath]);
  const path68Band = useMemo(() => createSmoothRibbonPath(band68Upper, band68Lower), [band68Upper, band68Lower]);

  // 3. 50% Confidence Corridor Points & Path (IQR)
  const band50Upper = useMemo(() => ratePath.map((m, i) => ({ x: scaleX(i), y: scaleY(m.confidence50[1]) })), [ratePath]);
  const band50Lower = useMemo(() => ratePath.map((m, i) => ({ x: scaleX(i), y: scaleY(m.confidence50[0]) })), [ratePath]);
  const path50Band = useMemo(() => createSmoothRibbonPath(band50Upper, band50Lower), [band50Upper, band50Lower]);

  // 4. Expected Mean Path
  const expectedLinePoints = useMemo(() => ratePath.map((m, i) => ({ x: scaleX(i), y: scaleY(m.expectedRate) })), [ratePath]);
  const pathExpectedLine = useMemo(() => createSmoothLinePath(expectedLinePoints), [expectedLinePoints]);

  // 5. Prior Month Expected Path
  const priorLinePoints = useMemo(
    () => ratePath.filter((m) => m.priorMonthExpectedRate !== undefined).map((m, i) => ({ x: scaleX(i), y: scaleY(m.priorMonthExpectedRate!) })),
    [ratePath]
  );
  const pathPriorLine = useMemo(() => createSmoothLinePath(priorLinePoints), [priorLinePoints]);

  // 6. CME SOFR Implied Path
  const cmeLinePoints = useMemo(
    () => ratePath.filter((m) => m.cmeImplied !== undefined).map((m, i) => ({ x: scaleX(i), y: scaleY(m.cmeImplied!) })),
    [ratePath]
  );
  const pathCmeLine = useMemo(() => createSmoothLinePath(cmeLinePoints), [cmeLinePoints]);

  // Active highlighted meeting
  const activeIndex = hoverMeetingIndex !== null ? hoverMeetingIndex : selectedMeetingIndex !== null ? selectedMeetingIndex : 3; // default Dec 2026
  const activeMeeting = ratePath[activeIndex] || ratePath[0];

  // Y-axis grid increments (every 25 bps / 0.50%)
  const yTicks = [3.0, 3.5, 4.0, 4.5, 5.0, 5.5];

  // Total easing priced by horizon
  const finalMeeting = ratePath[ratePath.length - 1];
  const totalEasingBps = finalMeeting ? Math.round((ratePath[0].expectedRate - finalMeeting.expectedRate) * 100) : 125;

  return (
    <div className="bg-white rounded-2xl border-2 border-black shadow-md shadow-gray-900/5 p-5 sm:p-6 mb-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b-2 border-gray-300 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-gray-950 text-white">
              FOMC POLICY TRAJECTORY
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 text-[#008A45] border-2 border-[#BBF7D0] text-xs font-extrabold shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>TERM STRUCTURE FAN CHART</span>
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-gray-950 tracking-tight">
            Fed Funds Implied Rate Path &amp; Uncertainty Fan
          </h2>
          <p className="text-xs text-gray-600 font-medium mt-0.5">
            Bank of England-style probability fan chart derived from Kalshi binary contracts across FOMC meetings.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowModelDetails(!showModelDetails)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 hover:text-gray-950 bg-gray-50 hover:bg-gray-100 border-2 border-gray-300 rounded-xl transition-colors cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 text-[#008A45]" />
            <span>Fan Chart Methodology</span>
            {showModelDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Methodology Accordion */}
      {showModelDetails && (
        <div className="mb-4 p-4 rounded-xl bg-gray-50 border-2 border-gray-300 text-xs text-gray-700 space-y-2 animate-in fade-in duration-150">
          <div className="font-extrabold text-gray-950 flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#008A45]" />
            <span>Bank of England &amp; FOMC Fan Chart Formulation</span>
          </div>
          <p className="leading-relaxed">
            The fan chart represents expanding probability corridors over time as policy horizons extend. Kalshi strike contracts for each FOMC meeting (P(R_t &gt; K_i)) generate discrete state-price densities, from which quantiles are extracted:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
            <div className="p-2.5 bg-white rounded-lg border border-gray-200">
              <strong className="text-emerald-800 block mb-0.5">50% Core (Dark Green):</strong>
              <span>Interquartile Range [p25, p75] containing 50% of the market mass.</span>
            </div>
            <div className="p-2.5 bg-white rounded-lg border border-gray-200">
              <strong className="text-emerald-700 block mb-0.5">68% Band (1-Sigma):</strong>
              <span>[p16, p84] corresponds to ±1 standard deviation of policy uncertainty.</span>
            </div>
            <div className="p-2.5 bg-white rounded-lg border border-gray-200">
              <strong className="text-emerald-600 block mb-0.5">90% Tail Corridor:</strong>
              <span>[p05, p95] covering the vast majority of terminal rate outcomes.</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Fan Chart SVG */}
      <div className="relative w-full bg-white rounded-xl border-2 border-gray-300 p-3 sm:p-4 mb-4 shadow-2xs overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto select-none cursor-crosshair"
          onMouseLeave={() => setHoverMeetingIndex(null)}
        >
          <defs>
            {/* 90% Fan Gradient (Outer) */}
            <linearGradient id="fan90Grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#00D26A" stopOpacity="0.08" />
              <stop offset="50%" stopColor="#00D26A" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#00D26A" stopOpacity="0.12" />
            </linearGradient>

            {/* 68% Fan Gradient (1-Sigma) */}
            <linearGradient id="fan68Grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#00D26A" stopOpacity="0.18" />
              <stop offset="50%" stopColor="#00D26A" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#00D26A" stopOpacity="0.22" />
            </linearGradient>

            {/* 50% Fan Gradient (IQR Core) */}
            <linearGradient id="fan50Grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#00D26A" stopOpacity="0.35" />
              <stop offset="50%" stopColor="#00D26A" stopOpacity="0.48" />
              <stop offset="100%" stopColor="#00D26A" stopOpacity="0.40" />
            </linearGradient>
          </defs>

          {/* Horizontal Gridlines & Rate Labels */}
          {yTicks.map((tick) => {
            const yPos = scaleY(tick);
            return (
              <g key={`y-tick-${tick}`}>
                <line
                  x1={padding.left}
                  y1={yPos}
                  x2={svgWidth - padding.right}
                  y2={yPos}
                  stroke="#E5E7EB"
                  strokeWidth="1"
                  strokeDasharray={tick % 1 === 0 ? 'none' : '3 3'}
                />
                <text
                  x={padding.left - 10}
                  y={yPos + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="#374151"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="bold"
                >
                  {tick.toFixed(2)}%
                </text>
              </g>
            );
          })}

          {/* Vertical Gridlines at each FOMC meeting */}
          {ratePath.map((m, i) => {
            const xPos = scaleX(i);
            return (
              <line
                key={`meeting-grid-${i}`}
                x1={xPos}
                y1={padding.top}
                x2={xPos}
                y2={padding.top + graphHeight}
                stroke="#F3F4F6"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
            );
          })}

          {/* 1. Shaded Probability Fan Ribbons (Expanding Cones) */}
          {showFanRibbons && (
            <g>
              {/* Outer 90% Ribbon */}
              <path d={path90Band} fill="url(#fan90Grad)" />

              {/* Middle 68% Ribbon (1-Sigma) */}
              <path d={path68Band} fill="url(#fan68Grad)" />

              {/* Core 50% Ribbon (IQR) */}
              <path d={path50Band} fill="url(#fan50Grad)" />
            </g>
          )}

          {/* 2. Prior Month Expected Path (Historical Comparison) */}
          {showPriorMonth && pathPriorLine && (
            <g>
              <path
                d={pathPriorLine}
                fill="none"
                stroke="#F59E0B"
                strokeWidth="2.5"
                strokeDasharray="5 3"
                strokeLinecap="round"
              />
            </g>
          )}

          {/* 3. CME SOFR Futures Implied Path */}
          {showCmePath && pathCmeLine && (
            <g>
              <path
                d={pathCmeLine}
                fill="none"
                stroke="#8B5CF6"
                strokeWidth="2"
                strokeDasharray="3 3"
                strokeLinecap="round"
              />
            </g>
          )}

          {/* 4. FOMC Dot Plot (Individual Participant Projections) */}
          {showFomcDots && (
            <g>
              {ratePath.map((m, meetingIdx) => {
                if (!m.fomcDots || m.fomcDots.length === 0) return null;
                const cx = scaleX(meetingIdx);

                // Group dots by rate to jitter horizontal placement slightly
                const rateCounts: Record<number, number> = {};
                const dotOffsets = m.fomcDots.map((dotRate) => {
                  const count = rateCounts[dotRate] || 0;
                  rateCounts[dotRate] = count + 1;
                  return count;
                });

                return (
                  <g key={`fomc-dots-meeting-${meetingIdx}`}>
                    {m.fomcDots.map((dotRate, dotIdx) => {
                      const offsetIndex = dotOffsets[dotIdx];
                      const totalAtRate = rateCounts[dotRate];
                      // Center dots around cx
                      const jitterX = totalAtRate > 1 ? cx + (offsetIndex - (totalAtRate - 1) / 2) * 9 : cx;
                      const dotY = scaleY(dotRate);

                      return (
                        <circle
                          key={`dot-${meetingIdx}-${dotIdx}`}
                          cx={jitterX}
                          cy={dotY}
                          r="3.5"
                          fill="#0284C7"
                          fillOpacity="0.85"
                          stroke="#FFFFFF"
                          strokeWidth="1"
                        />
                      );
                    })}

                    {/* FOMC Median Diamond Marker */}
                    {m.fomcMedian && (
                      <g transform={`translate(${cx}, ${scaleY(m.fomcMedian)})`}>
                        <polygon
                          points="0,-6 6,0 0,6 -6,0"
                          fill="#0284C7"
                          stroke="#FFFFFF"
                          strokeWidth="1.5"
                        />
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* 5. Central Market Expected Rate Path (Kalshi Implied) */}
          <path
            d={pathExpectedLine}
            fill="none"
            stroke="#008A45"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Meeting Nodes & Hitboxes */}
          {ratePath.map((m, i) => {
            const cx = scaleX(i);
            const cy = scaleY(m.expectedRate);
            const isHovered = activeIndex === i;

            return (
              <g
                key={`meeting-node-${i}`}
                className="cursor-pointer"
                onMouseEnter={() => setHoverMeetingIndex(i)}
                onClick={() => setSelectedMeetingIndex(i)}
              >
                {/* Wide invisible click hitbox */}
                <rect
                  x={cx - 24}
                  y={padding.top}
                  width="48"
                  height={graphHeight}
                  fill="transparent"
                  pointerEvents="all"
                />

                {/* Vertical Active Hairline on Hover/Select */}
                {isHovered && (
                  <line
                    x1={cx}
                    y1={padding.top}
                    x2={cx}
                    y2={padding.top + graphHeight}
                    stroke="#111827"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                    opacity="0.8"
                  />
                )}

                {/* Expected Value Node Circle */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 7.5 : 5.5}
                  fill={isHovered ? '#008A45' : '#00D26A'}
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                  className="transition-all duration-150 shadow-sm"
                />

                {/* Node Rate Badge */}
                <text
                  x={cx}
                  y={cy - 12}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="bold"
                  fill="#111827"
                  fontFamily="JetBrains Mono, monospace"
                  className="drop-shadow-xs"
                >
                  {m.expectedRate.toFixed(2)}%
                </text>
              </g>
            );
          })}

          {/* Bottom X-Axis Meeting Date Labels */}
          <line
            x1={padding.left}
            y1={padding.top + graphHeight}
            x2={svgWidth - padding.right}
            y2={padding.top + graphHeight}
            stroke="#9CA3AF"
            strokeWidth="1.5"
          />
          {ratePath.map((m, i) => {
            const cx = scaleX(i);
            const isSelected = activeIndex === i;

            return (
              <g
                key={`x-label-${i}`}
                className="cursor-pointer"
                onMouseEnter={() => setHoverMeetingIndex(i)}
                onClick={() => setSelectedMeetingIndex(i)}
              >
                <line
                  x1={cx}
                  y1={padding.top + graphHeight}
                  x2={cx}
                  y2={padding.top + graphHeight + 6}
                  stroke="#6B7280"
                  strokeWidth="1.5"
                />
                <text
                  x={cx}
                  y={padding.top + graphHeight + 20}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight={isSelected ? '900' : 'bold'}
                  fill={isSelected ? '#008A45' : '#374151'}
                  fontFamily="JetBrains Mono, monospace"
                >
                  {m.label}
                </text>
                <text
                  x={cx}
                  y={padding.top + graphHeight + 34}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="600"
                  fill={isSelected ? '#008A45' : '#6B7280'}
                  fontFamily="JetBrains Mono, monospace"
                >
                  {m.cumulativeCutBps !== 0 ? `${m.cumulativeCutBps} bps` : 'Base'}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Callout Popover for Selected/Hovered Meeting */}
        {activeMeeting && (
          <div className="mt-2 p-3.5 bg-gray-950 text-white rounded-xl border-2 border-gray-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-100 font-sans">
            {/* Left: Meeting Header & Expected Target */}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#00D26A] bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                  {activeMeeting.eventTicker}
                </span>
                <span className="text-xs text-gray-300 font-bold">
                  {activeMeeting.meetingDate}
                </span>
                {activeMeeting.isCurrent && (
                  <span className="text-[10px] bg-gray-800 text-gray-300 font-bold px-1.5 py-0.2 rounded">
                    CURRENT BENCHMARK
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-lg sm:text-xl font-extrabold font-mono text-white">
                  {activeMeeting.expectedRate.toFixed(2)}%
                </span>
                <span className="text-xs text-emerald-400 font-bold font-mono">
                  ({activeMeeting.cumulativeCutBps >= 0 ? '+' : ''}{activeMeeting.cumulativeCutBps} bps cumulative easing)
                </span>
              </div>
            </div>

            {/* Middle: Policy Action Odds */}
            {!activeMeeting.isCurrent ? (
              <div className="flex items-center gap-3 text-xs font-mono">
                <div className="p-2 rounded-lg bg-gray-900 border border-gray-800 text-center">
                  <div className="text-[10px] text-gray-400 font-bold uppercase">25bps Cut</div>
                  <div className="text-sm font-extrabold text-emerald-400">{activeMeeting.cutProbability25bps}%</div>
                </div>
                <div className="p-2 rounded-lg bg-gray-900 border border-gray-800 text-center">
                  <div className="text-[10px] text-gray-400 font-bold uppercase">50bps Cut</div>
                  <div className="text-sm font-extrabold text-teal-400">{activeMeeting.cutProbability50bps}%</div>
                </div>
                <div className="p-2 rounded-lg bg-gray-900 border border-gray-800 text-center">
                  <div className="text-[10px] text-gray-400 font-bold uppercase">Hold / Pause</div>
                  <div className="text-sm font-extrabold text-amber-400">{activeMeeting.pauseProbability}%</div>
                </div>
              </div>
            ) : (
              <div className="text-xs font-mono text-gray-400">
                Effective Federal Funds Rate target range: 5.25% – 5.50%
              </div>
            )}

            {/* Right: Quantile Dispersion Ribbon Values */}
            <div className="font-mono text-xs text-right space-y-0.5 text-gray-300">
              <div>
                <span className="text-gray-400 text-[11px]">50% Core (IQR): </span>
                <strong className="text-white">[{activeMeeting.confidence50[0].toFixed(2)}%, {activeMeeting.confidence50[1].toFixed(2)}%]</strong>
              </div>
              <div>
                <span className="text-gray-400 text-[11px]">68% 1-Sigma: </span>
                <strong className="text-white">[{activeMeeting.confidence68[0].toFixed(2)}%, {activeMeeting.confidence68[1].toFixed(2)}%]</strong>
              </div>
              <div>
                <span className="text-gray-400 text-[11px]">90% Corridor: </span>
                <strong className="text-white">[{activeMeeting.confidence90[0].toFixed(2)}%, {activeMeeting.confidence90[1].toFixed(2)}%]</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control Toggles & Legend Bar */}
      <div className="p-3.5 bg-gray-50/90 rounded-xl border-2 border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-extrabold uppercase tracking-wider text-gray-600 mr-1">
            Overlays:
          </span>

          {/* 1. Toggle Fan Ribbons */}
          <button
            onClick={() => setShowFanRibbons(!showFanRibbons)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg border-2 transition-all cursor-pointer ${
              showFanRibbons
                ? 'bg-emerald-50 text-emerald-950 border-emerald-500 shadow-2xs'
                : 'bg-white text-gray-400 border-gray-300 opacity-60 line-through'
            }`}
          >
            <span className={`w-3 h-3 rounded ${showFanRibbons ? 'bg-[#00D26A]' : 'bg-gray-300'}`}></span>
            <span>50%/68%/90% Confidence Fan</span>
          </button>

          {/* 2. Toggle FOMC SEP Dot Plot */}
          <button
            onClick={() => setShowFomcDots(!showFomcDots)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg border-2 transition-all cursor-pointer ${
              showFomcDots
                ? 'bg-sky-50 text-sky-950 border-sky-500 shadow-2xs'
                : 'bg-white text-gray-400 border-gray-300 opacity-60 line-through'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${showFomcDots ? 'bg-sky-600' : 'bg-gray-300'}`}></span>
            <span>FOMC SEP Dot Plot</span>
          </button>

          {/* 3. Toggle Prior Month Shift */}
          <button
            onClick={() => setShowPriorMonth(!showPriorMonth)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg border-2 transition-all cursor-pointer ${
              showPriorMonth
                ? 'bg-amber-50 text-amber-950 border-amber-500 shadow-2xs'
                : 'bg-white text-gray-400 border-gray-300 opacity-60 line-through'
            }`}
          >
            <span className={`w-3 h-0.5 border-t-2 border-dashed ${showPriorMonth ? 'border-amber-600' : 'border-gray-300'}`}></span>
            <span>1-Mo Ago Trajectory</span>
          </button>

          {/* 4. Toggle CME SOFR Path */}
          <button
            onClick={() => setShowCmePath(!showCmePath)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg border-2 transition-all cursor-pointer ${
              showCmePath
                ? 'bg-purple-50 text-purple-950 border-purple-500 shadow-2xs'
                : 'bg-white text-gray-400 border-gray-300 opacity-60 line-through'
            }`}
          >
            <span className={`w-3 h-0.5 border-t-2 border-dotted ${showCmePath ? 'border-purple-600' : 'border-gray-300'}`}></span>
            <span>CME SOFR Futures</span>
          </button>
        </div>

        {/* Summary Stat */}
        <div className="font-mono text-xs text-gray-800 font-bold shrink-0">
          Terminal Rate Easing: <span className="text-[#008A45]">-{totalEasingBps} bps</span> by {finalMeeting?.label}
        </div>
      </div>
    </div>
  );
};
