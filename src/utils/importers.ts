import Papa from 'papaparse';
import { Transaction, TransactionType, ImportSource } from '../types/portfolio';

export interface ParsedImportRow {
  symbol: string;
  name?: string;
  type: TransactionType;
  shares: number;
  price: number;
  date: string;
  fees?: number;
  totalAmount?: number;
  notes?: string;
  raw: Record<string, any>;
}

export interface ImportSummary {
  source: ImportSource;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  symbols: string[];
  totalInvested: number;
  positions: Array<{
    symbol: string;
    shares: number;
    averagePrice: number;
    totalCost: number;
    transactionCount: number;
  }>;
  transactions: Transaction[];
  errors: string[];
}

// Clean currency and numeric strings like "$1,245.50" or "( $50.00 )"
export function cleanNumber(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const str = String(val).trim();
  const isNegative = str.startsWith('-') || (str.startsWith('(') && str.endsWith(')'));
  const cleaned = str.replace(/[$,()]/g, '').trim();
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  return isNegative ? -Math.abs(num) : num;
}

// Standardize dates to YYYY-MM-DD
export function cleanDate(val: any): string {
  if (!val) return new Date().toISOString().split('T')[0];
  const str = String(val).trim();
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  // Try MM/DD/YYYY
  const parts = str.split(/[/.-]/);
  if (parts.length === 3) {
    if (parts[2].length === 4) {
      // MM/DD/YYYY
      return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    }
  }
  return new Date().toISOString().split('T')[0];
}

// -------------------------------------------------------------
// ROBINHOOD CSV PARSER
// -------------------------------------------------------------
export function parseRobinhoodCSV(csvContent: string, portfolioId: string = 'portfolio-rh'): ImportSummary {
  const result = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase()
  });

  const errors: string[] = [];
  const transactions: Transaction[] = [];

  const rows = result.data;
  if (!rows || rows.length === 0) {
    return {
      source: 'ROBINHOOD',
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      symbols: [],
      totalInvested: 0,
      positions: [],
      transactions: [],
      errors: ['No data rows found in the provided CSV file.']
    };
  }

  // Detect format variants:
  // Variant 1: Account Activity CSV (Activity Date, Process Date, Instrument, Description, Trans Code, Quantity, Price, Amount)
  // Variant 2: Order History CSV (order_id, symbol, side, price, quantity, average_price, created_at, state)
  // Variant 3: Holdings CSV (symbol, name, shares, average cost, current price, equity, total return)

  rows.forEach((row, index) => {
    try {
      // Extract symbol / instrument
      let symbol = (
        row['instrument'] ||
        row['symbol'] ||
        row['ticker'] ||
        row['asset'] ||
        row['security'] ||
        ''
      ).trim().toUpperCase();

      // Clean common ticker notes like "AAPL - Apple Inc"
      if (symbol.includes(' ')) {
        symbol = symbol.split(' ')[0].replace(/[^A-Z0-9.-]/g, '');
      }

      // If empty symbol, check description (sometimes Robinhood writes "Apple Inc. (AAPL)")
      if (!symbol && row['description']) {
        const desc = row['description'];
        const match = desc.match(/\b([A-Z]{1,5})\b/);
        if (match) symbol = match[1];
      }

      if (!symbol) {
        // Might be a cash deposit or interest
        const transCode = (row['trans code'] || row['type'] || row['side'] || '').toLowerCase();
        if (transCode.includes('ach') || transCode.includes('deposit')) {
          const amount = Math.abs(cleanNumber(row['amount'] || row['price']));
          if (amount > 0) {
            transactions.push({
              id: `rh-tx-${index}-${Date.now()}`,
              portfolioId,
              symbol: 'USD',
              type: 'DEPOSIT',
              shares: amount,
              price: 1,
              totalAmount: amount,
              date: cleanDate(row['activity date'] || row['date'] || row['settle date']),
              notes: 'Robinhood ACH Deposit / Cash Transfer',
              source: 'ROBINHOOD',
              importedAt: new Date().toISOString()
            });
          }
        }
        return;
      }

      // Determine transaction type
      let type: TransactionType = 'BUY';
      const transCode = (
        row['trans code'] ||
        row['side'] ||
        row['type'] ||
        row['action'] ||
        ''
      ).toLowerCase();

      if (transCode.includes('sell') || transCode.includes('sl')) {
        type = 'SELL';
      } else if (transCode.includes('div') || transCode.includes('cdiv')) {
        type = 'DIVIDEND';
      } else if (transCode.includes('buy') || transCode.includes('by') || transCode.includes('holding')) {
        type = 'BUY';
      } else if (row['shares'] || row['quantity']) {
        // Default to BUY for holdings files
        type = 'BUY';
      }

      // Quantity / shares
      const shares = Math.abs(cleanNumber(row['quantity'] || row['shares'] || row['qty'] || 0));
      if (shares <= 0 && type !== 'DIVIDEND') return;

      // Price / average cost
      let price = Math.abs(cleanNumber(
        row['price'] ||
        row['average_price'] ||
        row['average cost'] ||
        row['avg cost'] ||
        row['cost basis per share'] ||
        row['purchase price'] ||
        0
      ));

      // Total amount
      let totalAmount = Math.abs(cleanNumber(row['amount'] || row['total'] || row['equity'] || (shares * price)));
      if (price === 0 && shares > 0 && totalAmount > 0) {
        price = +(totalAmount / shares).toFixed(2);
      }

      const date = cleanDate(
        row['activity date'] ||
        row['settle date'] ||
        row['process date'] ||
        row['created_at'] ||
        row['date'] ||
        row['timestamp']
      );

      transactions.push({
        id: `rh-tx-${index}-${Date.now()}`,
        portfolioId,
        symbol,
        type,
        shares,
        price,
        totalAmount,
        date,
        notes: row['description'] || 'Imported from Robinhood',
        source: 'ROBINHOOD',
        importedAt: new Date().toISOString()
      });
    } catch (e: any) {
      errors.push(`Row ${index + 1}: ${e.message}`);
    }
  });

  return aggregateTransactionsSummary(transactions, 'ROBINHOOD', rows.length, errors);
}

// -------------------------------------------------------------
// GOOGLE FINANCE CSV & SHEETS PARSER
// -------------------------------------------------------------
export function parseGoogleFinanceCSV(csvContent: string, portfolioId: string = 'portfolio-gf'): ImportSummary {
  // Support both comma-separated and tab-separated (from Google Sheets copy-paste)
  const isTSV = csvContent.includes('\t') && !csvContent.includes(',');
  const result = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    delimiter: isTSV ? '\t' : undefined,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase()
  });

  const errors: string[] = [];
  const transactions: Transaction[] = [];
  const rows = result.data;

  if (!rows || rows.length === 0) {
    return {
      source: 'GOOGLE_FINANCE',
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      symbols: [],
      totalInvested: 0,
      positions: [],
      transactions: [],
      errors: ['No records could be parsed from Google Finance input.']
    };
  }

  rows.forEach((row, index) => {
    try {
      // Google Finance columns: Symbol, Name, Shares, Purchase Price, Commission, Currency, Notes
      // Or Google Sheets table: Symbol, Shares, Price, Date
      let rawSymbol = (
        row['symbol'] ||
        row['ticker'] ||
        row['code'] ||
        row['asset'] ||
        ''
      ).trim().toUpperCase();

      // Clean prefix e.g. "NASDAQ:AAPL" -> "AAPL", "NYSE:BRK.B" -> "BRK.B"
      if (rawSymbol.includes(':')) {
        rawSymbol = rawSymbol.split(':')[1];
      }

      if (!rawSymbol) return;

      const shares = Math.abs(cleanNumber(row['shares'] || row['quantity'] || row['units'] || 1));
      const price = Math.abs(cleanNumber(row['purchase price'] || row['price'] || row['cost per share'] || row['avg cost'] || 0));
      const commission = cleanNumber(row['commission'] || row['fee'] || 0);
      const date = cleanDate(row['purchase date'] || row['date'] || row['acquired date']);
      const totalAmount = (shares * price) + commission;

      transactions.push({
        id: `gf-tx-${index}-${Date.now()}`,
        portfolioId,
        symbol: rawSymbol,
        type: 'BUY',
        shares,
        price,
        fees: commission,
        totalAmount,
        date,
        notes: row['notes'] || row['name'] || 'Imported from Google Finance',
        source: 'GOOGLE_FINANCE',
        importedAt: new Date().toISOString()
      });
    } catch (e: any) {
      errors.push(`Row ${index + 1}: ${e.message}`);
    }
  });

  return aggregateTransactionsSummary(transactions, 'GOOGLE_FINANCE', rows.length, errors);
}

// -------------------------------------------------------------
// HELPER TO AGGREGATE LOTS & COST BASIS
// -------------------------------------------------------------
function aggregateTransactionsSummary(
  transactions: Transaction[],
  source: ImportSource,
  totalRows: number,
  errors: string[]
): ImportSummary {
  const positionMap = new Map<string, { shares: number; totalCost: number; count: number }>();

  // Sort by date ascending to process buys & sells sequentially
  const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  sorted.forEach(tx => {
    if (tx.symbol === 'USD') return;
    const current = positionMap.get(tx.symbol) || { shares: 0, totalCost: 0, count: 0 };
    current.count += 1;

    if (tx.type === 'BUY') {
      current.shares += tx.shares;
      current.totalCost += (tx.shares * tx.price) + (tx.fees || 0);
    } else if (tx.type === 'SELL') {
      const avgCostBefore = current.shares > 0 ? (current.totalCost / current.shares) : tx.price;
      current.shares = Math.max(0, current.shares - tx.shares);
      current.totalCost = current.shares * avgCostBefore;
    }
    positionMap.set(tx.symbol, current);
  });

  const positions = Array.from(positionMap.entries())
    .filter(([_, data]) => data.shares > 0)
    .map(([symbol, data]) => ({
      symbol,
      shares: +data.shares.toFixed(4),
      averagePrice: +(data.totalCost / data.shares).toFixed(2),
      totalCost: +data.totalCost.toFixed(2),
      transactionCount: data.count
    }));

  const symbols = positions.map(p => p.symbol);
  const totalInvested = positions.reduce((acc, p) => acc + p.totalCost, 0);

  return {
    source,
    totalRows,
    validRows: transactions.length,
    invalidRows: Math.max(0, totalRows - transactions.length),
    symbols,
    totalInvested: +totalInvested.toFixed(2),
    positions,
    transactions,
    errors
  };
}

// -------------------------------------------------------------
// REALISTIC SAMPLE CSV DATA FOR TESTING ROBINHOOD & GOOGLE FINANCE
// -------------------------------------------------------------
export const SAMPLE_ROBINHOOD_CSV = `Activity Date,Process Date,Settle Date,Instrument,Description,Trans Code,Quantity,Price,Amount
01/15/2024,01/15/2024,01/17/2024,AAPL,Apple Inc. - Common Stock,Buy,15.000000,$185.92,-$2788.80
02/10/2024,02/10/2024,02/12/2024,NVDA,NVIDIA Corporation - Common Stock,Buy,35.000000,$98.40,-$3444.00
03/05/2024,03/05/2024,03/07/2024,MSFT,Microsoft Corporation - Common Stock,Buy,8.000000,$405.20,-$3241.60
03/22/2024,03/22/2024,03/24/2024,TSLA,Tesla Inc. - Common Stock,Buy,12.000000,$218.50,-$2622.00
04/18/2024,04/18/2024,04/20/2024,BTC,Bitcoin,Buy,0.085000,$63500.00,-$5397.50
05/12/2024,05/12/2024,05/14/2024,PLTR,Palantir Technologies Inc.,Buy,75.000000,$22.40,-$1680.00
06/02/2024,06/02/2024,06/04/2024,SPY,SPDR S&P 500 ETF Trust,Buy,10.000000,$525.10,-$5251.00
07/15/2024,07/15/2024,07/17/2024,AAPL,Apple Inc. Cash Dividend,CDIV,15.000000,$0.25,$3.75
08/20/2024,08/20/2024,08/22/2024,NVDA,NVIDIA Corporation - Common Stock,Sell,5.000000,$128.50,$642.50`;

export const SAMPLE_GOOGLE_FINANCE_CSV = `Symbol,Name,Shares,Purchase Price,Commission,Currency,Notes
GOOGL,Alphabet Inc. Class A,25,148.50,0.00,USD,Core AI & Search
AMZN,Amazon.com Inc.,18,172.30,0.00,USD,Cloud & E-Commerce
META,Meta Platforms Inc.,10,480.00,0.00,USD,Social & AI Metaverse
QQQ,Invesco QQQ Trust,15,445.60,0.00,USD,Tech Core Holding
VOO,Vanguard S&P 500 ETF,20,490.20,0.00,USD,Broad Market Index
JPM,JPMorgan Chase & Co.,14,195.40,0.00,USD,Banking & Value`;

// Export current portfolio to Robinhood or Google Finance compatible format
export function exportToCSV(holdings: Array<{ symbol: string; name: string; shares: number; averageCost: number; currentPrice: number; marketValue: number; unrealizedGain: number }>, format: 'STANDARD' | 'GOOGLE_FINANCE' | 'ROBINHOOD'): string {
  if (format === 'GOOGLE_FINANCE') {
    const data = holdings.map(h => ({
      'Symbol': h.symbol,
      'Name': h.name,
      'Shares': h.shares,
      'Purchase Price': h.averageCost,
      'Commission': '0.00',
      'Currency': 'USD',
      'Notes': 'Exported from ApexPortfolio'
    }));
    return Papa.unparse(data);
  }

  if (format === 'ROBINHOOD') {
    const data = holdings.map(h => ({
      'Symbol': h.symbol,
      'Name': h.name,
      'Shares': h.shares,
      'Average Cost': `$${h.averageCost.toFixed(2)}`,
      'Current Price': `$${h.currentPrice.toFixed(2)}`,
      'Equity': `$${h.marketValue.toFixed(2)}`,
      'Total Return': `$${h.unrealizedGain.toFixed(2)}`
    }));
    return Papa.unparse(data);
  }

  // Standard universal CSV
  const data = holdings.map(h => ({
    'Symbol': h.symbol,
    'Name': h.name,
    'Shares': h.shares,
    'Average Cost Basis': h.averageCost,
    'Current Price': h.currentPrice,
    'Market Value': h.marketValue,
    'Unrealized Gain/Loss': h.unrealizedGain,
    'Export Date': new Date().toISOString()
  }));
  return Papa.unparse(data);
}

// Generate Google Sheets formulas helper table
export function generateGoogleSheetsFormulas(symbols: string[]): string {
  const header = `Ticker\tFormula: Live Price\tFormula: Change %\tFormula: 52W High\tFormula: Name`;
  const rows = symbols.map(sym => {
    const exchange = sym.includes('BTC') || sym.includes('ETH') ? 'CURRENCY' : 'NASDAQ';
    return `${sym}\t=GOOGLEFINANCE("${exchange}:${sym}", "price")\t=GOOGLEFINANCE("${exchange}:${sym}", "changepct")\t=GOOGLEFINANCE("${exchange}:${sym}", "high52")\t=GOOGLEFINANCE("${exchange}:${sym}", "name")`;
  });
  return [header, ...rows].join('\n');
}
