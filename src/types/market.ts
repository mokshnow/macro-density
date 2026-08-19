export type MarketCategory = 'inflation' | 'gdp' | 'labor' | 'rates';

export type PricingMethodology = 'midpoint' | 'last_price';

export interface StrikeContract {
  ticker: string;
  title: string;
  strikeType: 'greater' | 'less' | 'between';
  floorStrike?: number;
  capStrike?: number;
  yesBid: number; // in cents e.g. 59 = $0.59
  yesAsk: number; // in cents
  lastPrice: number; // last traded price in cents e.g. 59%
  midpointPrice?: number; // order book top-of-book midpoint in cents
  noBid: number;
  noAsk: number;
  volume: number;
  openInterest: number;
  priceChange24h: number; // in percentage points e.g. +3.2%
  isIlliquid?: boolean; // true if strike had no quotes and was interpolated
  isEstimated?: boolean;
}

export interface DistributionBin {
  id: string;
  label: string; // e.g. "3.2% – 3.3%" or "< 2.8%" or "> 3.6%"
  rangeDisplay: string;
  lower: number; // numeric lower bound for math
  upper: number; // numeric upper bound for math
  midpoint: number;
  probability: number; // percentage e.g. 30.5% (0 to 100)
  cumulativeProb: number; // CDF value at upper bound e.g. 82.0%
  isMode: boolean;
  isTail: boolean;
  tailDirection?: 'left' | 'right';
  delta24h?: number;
  yesContractTicker?: string;
  marketPrice?: number;
}

export interface StatisticalMoments {
  mean: number; // Expected value E[X]
  median: number; // 50th percentile
  mode: number; // Peak outcome
  modeRange: string;
  stdDev: number; // Implied Volatility
  variance: number;
  skewness: number; // Positive = right skewed (upside risk), Negative = left skewed
  kurtosis: number; // Excess kurtosis
  var95: number; // 95% Value-at-Risk threshold
  cvar95: number; // True Conditional VaR / Expected Shortfall: E[X | X >= VaR95]
  upsideTailProb: number; // Probability strictly > +1.5 sigma
  downsideTailProb: number; // Probability strictly < -1.5 sigma
  interquartileRange: [number, number]; // [25th percentile, 75th percentile]
  confidence68: [number, number]; // 1-sigma bounds [p16, p84]
  confidence90: [number, number]; // 90% confidence bounds [p05, p95]
  confidence95: [number, number]; // 95% confidence bounds [p02.5, p97.5]
  entropy?: number; // Shannon differential information entropy
}

export interface ArbitrageOpportunity {
  lowerStrike: number;
  upperStrike: number;
  lowerPrice: number;
  upperPrice: number;
  spreadViolation: number; // in cents e.g. -3.5 cents
  description: string;
}

export interface FedMeetingProjection {
  meetingDate: string; // e.g. "Sep 16, 2026"
  label: string; // e.g. "Sep 2026"
  eventTicker: string; // e.g. "KXFED-26SEP"
  isCurrent?: boolean;
  expectedRate: number; // e.g. 5.12%
  medianRate: number; // e.g. 5.10%
  stdDev: number; // e.g. 0.18%
  confidence50: [number, number]; // 25th - 75th percentile (IQR)
  confidence68: [number, number]; // 16th - 84th percentile (1-sigma)
  confidence90: [number, number]; // 5th - 95th percentile
  cutProbability25bps: number; // % e.g. 78%
  cutProbability50bps: number; // % e.g. 14%
  pauseProbability: number; // % e.g. 8%
  hikeProbability: number; // % e.g. 0%
  cumulativeCutBps: number; // cumulative bps easing from current, e.g. -25, -75, -125
  fomcDots?: number[]; // individual participant dots from SEP
  fomcMedian?: number; // FOMC SEP median dot
  cmeImplied?: number; // CME SOFR futures rate
  priorMonthExpectedRate?: number; // 1 month ago market-implied rate
}

export interface ConsensusEstimate {
  source: string; // e.g. "Bloomberg Consensus", "Cleveland Fed Nowcast", "Wall Street Median"
  value: number;
  date: string;
  differenceFromKalshiMode: number;
  isStaticReference?: boolean; // indicates periodically published survey vs live market feed
  sourceType?: 'live_nowcast' | 'periodic_survey' | 'model';
}

export interface HistoricalSnapshot {
  id?: string;
  timestamp: string; // e.g. "Jul 15, 2026" or "May 2026"
  label?: string; // Short event label, e.g. "Jun CPI Print"
  date?: string; // ISO / display date
  headline?: string; // e.g. "June CPI cools to 3.0% YoY"
  catalystDescription?: string; // Macro catalyst narrative description
  mean: number; // Market-implied Expected Outcome
  median?: number;
  stdDev?: number; // Market uncertainty band
  skewness?: number; // Skewness at that time
  confidence68?: [number, number]; // [mean - stdDev, mean + stdDev]
  confidence90?: [number, number]; // 90% confidence corridor
  consensus?: number; // Institutional consensus benchmark at that time
  bins?: DistributionBin[]; // Optional full snapshot bins
  isLive?: boolean; // Indicates the live present snapshot
}

export interface MacroMarket {
  id: string;
  ticker: string;
  eventTicker: string;
  title: string;
  subtitle: string;
  category: MarketCategory;
  unit: string; // e.g. "%" or "k" or "bps"
  unitPrefix?: string;
  unitSuffix: string;
  kalshiUrl: string;
  settlementDate: string;
  releaseTime: string;
  sourceAgency: string; // e.g. "Bureau of Labor Statistics", "Bureau of Economic Analysis"
  status: 'active' | 'settled' | 'upcoming';
  totalVolume: number;
  totalOpenInterest: number;
  contracts: StrikeContract[];
  bins: DistributionBin[];
  moments: StatisticalMoments;
  consensus: ConsensusEstimate[];
  historicalForecastMean: { timestamp: string; mean: number }[];
  historicalSnapshots?: HistoricalSnapshot[];
  ratePath?: FedMeetingProjection[];
  pricingMethodology?: PricingMethodology;
  arbitrageOpportunities?: ArbitrageOpportunity[];
  hasIlliquidStrikes?: boolean;
  description: string;
  summary: string;
  lastUpdated?: string;
  isLive?: boolean;
  isSnapshot?: boolean;
  errorMessage?: string;
}
