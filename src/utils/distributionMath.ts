import { DistributionBin, StatisticalMoments, StrikeContract, ArbitrageOpportunity, PricingMethodology } from '../types/market';

/**
 * Resolves the effective price in cents for a contract based on order book state.
 * Uses Bid/Ask Midpoint as primary standard or Last Traded Price when configured.
 */
export function resolveContractPrice(
  contract: StrikeContract,
  methodology: PricingMethodology = 'midpoint'
): { price: number; isEstimated: boolean } {
  const { yesBid, yesAsk, lastPrice } = contract;

  if (methodology === 'midpoint') {
    // If a valid two-sided quote exists (e.g. bid=32, ask=36)
    if (yesBid > 0 && yesAsk < 100 && yesAsk >= yesBid) {
      return { price: (yesBid + yesAsk) / 2, isEstimated: false };
    }
    // If one-sided bid exists
    if (yesBid > 0 && yesAsk >= 100) {
      return { price: yesBid, isEstimated: false };
    }
    // If one-sided ask exists
    if (yesBid <= 0 && yesAsk < 100) {
      return { price: yesAsk, isEstimated: false };
    }
    // Fall back to last traded price if within sensible bounds
    if (lastPrice > 0 && lastPrice < 100) {
      return { price: lastPrice, isEstimated: false };
    }
  } else {
    // Last traded price methodology
    if (lastPrice > 0 && lastPrice < 100) {
      return { price: lastPrice, isEstimated: false };
    }
    if (yesBid > 0 && yesAsk < 100 && yesAsk >= yesBid) {
      return { price: (yesBid + yesAsk) / 2, isEstimated: false };
    }
  }

  // If contract has zero bids, zero asks, and no trades, it is unquoted
  return { price: -1, isEstimated: true };
}

/**
 * Validates cumulative probabilities and enforces monotonicity via Pool-Adjacent-Violators Algorithm (PAVA).
 * Detects any crossed strike inversions P(X >= K1) < P(X >= K2) for K1 < K2 (arbitrage violations)
 * and returns both the flagged ArbitrageOpportunity list and the monotone reconstructed probabilities.
 */
export function enforceMonotonicCumulative(
  contracts: StrikeContract[],
  methodology: PricingMethodology = 'midpoint'
): {
  sortedContracts: StrikeContract[];
  rawCumulative: number[];
  monotoneCumulative: number[];
  arbitrageOpportunities: ArbitrageOpportunity[];
  hasIlliquidStrikes: boolean;
} {
  // Sort ascending by floor strike
  const sorted = [...contracts].sort((a, b) => (a.floorStrike ?? 0) - (b.floorStrike ?? 0));
  if (sorted.length === 0) {
    return { sortedContracts: [], rawCumulative: [], monotoneCumulative: [], arbitrageOpportunities: [], hasIlliquidStrikes: false };
  }

  let hasIlliquid = false;
  const rawCumulative: number[] = [];

  // 1. Resolve raw prices
  for (let i = 0; i < sorted.length; i++) {
    const c = sorted[i];
    const { price, isEstimated } = resolveContractPrice(c, methodology);
    if (isEstimated || price < 0) {
      hasIlliquid = true;
      c.isIlliquid = true;
      c.isEstimated = true;
    } else {
      c.midpointPrice = c.yesBid > 0 && c.yesAsk < 100 ? (c.yesBid + c.yesAsk) / 2 : c.lastPrice;
    }
    rawCumulative.push(price);
  }

  // 2. Interpolate unquoted illiquid strikes monotonically between neighbors
  for (let i = 0; i < rawCumulative.length; i++) {
    if (rawCumulative[i] < 0) {
      // Find left valid
      let leftVal = 100;
      for (let j = i - 1; j >= 0; j--) {
        if (rawCumulative[j] >= 0) {
          leftVal = rawCumulative[j];
          break;
        }
      }
      // Find right valid
      let rightVal = 0;
      for (let j = i + 1; j < rawCumulative.length; j++) {
        if (rawCumulative[j] >= 0) {
          rightVal = rawCumulative[j];
          break;
        }
      }
      rawCumulative[i] = Number(((leftVal + rightVal) / 2).toFixed(1));
    }
  }

  // 3. Detect Arbitrage Inversions: For cumulative binary calls P(X >= K), P must be non-increasing with K.
  const arbitrageOpportunities: ArbitrageOpportunity[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const k1 = sorted[i].floorStrike ?? 0;
    const k2 = sorted[i + 1].floorStrike ?? 0;
    const p1 = rawCumulative[i];
    const p2 = rawCumulative[i + 1];

    if (p1 < p2) {
      const spreadViolation = Number((p1 - p2).toFixed(1));
      arbitrageOpportunities.push({
        lowerStrike: k1,
        upperStrike: k2,
        lowerPrice: p1,
        upperPrice: p2,
        spreadViolation,
        description: `Strike ${k1} priced at ${p1}¢ is below Strike ${k2} at ${p2}¢ (${Math.abs(spreadViolation)}¢ calendar inversion).`,
      });
    }
  }

  // 4. Apply PAVA (Pool Adjacent Violators Algorithm) for isotonic non-increasing regression
  // Target: y_0 >= y_1 >= ... >= y_n
  // Equivalent to isotonic non-decreasing on -y
  const n = rawCumulative.length;
  const blocks: { weight: number; value: number; indices: number[] }[] = [];

  for (let i = 0; i < n; i++) {
    blocks.push({ weight: 1, value: rawCumulative[i], indices: [i] });

    // Pool while violation exists: current block value > previous block value (since we want non-increasing)
    while (blocks.length > 1 && blocks[blocks.length - 1].value > blocks[blocks.length - 2].value) {
      const b2 = blocks.pop()!;
      const b1 = blocks.pop()!;
      const totalWeight = b1.weight + b2.weight;
      const avgValue = (b1.value * b1.weight + b2.value * b2.weight) / totalWeight;
      blocks.push({
        weight: totalWeight,
        value: avgValue,
        indices: [...b1.indices, ...b2.indices],
      });
    }
  }

  const monotoneCumulative = new Array(n).fill(0);
  for (const block of blocks) {
    for (const idx of block.indices) {
      monotoneCumulative[idx] = Number(Math.max(0, Math.min(100, block.value)).toFixed(2));
    }
  }

  return {
    sortedContracts: sorted,
    rawCumulative,
    monotoneCumulative,
    arbitrageOpportunities,
    hasIlliquidStrikes: hasIlliquid,
  };
}

/**
 * Calculates discrete probability mass function (PMF) bins from cumulative Kalshi strikes.
 * Strictly derives non-negative density buckets without arbitrary 50% guesses.
 */
export function deriveBinsFromCumulativeStrikes(
  contracts: StrikeContract[],
  unitSuffix: string = '%',
  methodology: PricingMethodology = 'midpoint'
): {
  bins: DistributionBin[];
  arbitrageOpportunities: ArbitrageOpportunity[];
  hasIlliquidStrikes: boolean;
} {
  const { sortedContracts, monotoneCumulative, arbitrageOpportunities, hasIlliquidStrikes } =
    enforceMonotonicCumulative(contracts, methodology);

  if (sortedContracts.length === 0) {
    return { bins: [], arbitrageOpportunities: [], hasIlliquidStrikes: false };
  }

  const bins: DistributionBin[] = [];
  const first = sortedContracts[0];
  const step =
    sortedContracts.length > 1 && sortedContracts[1].floorStrike !== undefined && sortedContracts[0].floorStrike !== undefined
      ? sortedContracts[1].floorStrike - sortedContracts[0].floorStrike
      : 0.1;

  // Left tail: Outcome <= lowest strike
  const lowestStrike = first.floorStrike ?? 0;
  const pAboveFirst = monotoneCumulative[0];
  const leftTailProb = Math.max(0, 100 - pAboveFirst);

  bins.push({
    id: 'bin-left-tail',
    label: `< ${lowestStrike.toFixed(1)}${unitSuffix}`,
    rangeDisplay: `≤ ${lowestStrike.toFixed(1)}${unitSuffix}`,
    lower: Number((lowestStrike - step * 1.5).toFixed(2)),
    upper: Number(lowestStrike.toFixed(2)),
    midpoint: Number((lowestStrike - step * 0.5).toFixed(2)),
    probability: Number(leftTailProb.toFixed(2)),
    cumulativeProb: Number(leftTailProb.toFixed(2)),
    isMode: false,
    isTail: true,
    tailDirection: 'left',
    delta24h: first.priceChange24h ? -first.priceChange24h : 0,
  });

  // Intermediate strike buckets: P(K_i < X <= K_{i+1}) = P(X >= K_i) - P(X >= K_{i+1})
  for (let i = 0; i < sortedContracts.length - 1; i++) {
    const current = sortedContracts[i];
    const next = sortedContracts[i + 1];
    const lower = current.floorStrike ?? 0;
    const upper = next.floorStrike ?? lower + step;
    const prob = Math.max(0, monotoneCumulative[i] - monotoneCumulative[i + 1]);

    bins.push({
      id: `bin-${i}`,
      label: `${lower.toFixed(1)}${unitSuffix} – ${upper.toFixed(1)}${unitSuffix}`,
      rangeDisplay: `${lower.toFixed(1)}${unitSuffix} to ${upper.toFixed(1)}${unitSuffix}`,
      lower: Number(lower.toFixed(2)),
      upper: Number(upper.toFixed(2)),
      midpoint: Number(((lower + upper) / 2).toFixed(2)),
      probability: Number(prob.toFixed(2)),
      cumulativeProb: 0, // computed during normalization pass
      isMode: false,
      isTail: false,
      delta24h: (current.priceChange24h || 0) - (next.priceChange24h || 0),
      yesContractTicker: current.ticker,
      marketPrice: monotoneCumulative[i],
    });
  }

  // Right tail: Outcome > highest strike
  const last = sortedContracts[sortedContracts.length - 1];
  const highestStrike = last.floorStrike ?? 0;
  const rightTailProb = Math.max(0, monotoneCumulative[monotoneCumulative.length - 1]);

  bins.push({
    id: 'bin-right-tail',
    label: `> ${highestStrike.toFixed(1)}${unitSuffix}`,
    rangeDisplay: `> ${highestStrike.toFixed(1)}${unitSuffix}`,
    lower: Number(highestStrike.toFixed(2)),
    upper: Number((highestStrike + step * 1.5).toFixed(2)),
    midpoint: Number((highestStrike + step * 0.5).toFixed(2)),
    probability: Number(rightTailProb.toFixed(2)),
    cumulativeProb: 100,
    isMode: false,
    isTail: true,
    tailDirection: 'right',
    delta24h: last.priceChange24h || 0,
    yesContractTicker: last.ticker,
    marketPrice: rightTailProb,
  });

  // Normalize discrete probabilities to sum to exactly 100%
  const rawSum = bins.reduce((acc, b) => acc + b.probability, 0);
  if (rawSum > 0) {
    let runningCumulative = 0;
    bins.forEach((bin) => {
      bin.probability = Number(((bin.probability / rawSum) * 100).toFixed(2));
      runningCumulative += bin.probability;
      bin.cumulativeProb = Number(Math.min(100, runningCumulative).toFixed(2));
    });
  }

  // Identify peak modal outcome
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

  return {
    bins,
    arbitrageOpportunities,
    hasIlliquidStrikes,
  };
}

/**
 * Calculates statistical moments, quantile bands, true CVaR Expected Shortfall,
 * Shannon Entropy, and tail integrals from PMF bins.
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
      modeRange: '0' + unitSuffix,
      stdDev: 0,
      variance: 0,
      skewness: 0,
      kurtosis: 0,
      entropy: 0,
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

  // 1. Mean (Expected Value E[X])
  const mean = bins.reduce((sum, b, i) => sum + b.midpoint * weights[i], 0);

  // 2. Variance & Standard Deviation
  const variance = bins.reduce((sum, b, i) => sum + Math.pow(b.midpoint - mean, 2) * weights[i], 0);
  const stdDev = Math.sqrt(variance);

  // 3. Skewness
  const m3 = bins.reduce((sum, b, i) => sum + Math.pow(b.midpoint - mean, 3) * weights[i], 0);
  const skewness = stdDev > 0 ? m3 / Math.pow(stdDev, 3) : 0;

  // 4. Excess Kurtosis
  const m4 = bins.reduce((sum, b, i) => sum + Math.pow(b.midpoint - mean, 4) * weights[i], 0);
  const kurtosis = stdDev > 0 ? m4 / Math.pow(stdDev, 4) - 3 : 0;

  // 5. Shannon Differential Entropy (in bits)
  let entropy = 0;
  bins.forEach((b) => {
    const p = b.probability / 100;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  });

  // Modal Peak
  const modeBin = bins.find((b) => b.isMode) || bins[0];
  const mode = modeBin.midpoint;
  const modeRange = modeBin.label;

  // Continuous Quantile Interpolation from cumulative distribution
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

  const p025 = interpolatePercentile(2.5);
  const p05 = interpolatePercentile(5);
  const p16 = interpolatePercentile(16);
  const median = interpolatePercentile(50);
  const p25 = interpolatePercentile(25);
  const p75 = interpolatePercentile(75);
  const p84 = interpolatePercentile(84);
  const p95 = interpolatePercentile(95);
  const p975 = interpolatePercentile(97.5);

  const var95 = p95;

  // 6. True Conditional Value at Risk (CVaR95 / Expected Shortfall): E[X | X >= VaR95]
  let cvarSum = 0;
  let cvarWeight = 0;

  bins.forEach((b) => {
    if (b.upper > var95) {
      if (b.lower >= var95) {
        // Entire bin is above VaR95
        const w = b.probability / 100;
        cvarSum += b.midpoint * w;
        cvarWeight += w;
      } else {
        // Bin straddles VaR95: interpolate fraction strictly above VaR95
        const span = b.upper - b.lower;
        const fraction = span > 0 ? (b.upper - var95) / span : 1;
        const subMidpoint = (var95 + b.upper) / 2;
        const w = (b.probability / 100) * fraction;
        cvarSum += subMidpoint * w;
        cvarWeight += w;
      }
    }
  });

  const cvar95 = cvarWeight > 0 ? cvarSum / cvarWeight : var95;

  // 7. Rigorous Tail Probabilities (> mean + 1.5*stdDev and < mean - 1.5*stdDev)
  const highThreshold = mean + 1.5 * stdDev;
  const lowThreshold = mean - 1.5 * stdDev;

  let upsideTailProb = 0;
  let downsideTailProb = 0;

  bins.forEach((b) => {
    // Upper tail mass
    if (b.lower >= highThreshold) {
      upsideTailProb += b.probability;
    } else if (b.upper > highThreshold) {
      const span = b.upper - b.lower;
      const frac = span > 0 ? (b.upper - highThreshold) / span : 0;
      upsideTailProb += b.probability * frac;
    }

    // Lower tail mass
    if (b.upper <= lowThreshold) {
      downsideTailProb += b.probability;
    } else if (b.lower < lowThreshold) {
      const span = b.upper - b.lower;
      const frac = span > 0 ? (lowThreshold - b.lower) / span : 0;
      downsideTailProb += b.probability * frac;
    }
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
    entropy: Number(entropy.toFixed(2)),
    var95: Number(var95.toFixed(2)),
    cvar95: Number(cvar95.toFixed(2)),
    upsideTailProb: Number(Math.max(0.1, Math.min(99.9, upsideTailProb)).toFixed(1)),
    downsideTailProb: Number(Math.max(0.1, Math.min(99.9, downsideTailProb)).toFixed(1)),
    interquartileRange: [Number(p25.toFixed(2)), Number(p75.toFixed(2))],
    confidence68: [Number(p16.toFixed(2)), Number(p84.toFixed(2))],
    confidence90: [Number(p05.toFixed(2)), Number(p95.toFixed(2))],
    confidence95: [Number(p025.toFixed(2)), Number(p975.toFixed(2))],
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
