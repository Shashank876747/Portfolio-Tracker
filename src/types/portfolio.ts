export type AssetClass = 'Stock' | 'ETF' | 'Crypto' | 'Cash';

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  previousClose: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  avgVolume: number;
  marketCap: number;
  peRatio?: number;
  dividendYield?: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  sector: string;
  assetClass: AssetClass;
  lastUpdated: string;
}

export type TransactionType = 'BUY' | 'SELL' | 'DIVIDEND' | 'DEPOSIT' | 'WITHDRAWAL';
export type ImportSource = 'MANUAL' | 'ROBINHOOD' | 'GOOGLE_FINANCE';

export interface Transaction {
  id: string;
  portfolioId: string;
  symbol: string;
  type: TransactionType;
  shares: number;
  price: number;
  date: string; // ISO date string (YYYY-MM-DD or full timestamp)
  fees?: number;
  totalAmount?: number;
  notes?: string;
  source: ImportSource;
  importedAt?: string;
}

export interface Holding {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  averageCost: number;
  totalCost: number;
  currentPrice: number;
  previousClose: number;
  dayGain: number;
  dayGainPercent: number;
  marketValue: number;
  unrealizedGain: number;
  unrealizedGainPercent: number;
  weightPercent: number;
  sector: string;
  assetClass: AssetClass;
  peRatio?: number;
  dividendYield?: number;
  sparkline?: number[];
  priceDirection?: 'up' | 'down' | 'neutral';
  lastUpdated: string;
}

export interface Portfolio {
  id: string;
  name: string;
  description?: string;
  sourceTag?: 'MAIN' | 'ROBINHOOD' | 'GOOGLE_FINANCE' | 'CUSTOM';
  cashBalance: number;
  createdAt: string;
  updatedAt: string;
  transactions: Transaction[];
}

export interface ChartDataPoint {
  time: string;
  timestamp: number;
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  benchmarkPrice?: number;
}

export interface AIAnalysisResult {
  healthScore: number;
  verdict: string;
  diversificationRating: string;
  betaEstimate: string;
  strengths: string[];
  risks: string[];
  recommendations: string[];
  engine?: string;
  notice?: string;
}
