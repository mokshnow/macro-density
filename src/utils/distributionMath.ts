import { DistributionBin, StatisticalMoments, StrikeContract } from '../types/market';

/**
 * Calculates discrete probability mass function (PMF) bins from cumulative Kalshi strikes.
 * Example:
 * P(CPI > 3.2%) = 89%
 * P(CPI > 3.3%) = 59%
 * P(CPI > 3.4%) = 18%
 * => P(<= 3.2%) = 11%
 * => P(3.2% < CPI <= 3.3%) = 30%
 * => P(3.3% < CPI <= 3.4%) = 41%
 * => P(> 3.4%) = 18%
 */
export function deriveBinsFromCumulativeStrikes(
  contracts: StrikeContract[],
  unitSuffix: string = '%'
): DistributionBin[] {
  // Sort contracts by floor strike ascending
  const sorted = [...contracts].sort((a, b) => (a.floorStrike ?? 0) - (b.floorStrike ?? 0));
  
  if (sorted.length === 0) return [];

  const bins: DistributionBin[] = [];
  const first = sorted[0];
  const step = sorted.length > 1 && sorted[1].floorStrike && sorted[0].floorStrike
    ? (sorted[1].floorStrike - sorted[0].floorStrike)
    : 0.1;

  // Left tail: Outcome <= lowest strike
  const lowestStrike = first.floorStrike ?? 0;
  const leftTailProb = Math.max(0, 100 - first.lastPrice);
  bins.push({
    id: `bin-left-tail`,
    label: `< ${lowestStrike.toFixed(1)}${unitSuffix}`,
    rangeDisplay: `≤ ${lowestStrike.toFixed(1)}${unitSuffix}`,
    lower: lowestStrike - step * 1.5,
    upper: lowestStrike,
    midpoint: lowestStrike - step * 0.5,
    probability: Number(leftTailProb.toFixed(1)),
    cumulativeProb: Number(leftTailProb.toFixed(1)),
    isMode: false,
    isTail: true,
    tailDirection: 'left',
    delta24h: first.priceChange24h ? -first.priceChange24h : 0,
  });

  // Intermediate intervals
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    const lower = current.floorStrike ?? 0;
    const upper = next.floorStrike ?? lower + step;
    const prob = Math.max(0, current.lastPrice - next.lastPrice);

    bins.push({
      id: `bin-${i}`,
      label: `${lower.toFixed(1)}${unitSuffix} – ${upper.toFixed(1)}${unitSuffix}`,
      rangeDisplay: `${lower.toFixed(1)}${unitSuffix} to ${upper.toFixed(1)}${unitSuffix}`,
      lower,
      upper,
      midpoint: (lower + upper) / 2,
      probability: Number(prob.toFixed(1)),
      cumulativeProb: 0, // calculated in second pass
      isMode: false,
      isTail: false,
      delta24h: current.priceChange24h - (next.priceChange24h || 0),
      yesContractTicker: current.ticker,
      marketPrice: current.lastPrice,
    });
  }

  // Right tail: Outcome > highest strike
  const last = sorted[sorted.length - 1];
  const highestStrike = last.floorStrike ?? 0;
  const rightTailProb = Math.max(0, last.lastPrice);
  bins.push({
    id: `bin-right-tail`,
    label: `> ${highestStrike.toFixed(1)}${unitSuffix}`,
    rangeDisplay: `> ${highestStrike.toFixed(1)}${unitSuffix}`,
    lower: highestStrike,
    upper: highestStrike + step * 1.5,
    midpoint: highestStrike + step * 0.5,
    probability: Number(rightTailProb.toFixed(1)),
    cumulativeProb: 100,
    isMode: false,
    isTail: true,
    tailDirection: 'right',
    delta24h: last.priceChange24h,
    yesContractTicker: last.ticker,
    marketPrice: last.lastPrice,
  });

  // Normalize probabilities so sum is 100%
  const rawSum = bins.reduce((acc, b) => acc + b.probability, 0);
  if (rawSum > 0) {
    let runningCumulative = 0;
    bins.forEach((bin) => {
      bin.probability = Number(((bin.probability / rawSum) * 100).toFixed(1));
      runningCumulative += bin.probability;
      bin.cumulativeProb = Number(Math.min(100, runningCumulative).toFixed(1));
    });
  }

  // Identify the mode (highest probability bin)
  let maxProb = -1;
  let modeIndex = -1;
  bins.forEach((b, idx) => {
    if (b.probability > maxProb) {
      maxProb = b.probability;
      modeIndex = idx;
    }
  });

  if (modeIndex >= 0) {
    bins[modeIndex].isMode = true;
  }

  return bins;
}

/**
 * Calculates statistical moments (Expected Value, Volatility, Skewness, Kurtosis, VaR) from PMF bins.
 */
export function calculateStatisticalMoments(
  bins: DistributionBin[],
  unitSuffix: string = '%'
): StatisticalMoments {
  if (bins.length === 0) {
    return {
      mean: 0,
      median: 0,
      mode: 0,
      modeRange: '0%',
      stdDev: 0,
      variance: 0,
      skewness: 0,
      kurtosis: 0,
      var95: 0,
      cvar95: 0,
      upsideTailProb: 0,
      downsideTailProb: 0,
      interquartileRange: [0, 0],
      confidence68: [0, 0],
      confidence90: [0, 0],
      confidence95: [0, 0],
    };
  }

  // Normalize weights
  const totalProb = bins.reduce((sum, b) => sum + b.probability, 0);
  const weights = bins.map((b) => b.probability / (totalProb || 1));

  // 1. Mean (Expected Value)
  const mean = bins.reduce((sum, b, i) => sum + b.midpoint * weights[i], 0);

  // 2. Variance and Standard Deviation
  const variance = bins.reduce((sum, b, i) => sum + Math.pow(b.midpoint - mean, 2) * weights[i], 0);
  const stdDev = Math.sqrt(variance);

  // 3. Skewness
  const m3 = bins.reduce((sum, b, i) => sum + Math.pow(b.midpoint - mean, 3) * weights[i], 0);
  const skewness = stdDev > 0 ? m3 / Math.pow(stdDev, 3) : 0;

  // 4. Kurtosis (Excess)
  const m4 = bins.reduce((sum, b, i) => sum + Math.pow(b.midpoint - mean, 4) * weights[i], 0);
  const kurtosis = stdDev > 0 ? m4 / Math.pow(stdDev, 4) - 3 : 0;

  // Mode
  const modeBin = bins.find((b) => b.isMode) || bins[0];
  const mode = modeBin.midpoint;
  const modeRange = modeBin.label;

  // Interpolate Percentiles from CDF
  const interpolatePercentile = (targetPct: number): number => {
    let runningProb = 0;
    for (let i = 0; i < bins.length; i++) {
      const b = bins[i];
      const prevProb = runningProb;
      runningProb += b.probability;
      if (runningProb >= targetPct || i === bins.length - 1) {
        const binFraction = b.probability > 0 ? (targetPct - prevProb) / b.probability : 0.5;
        const clampedFraction = Math.max(0, Math.min(1, binFraction));
        return b.lower + (b.upper - b.lower) * clampedFraction;
      }
    }
    return bins[bins.length - 1].midpoint;
  };

  const p05 = interpolatePercentile(5);
  const p16 = interpolatePercentile(16);
  const median = interpolatePercentile(50);
  const p25 = interpolatePercentile(25);
  const p75 = interpolatePercentile(75);
  const p84 = interpolatePercentile(84);
  const p95 = interpolatePercentile(95);

  // Value at Risk & CVaR (e.g. adverse right-tail for inflation / adverse left-tail for GDP)
  const var95 = p95;
  
  // Conditional VaR (Expected shortfall in top 5% tail)
  let cvarSum = 0;
  let cvarWeight = 0;
  bins.forEach((b, i) => {
    if (b.upper >= p95) {
      cvarSum += b.midpoint * weights[i];
      cvarWeight += weights[i];
    }
  });
  const cvar95 = cvarWeight > 0 ? cvarSum / cvarWeight : p95;

  // Upside and Downside Tail Probs (> +1.5 stdDev / < -1.5 stdDev)
  const highThreshold = mean + 1.5 * stdDev;
  const lowThreshold = mean - 1.5 * stdDev;

  let upsideTailProb = 0;
  let downsideTailProb = 0;

  bins.forEach((b) => {
    if (b.midpoint >= highThreshold) upsideTailProb += b.probability;
    if (b.midpoint <= lowThreshold) downsideTailProb += b.probability;
  });

  return {
    mean: Number(mean.toFixed(2)),
    median: Number(median.toFixed(2)),
    mode: Number(mode.toFixed(2)),
    modeRange,
    stdDev: Number(stdDev.toFixed(2)),
    variance: Number(variance.toFixed(4)),
    skewness: Number(skewness.toFixed(2)),
    kurtosis: Number(kurtosis.toFixed(2)),
    var95: Number(var95.toFixed(2)),
    cvar95: Number(cvar95.toFixed(2)),
    upsideTailProb: Number(upsideTailProb.toFixed(1)),
    downsideTailProb: Number(downsideTailProb.toFixed(1)),
    interquartileRange: [Number(p25.toFixed(2)), Number(p75.toFixed(2))],
    confidence68: [Number(p16.toFixed(2)), Number(p84.toFixed(2))],
    confidence90: [Number(p05.toFixed(2)), Number(p95.toFixed(2))],
    confidence95: [Number(p05.toFixed(2)), Number(p95.toFixed(2))],
  };
}

/**
 * Generates continuous smooth points for rendering SVG density curves (KDE-style).
 */
export function generateSmoothedDensityPoints(
  bins: DistributionBin[],
  numPoints: number = 100
): { x: number; density: number; cumulative: number }[] {
  if (bins.length === 0) return [];

  const minX = bins[0].lower;
  const maxX = bins[bins.length - 1].upper;
  const range = maxX - minX;
  const bandwidth = (bins[1]?.lower - bins[0]?.lower || range / bins.length) * 0.8;

  const points: { x: number; density: number; cumulative: number }[] = [];
  const dx = range / (numPoints - 1);

  // Kernel density approximation over discrete mass points
  for (let i = 0; i < numPoints; i++) {
    const x = minX + i * dx;
    let density = 0;

    bins.forEach((b) => {
      // Gaussian kernel
      const u = (x - b.midpoint) / (bandwidth || 0.1);
      const k = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * u * u);
      density += (b.probability / 100) * (k / (bandwidth || 0.1));
    });

    // Approximate cumulative probability up to x
    let cumulative = 0;
    bins.forEach((b) => {
      if (x >= b.upper) {
        cumulative += b.probability;
      } else if (x > b.lower) {
        cumulative += b.probability * ((x - b.lower) / (b.upper - b.lower));
      }
    });

    points.push({
      x: Number(x.toFixed(3)),
      density: Math.max(0, density),
      cumulative: Math.min(100, Math.max(0, cumulative)),
    });
  }

  // Normalize peak density for scaling
  const maxDensity = Math.max(...points.map((p) => p.density), 0.001);
  return points.map((p) => ({
    ...p,
    density: (p.density / maxDensity) * 100, // scaled 0 to 100
  }));
}
