export type MarketCategory = 'inflation' | 'gdp' | 'labor' | 'rates';

export interface StrikeContract {
  ticker: string;
  title: string;
  strikeType: 'greater' | 'less' | 'between';
  floorStrike?: number;
  capStrike?: number;
  yesBid: number; // in cents e.g. 59 = $0.59
  yesAsk: number; // in cents
  lastPrice: number; // implied probability percentage e.g. 59%
  noBid: number;
  noAsk: number;
  volume: number;
  openInterest: number;
  priceChange24h: number; // in percentage points e.g. +3.2%
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
  mean: number; // Expected value
  median: number; // 50th percentile
  mode: number; // Peak outcome
  modeRange: string;
  stdDev: number; // Implied Volatility
  variance: number;
  skewness: number; // Positive = right skewed (upside risk), Negative = left skewed
  kurtosis: number; // Fat-tail excess kurtosis
  var95: number; // 95% Value-at-Risk threshold
  cvar95: number; // Conditional VaR / Expected Shortfall
  upsideTailProb: number; // Probability > +1.5 sigma
  downsideTailProb: number; // Probability < -1.5 sigma
  interquartileRange: [number, number]; // [25th percentile, 75th percentile]
  confidence68: [number, number]; // 1-sigma bounds
  confidence90: [number, number]; // 90% confidence bounds
  confidence95: [number, number]; // 95% confidence bounds
}

export interface ConsensusEstimate {
  source: string; // e.g. "Bloomberg Consensus", "Cleveland Fed Nowcast", "Wall Street Median"
  value: number;
  date: string;
  differenceFromKalshiMode: number;
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
  description: string;
  summary: string;
}
