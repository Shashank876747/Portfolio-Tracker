import { StockQuote, ChartDataPoint, AIAnalysisResult } from '../types/portfolio';

export async function fetchStockQuote(symbol: string): Promise<StockQuote> {
  const res = await fetch(`/api/quote/${encodeURIComponent(symbol)}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch quote for ${symbol}`);
  }
  const data = await res.json();
  return data.quote;
}

export async function fetchBatchQuotes(symbols: string[]): Promise<Record<string, StockQuote>> {
  if (symbols.length === 0) return {};
  const query = symbols.join(',');
  const res = await fetch(`/api/quotes?symbols=${encodeURIComponent(query)}`);
  if (!res.ok) {
    throw new Error('Failed to fetch batch quotes');
  }
  const data = await res.json();
  const quoteMap: Record<string, StockQuote> = {};
  data.quotes.forEach((q: StockQuote) => {
    quoteMap[q.symbol.toUpperCase()] = q;
  });
  return quoteMap;
}

export async function fetchHistoricalData(symbol: string, range: string = '1M'): Promise<ChartDataPoint[]> {
  const res = await fetch(`/api/historical/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch historical data for ${symbol}`);
  }
  const data = await res.json();
  return data.points;
}

export async function searchTickers(query: string): Promise<StockQuote[]> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    return [];
  }
  const data = await res.json();
  return data.results || [];
}

export async function analyzePortfolioWithAI(
  holdings: any[],
  totalValue: number,
  portfolioName: string
): Promise<AIAnalysisResult> {
  const res = await fetch('/api/ai/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ holdings, totalValue, portfolioName })
  });
  if (!res.ok) {
    throw new Error('Failed to run AI portfolio analysis');
  }
  const data = await res.json();
  return data.analysis;
}
