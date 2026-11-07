/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Header } from './components/Header';
import { MetricCards } from './components/MetricCards';
import { InteractiveChart } from './components/InteractiveChart';
import { HoldingsTable } from './components/HoldingsTable';
import { AllocationView } from './components/AllocationView';
import { ImmigrationsModal } from './components/ImmigrationsModal';
import { StockDetailModal } from './components/StockDetailModal';
import { TransactionModal } from './components/TransactionModal';
import { AIInsightsModal } from './components/AIInsightsModal';
import { CashModal } from './components/CashModal';
import { AuthModal } from './components/AuthModal';
import { Portfolio, Holding, StockQuote, Transaction, ChartDataPoint } from './types/portfolio';
import { fetchBatchQuotes, fetchStockQuote, fetchHistoricalData } from './services/api';
import { ImportSummary } from './utils/importers';
import { auth, savePortfolioToCloud, loadUserPortfoliosFromCloud } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Sparkles, ArrowRight, ShieldCheck, FileSpreadsheet, Plus, Check } from 'lucide-react';

const STORAGE_KEY_PORTFOLIOS = 'apex_portfolios_v1';
const STORAGE_KEY_ACTIVE_ID = 'apex_active_portfolio_id_v1';

// Initial default demo portfolio so user lands on an active, populated dashboard
const DEFAULT_PORTFOLIO: Portfolio = {
  id: 'portfolio-default-1',
  name: 'Core Growth Portfolio',
  description: 'Primary diversified equity and index portfolio',
  sourceTag: 'MAIN',
  cashBalance: 4500.0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  transactions: [
    {
      id: 'tx-init-1',
      portfolioId: 'portfolio-default-1',
      symbol: 'AAPL',
      type: 'BUY',
      shares: 25,
      price: 195.40,
      totalAmount: 4885.00,
      date: '2024-01-15',
      source: 'MANUAL'
    },
    {
      id: 'tx-init-2',
      portfolioId: 'portfolio-default-1',
      symbol: 'NVDA',
      type: 'BUY',
      shares: 40,
      price: 88.50,
      totalAmount: 3540.00,
      date: '2024-02-05',
      source: 'MANUAL'
    },
    {
      id: 'tx-init-3',
      portfolioId: 'portfolio-default-1',
      symbol: 'MSFT',
      type: 'BUY',
      shares: 12,
      price: 390.20,
      totalAmount: 4682.40,
      date: '2024-02-28',
      source: 'MANUAL'
    },
    {
      id: 'tx-init-4',
      portfolioId: 'portfolio-default-1',
      symbol: 'GOOGL',
      type: 'BUY',
      shares: 20,
      price: 152.30,
      totalAmount: 3046.00,
      date: '2024-03-10',
      source: 'MANUAL'
    },
    {
      id: 'tx-init-5',
      portfolioId: 'portfolio-default-1',
      symbol: 'SPY',
      type: 'BUY',
      shares: 15,
      price: 512.40,
      totalAmount: 7686.00,
      date: '2024-04-02',
      source: 'MANUAL'
    },
    {
      id: 'tx-init-6',
      portfolioId: 'portfolio-default-1',
      symbol: 'BTC',
      type: 'BUY',
      shares: 0.12,
      price: 61500.00,
      totalAmount: 7380.00,
      date: '2024-05-18',
      source: 'MANUAL'
    }
  ]
};

export default function App() {
  // Portfolios state with localStorage persistence
  const [portfolios, setPortfolios] = useState<Portfolio[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PORTFOLIOS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [DEFAULT_PORTFOLIO];
  });

  const [activePortfolioId, setActivePortfolioId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
      if (saved && portfolios.some(p => p.id === saved)) return saved;
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_PORTFOLIO.id;
  });

  // Current active portfolio
  const activePortfolio = useMemo(() => {
    return portfolios.find(p => p.id === activePortfolioId) || portfolios[0] || DEFAULT_PORTFOLIO;
  }, [portfolios, activePortfolioId]);

  // Real-time market quotes cache
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
  const [previousPrices, setPreviousPrices] = useState<Record<string, number>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshInterval, setRefreshInterval] = useState<number>(5); // default 5s live stream

  // Chart state
  const [portfolioTimeframe, setPortfolioTimeframe] = useState<string>('1M');
  const [portfolioChartData, setPortfolioChartData] = useState<ChartDataPoint[]>([]);
  const [isLoadingChart, setIsLoadingChart] = useState(false);

  // Modals state
  const [isImmigrationsOpen, setIsImmigrationsOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isCashOpen, setIsCashOpen] = useState(false);
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [selectedStockSymbol, setSelectedStockSymbol] = useState<string | null>(null);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');

  // Firebase Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        setCurrentUser(user);
        try {
          const cloudPortfolios = await loadUserPortfoliosFromCloud(user.uid);
          if (cloudPortfolios && cloudPortfolios.length > 0) {
            setPortfolios(cloudPortfolios);
            setActivePortfolioId(cloudPortfolios[0].id);
          }
        } catch (err) {
          console.warn('Could not load user portfolios from cloud:', err);
        }
      } else {
        setCurrentUser((prev: any) => (prev?.uid && !prev?.emailVerified ? prev : null));
      }
    });
    return () => unsubscribe();
  }, []);

  // Pre-fill fields for Add Transaction modal
  const [addTxPrefill, setAddTxPrefill] = useState<{
    symbol?: string;
    type?: 'BUY' | 'SELL' | 'DIVIDEND' | 'DEPOSIT';
    price?: number;
    shares?: number;
  }>({});

  // Save portfolios to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PORTFOLIOS, JSON.stringify(portfolios));
    } catch (e) {
      console.error(e);
    }
  }, [portfolios]);

  // Save active id
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_ID, activePortfolioId);
    } catch (e) {
      console.error(e);
    }
  }, [activePortfolioId]);

  // Derive unique symbols in active portfolio
  const heldSymbols = useMemo(() => {
    const syms = new Set<string>();
    activePortfolio.transactions.forEach(tx => {
      if (tx.symbol && tx.symbol !== 'USD') {
        syms.add(tx.symbol.toUpperCase());
      }
    });
    return Array.from(syms);
  }, [activePortfolio.transactions]);

  // Real-Time Quotes Fetcher
  const refreshQuotes = async () => {
    if (heldSymbols.length === 0) return;
    setIsRefreshing(true);
    try {
      const newQuotes = await fetchBatchQuotes(heldSymbols);

      // Track price directions for green/red flash effect
      setQuotes(prevQuotes => {
        const prevPrices: Record<string, number> = {};
        Object.entries(prevQuotes).forEach(([sym, q]) => {
          prevPrices[sym] = q.price;
        });
        setPreviousPrices(prevPrices);
        return { ...prevQuotes, ...newQuotes };
      });

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error refreshing quotes:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initial quotes fetch
  useEffect(() => {
    refreshQuotes();
  }, [heldSymbols.join(',')]);

  // Auto-refresh interval timer
  useEffect(() => {
    if (refreshInterval <= 0) return;
    const interval = setInterval(() => {
      refreshQuotes();
    }, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [refreshInterval, heldSymbols]);

  // Calculate aggregated holdings with cost basis and live valuations
  const { holdings, totalHoldingsValue, totalCostBasis, totalDayGain, totalUnrealizedGain } = useMemo(() => {
    const positionMap = new Map<string, { shares: number; totalCost: number }>();

    // Process transactions sequentially
    const sortedTx = [...activePortfolio.transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    sortedTx.forEach(tx => {
      if (tx.symbol === 'USD') return;
      const cur = positionMap.get(tx.symbol) || { shares: 0, totalCost: 0 };

      if (tx.type === 'BUY') {
        cur.shares += tx.shares;
        cur.totalCost += (tx.shares * tx.price) + (tx.fees || 0);
      } else if (tx.type === 'SELL') {
        const avgCostBefore = cur.shares > 0 ? (cur.totalCost / cur.shares) : tx.price;
        cur.shares = Math.max(0, cur.shares - tx.shares);
        cur.totalCost = cur.shares * avgCostBefore;
      }
      positionMap.set(tx.symbol, cur);
    });

    let sumValue = 0;
    let sumCost = 0;
    let sumDayGain = 0;

    // Temporary list
    const list: Holding[] = [];

    positionMap.forEach((data, symbol) => {
      if (data.shares <= 0) return;

      const quote = quotes[symbol] || {
        symbol,
        name: symbol,
        price: data.totalCost / data.shares,
        change: 0,
        changePercent: 0,
        previousClose: data.totalCost / data.shares,
        open: data.totalCost / data.shares,
        dayHigh: data.totalCost / data.shares,
        dayLow: data.totalCost / data.shares,
        volume: 0,
        avgVolume: 0,
        marketCap: 0,
        fiftyTwoWeekHigh: 0,
        fiftyTwoWeekLow: 0,
        sector: 'Equities',
        assetClass: symbol.includes('BTC') || symbol.includes('ETH') ? 'Crypto' : 'Stock',
        lastUpdated: new Date().toISOString()
      };

      const currentPrice = quote.price;
      const marketValue = data.shares * currentPrice;
      const averageCost = data.totalCost / data.shares;
      const unrealizedGain = marketValue - data.totalCost;
      const unrealizedGainPercent = data.totalCost > 0 ? (unrealizedGain / data.totalCost) * 100 : 0;
      const dayGain = data.shares * (quote.change || 0);
      const dayGainPercent = quote.changePercent || 0;

      // Price direction animation
      const prevPrice = previousPrices[symbol];
      let priceDirection: 'up' | 'down' | 'neutral' = 'neutral';
      if (prevPrice !== undefined) {
        if (currentPrice > prevPrice) priceDirection = 'up';
        else if (currentPrice < prevPrice) priceDirection = 'down';
      }

      sumValue += marketValue;
      sumCost += data.totalCost;
      sumDayGain += dayGain;

      list.push({
        id: `holding-${symbol}`,
        symbol,
        name: quote.name,
        shares: +data.shares.toFixed(4),
        averageCost: +averageCost.toFixed(2),
        totalCost: +data.totalCost.toFixed(2),
        currentPrice: +currentPrice.toFixed(2),
        previousClose: +quote.previousClose.toFixed(2),
        dayGain: +dayGain.toFixed(2),
        dayGainPercent: +dayGainPercent.toFixed(2),
        marketValue: +marketValue.toFixed(2),
        unrealizedGain: +unrealizedGain.toFixed(2),
        unrealizedGainPercent: +unrealizedGainPercent.toFixed(2),
        weightPercent: 0, // will compute below
        sector: quote.sector,
        assetClass: quote.assetClass,
        peRatio: quote.peRatio,
        dividendYield: quote.dividendYield,
        priceDirection,
        lastUpdated: quote.lastUpdated
      });
    });

    // Compute weights
    const totalAssets = sumValue + (activePortfolio.cashBalance || 0);
    list.forEach(h => {
      h.weightPercent = totalAssets > 0 ? (h.marketValue / totalAssets) * 100 : 0;
    });

    const totalUnrealized = sumValue - sumCost;

    return {
      holdings: list.sort((a, b) => b.marketValue - a.marketValue),
      totalHoldingsValue: sumValue,
      totalCostBasis: sumCost,
      totalDayGain: sumDayGain,
      totalUnrealizedGain: totalUnrealized
    };
  }, [activePortfolio.transactions, activePortfolio.cashBalance, quotes, previousPrices]);

  const netWorth = totalHoldingsValue + (activePortfolio.cashBalance || 0);
  const dayChangePercent = (netWorth - totalDayGain) > 0 ? (totalDayGain / (netWorth - totalDayGain)) * 100 : 0;
  const totalReturnPercent = totalCostBasis > 0 ? (totalUnrealizedGain / totalCostBasis) * 100 : 0;

  // Estimated annual dividend yield & income
  const { annualDividends, portfolioYield } = useMemo(() => {
    let divSum = 0;
    holdings.forEach(h => {
      if (h.dividendYield && h.dividendYield > 0) {
        divSum += h.marketValue * (h.dividendYield / 100);
      }
    });
    const yieldPct = totalHoldingsValue > 0 ? (divSum / totalHoldingsValue) * 100 : 0;
    return { annualDividends: divSum, portfolioYield: yieldPct };
  }, [holdings, totalHoldingsValue]);

  // Fetch portfolio performance historical chart
  useEffect(() => {
    let isMounted = true;
    setIsLoadingChart(true);

    // Primary benchmark ticker or top holding to base baseline trend on
    const benchmarkSymbol = holdings[0]?.symbol || 'SPY';

    fetchHistoricalData(benchmarkSymbol, portfolioTimeframe)
      .then(points => {
        if (!isMounted) return;
        // Scale historical points to match portfolio net worth
        const lastP = points[points.length - 1]?.price || 1;
        const scaleFactor = netWorth / lastP;

        const scaledPoints = points.map(pt => ({
          ...pt,
          price: +(pt.price * scaleFactor).toFixed(2),
          open: +(pt.open * scaleFactor).toFixed(2),
          high: +(pt.high * scaleFactor).toFixed(2),
          low: +(pt.low * scaleFactor).toFixed(2),
          close: +(pt.close * scaleFactor).toFixed(2)
        }));

        setPortfolioChartData(scaledPoints);
      })
      .catch(console.error)
      .finally(() => {
        if (isMounted) setIsLoadingChart(false);
      });

    return () => { isMounted = false; };
  }, [netWorth, portfolioTimeframe, holdings[0]?.symbol]);

  // Handlers for Portfolio Management
  const handleSelectPortfolio = (p: Portfolio) => {
    setActivePortfolioId(p.id);
  };

  const handleCreatePortfolio = (name: string) => {
    const newP: Portfolio = {
      id: `portfolio-${Date.now()}`,
      name,
      cashBalance: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      transactions: []
    };
    setPortfolios(prev => [...prev, newP]);
    setActivePortfolioId(newP.id);
  };

  const handleSaveTransaction = (tx: Transaction) => {
    setPortfolios(prev => prev.map(p => {
      if (p.id === activePortfolio.id) {
        let newCash = p.cashBalance;
        if (tx.type === 'DEPOSIT') newCash += tx.shares;
        else if (tx.type === 'WITHDRAWAL') newCash = Math.max(0, newCash - tx.shares);
        return {
          ...p,
          cashBalance: newCash,
          updatedAt: new Date().toISOString(),
          transactions: [...p.transactions, tx]
        };
      }
      return p;
    }));
  };

  const handleDeleteHolding = (symbol: string) => {
    setPortfolios(prev => prev.map(p => {
      if (p.id === activePortfolio.id) {
        return {
          ...p,
          updatedAt: new Date().toISOString(),
          transactions: p.transactions.filter(t => t.symbol.toUpperCase() !== symbol.toUpperCase())
        };
      }
      return p;
    }));
  };

  const handleUpdateCash = (newBalance: number, delta: number, type: 'DEPOSIT' | 'WITHDRAWAL') => {
    const tx: Transaction = {
      id: `cash-tx-${Date.now()}`,
      portfolioId: activePortfolio.id,
      symbol: 'USD',
      type,
      shares: delta,
      price: 1,
      date: new Date().toISOString().split('T')[0],
      source: 'MANUAL',
      notes: `${type === 'DEPOSIT' ? 'Cash Deposit' : 'Cash Withdrawal'}`
    };

    setPortfolios(prev => prev.map(p => {
      if (p.id === activePortfolio.id) {
        return {
          ...p,
          cashBalance: newBalance,
          updatedAt: new Date().toISOString(),
          transactions: [...p.transactions, tx]
        };
      }
      return p;
    }));
  };

  // Immigration Completion Handler
  const handleCompleteImport = (
    portfolioName: string,
    summary: ImportSummary,
    mergeIntoExisting: boolean
  ) => {
    if (mergeIntoExisting) {
      // Merge transactions into active portfolio
      const updatedTx = [...activePortfolio.transactions, ...summary.transactions];
      setPortfolios(prev => prev.map(p => {
        if (p.id === activePortfolio.id) {
          return {
            ...p,
            updatedAt: new Date().toISOString(),
            transactions: updatedTx
          };
        }
        return p;
      }));
    } else {
      // Create new dedicated portfolio for the immigrated data
      const newPortfolioId = `portfolio-${summary.source.toLowerCase()}-${Date.now()}`;
      const remappedTx = summary.transactions.map(t => ({
        ...t,
        portfolioId: newPortfolioId
      }));

      const newP: Portfolio = {
        id: newPortfolioId,
        name: portfolioName,
        description: `Imported from ${summary.source === 'ROBINHOOD' ? 'Robinhood' : 'Google Finance'} on ${new Date().toLocaleDateString()}`,
        sourceTag: summary.source === 'ROBINHOOD' ? 'ROBINHOOD' : 'GOOGLE_FINANCE',
        cashBalance: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        transactions: remappedTx
      };

      setPortfolios(prev => [...prev, newP]);
      setActivePortfolioId(newPortfolioId);
    }
  };

  const selectedHolding = useMemo(() => {
    if (!selectedStockSymbol) return null;
    return holdings.find(h => h.symbol.toUpperCase() === selectedStockSymbol.toUpperCase()) || null;
  }, [selectedStockSymbol, holdings]);

  const selectedQuote = useMemo(() => {
    if (!selectedStockSymbol) return null;
    return quotes[selectedStockSymbol.toUpperCase()] || null;
  }, [selectedStockSymbol, quotes]);

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <Header
        portfolios={portfolios}
        activePortfolio={activePortfolio}
        onSelectPortfolio={handleSelectPortfolio}
        onCreatePortfolio={handleCreatePortfolio}
        onRefreshQuotes={refreshQuotes}
        isRefreshing={isRefreshing}
        refreshInterval={refreshInterval}
        onChangeRefreshInterval={setRefreshInterval}
        onOpenImmigrationsModal={() => setIsImmigrationsOpen(true)}
        onOpenAIModal={() => setIsAIOpen(true)}
        onOpenAddModal={() => {
          setAddTxPrefill({});
          setIsAddTxOpen(true);
        }}
        lastUpdated={lastUpdated}
        currentUser={currentUser}
        onOpenSignIn={() => {
          setAuthModalMode('signin');
          setIsAuthModalOpen(true);
        }}
        onOpenSignUp={() => {
          setAuthModalMode('signup');
          setIsAuthModalOpen(true);
        }}
        onSignOut={() => {
          setCurrentUser(null);
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Banner with Robinhood & Google Finance Callout */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">
                  Robinhood & Google Finance Immigrations Ready
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Instant Auto-Detect
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Import statements, trade history, or Google Sheets formulas to track live real-time market gains in seconds.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsImmigrationsOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <span>Launch Immigrations Center</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsAIOpen(true)}
              className="px-3.5 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>AI Audit</span>
            </button>
          </div>
        </div>

        {/* 1. Key Metrics Cards */}
        <MetricCards
          totalValue={netWorth}
          totalCost={totalCostBasis}
          dayChange={totalDayGain}
          dayChangePercent={dayChangePercent}
          totalGain={totalUnrealizedGain}
          totalGainPercent={totalReturnPercent}
          annualDividends={annualDividends}
          portfolioYield={portfolioYield}
          cashBalance={activePortfolio.cashBalance}
          onOpenCashModal={() => setIsCashOpen(true)}
        />

        {/* 2. Interactive Performance Chart */}
        <InteractiveChart
          data={portfolioChartData}
          symbol={activePortfolio.name}
          title={`${activePortfolio.name} Net Worth Over Time`}
          timeframe={portfolioTimeframe}
          onTimeframeChange={setPortfolioTimeframe}
          isLoading={isLoadingChart}
        />

        {/* 3. Holdings & Real-Time Quotes Table */}
        <HoldingsTable
          holdings={holdings}
          onSelectStock={async (symbol) => {
            setSelectedStockSymbol(symbol);
            if (!quotes[symbol]) {
              try {
                const q = await fetchStockQuote(symbol);
                setQuotes(prev => ({ ...prev, [symbol]: q }));
              } catch (e) {
                console.error(e);
              }
            }
          }}
          onBuyStock={(symbol, price) => {
            setAddTxPrefill({ symbol, type: 'BUY', price, shares: 10 });
            setIsAddTxOpen(true);
          }}
          onSellStock={(symbol, price, currentShares) => {
            setAddTxPrefill({ symbol, type: 'SELL', price, shares: currentShares });
            setIsAddTxOpen(true);
          }}
          onDeleteHolding={handleDeleteHolding}
          onOpenImportModal={() => setIsImmigrationsOpen(true)}
          onOpenAddModal={() => {
            setAddTxPrefill({});
            setIsAddTxOpen(true);
          }}
        />

        {/* 4. Asset Allocation & Diversification */}
        {holdings.length > 0 && (
          <AllocationView
            holdings={holdings}
            totalValue={totalHoldingsValue}
            cashBalance={activePortfolio.cashBalance}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500 font-mono mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Real-time quotes with Robinhood & Google Finance integrations</span>
          </div>
          <div className="text-slate-600">
            Quotes simulated with live market tick stream • ApexPortfolio Engine
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ImmigrationsModal
        isOpen={isImmigrationsOpen}
        onClose={() => setIsImmigrationsOpen(false)}
        activePortfolio={activePortfolio}
        allPortfolios={portfolios}
        holdings={holdings}
        onCompleteImport={handleCompleteImport}
      />

      <StockDetailModal
        quote={selectedQuote}
        holding={selectedHolding}
        isOpen={!!selectedStockSymbol}
        onClose={() => setSelectedStockSymbol(null)}
        onBuy={(symbol, price) => {
          setSelectedStockSymbol(null);
          setAddTxPrefill({ symbol, type: 'BUY', price, shares: 10 });
          setIsAddTxOpen(true);
        }}
        onSell={(symbol, price, currentShares) => {
          setSelectedStockSymbol(null);
          setAddTxPrefill({ symbol, type: 'SELL', price, shares: currentShares });
          setIsAddTxOpen(true);
        }}
      />

      <TransactionModal
        isOpen={isAddTxOpen}
        onClose={() => {
          setIsAddTxOpen(false);
          setAddTxPrefill({});
        }}
        portfolioId={activePortfolio.id}
        initialSymbol={addTxPrefill.symbol}
        initialType={addTxPrefill.type}
        initialPrice={addTxPrefill.price}
        initialShares={addTxPrefill.shares}
        onSaveTransaction={handleSaveTransaction}
      />

      <AIInsightsModal
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
        activePortfolio={activePortfolio}
        holdings={holdings}
        totalValue={netWorth}
      />

      <CashModal
        isOpen={isCashOpen}
        onClose={() => setIsCashOpen(false)}
        currentCash={activePortfolio.cashBalance}
        onUpdateCash={handleUpdateCash}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          if (user?.uid) {
            savePortfolioToCloud(user.uid, activePortfolio);
          }
        }}
      />
    </div>
  );
}
