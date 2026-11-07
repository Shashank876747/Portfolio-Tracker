import React, { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, ExternalLink, Plus, Minus, DollarSign, PieChart, ShieldCheck } from 'lucide-react';
import { StockQuote, Holding, ChartDataPoint } from '../types/portfolio';
import { fetchHistoricalData } from '../services/api';
import { InteractiveChart } from './InteractiveChart';

interface StockDetailModalProps {
  quote: StockQuote | null;
  holding?: Holding | null;
  isOpen: boolean;
  onClose: () => void;
  onBuy: (symbol: string, currentPrice: number) => void;
  onSell: (symbol: string, currentPrice: number, currentShares: number) => void;
}

export const StockDetailModal: React.FC<StockDetailModalProps> = ({
  quote,
  holding,
  isOpen,
  onClose,
  onBuy,
  onSell
}) => {
  const [timeframe, setTimeframe] = useState<string>('1M');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoadingChart, setIsLoadingChart] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !quote) return;
    let isMounted = true;
    setIsLoadingChart(true);

    fetchHistoricalData(quote.symbol, timeframe)
      .then(points => {
        if (isMounted) setChartData(points);
      })
      .catch(err => console.error('Historical fetch error:', err))
      .finally(() => {
        if (isMounted) setIsLoadingChart(false);
      });

    return () => { isMounted = false; };
  }, [isOpen, quote?.symbol, timeframe]);

  if (!isOpen || !quote) return null;

  const isPositive = quote.change >= 0;

  // 52-week position calculation
  const range52 = quote.fiftyTwoWeekHigh - quote.fiftyTwoWeekLow || 1;
  const current52Pos = Math.min(Math.max(0, (quote.price - quote.fiftyTwoWeekLow) / range52), 1) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-base">
              {quote.symbol.slice(0, 4)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">{quote.symbol}</h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  {quote.sector}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {quote.assetClass}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{quote.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-white font-mono-numbers">
                ${quote.price.toFixed(2)}
              </div>
              <div className={`flex items-center justify-end gap-1 text-xs font-mono font-medium ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>{isPositive ? '+' : ''}${quote.change.toFixed(2)}</span>
                <span>({isPositive ? '+' : ''}{quote.changePercent.toFixed(2)}%)</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Real-time Interactive Chart */}
          <InteractiveChart
            data={chartData}
            symbol={quote.symbol}
            title={`${quote.name} Price Action`}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
            isLoading={isLoadingChart}
          />

          {/* User Position Summary if held */}
          {holding && holding.shares > 0 ? (
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-blue-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Your Investment in {quote.symbol}
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onBuy(quote.symbol, quote.price)}
                    className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Buy More
                  </button>
                  <button
                    onClick={() => onSell(quote.symbol, quote.price, holding.shares)}
                    className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                    Sell Position
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono-numbers">
                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400 font-sans">Shares Held</div>
                  <div className="text-lg font-bold text-white mt-0.5">{holding.shares}</div>
                  <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                    Portfolio Weight: {holding.weightPercent.toFixed(1)}%
                  </div>
                </div>

                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400 font-sans">Average Cost</div>
                  <div className="text-lg font-bold text-white mt-0.5">${holding.averageCost.toFixed(2)}</div>
                  <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                    Cost Basis: ${holding.totalCost.toLocaleString()}
                  </div>
                </div>

                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400 font-sans">Current Equity</div>
                  <div className="text-lg font-bold text-white mt-0.5">${holding.marketValue.toLocaleString()}</div>
                  <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                    Today: {holding.dayGain >= 0 ? '+' : ''}${holding.dayGain.toFixed(2)}
                  </div>
                </div>

                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400 font-sans">Total Return</div>
                  <div className={`text-lg font-bold mt-0.5 ${holding.unrealizedGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {holding.unrealizedGain >= 0 ? '+' : ''}${holding.unrealizedGain.toLocaleString()}
                  </div>
                  <div className={`text-[10px] font-sans mt-0.5 ${holding.unrealizedGainPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {holding.unrealizedGainPercent >= 0 ? '+' : ''}{holding.unrealizedGainPercent.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">You do not currently own {quote.symbol}</div>
                <div className="text-xs text-slate-400">Add this stock to your portfolio to begin tracking live performance.</div>
              </div>
              <button
                onClick={() => onBuy(quote.symbol, quote.price)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add to Portfolio
              </button>
            </div>
          )}

          {/* Key Statistics Grid */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Key Fundamentals & Market Stats
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-slate-500 font-sans text-[11px]">Previous Close</div>
                <div className="text-white font-bold mt-0.5">${quote.previousClose.toFixed(2)}</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-slate-500 font-sans text-[11px]">Day Open</div>
                <div className="text-white font-bold mt-0.5">${quote.open.toFixed(2)}</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-slate-500 font-sans text-[11px]">Day's Range</div>
                <div className="text-white font-bold mt-0.5">${quote.dayLow.toFixed(2)} - ${quote.dayHigh.toFixed(2)}</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-slate-500 font-sans text-[11px]">Market Capitalization</div>
                <div className="text-white font-bold mt-0.5">
                  ${(quote.marketCap / 1e9).toFixed(2)}B
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-slate-500 font-sans text-[11px]">Volume</div>
                <div className="text-white font-bold mt-0.5">{quote.volume.toLocaleString()}</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-slate-500 font-sans text-[11px]">P/E Ratio</div>
                <div className="text-white font-bold mt-0.5">{quote.peRatio ? `${quote.peRatio}x` : 'N/A'}</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-slate-500 font-sans text-[11px]">Dividend Yield</div>
                <div className="text-white font-bold mt-0.5">{quote.dividendYield ? `${quote.dividendYield}%` : '0.00%'}</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-slate-500 font-sans text-[11px]">Asset Class</div>
                <div className="text-white font-bold mt-0.5">{quote.assetClass}</div>
              </div>
            </div>

            {/* 52-Week Range Bar */}
            <div className="mt-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                <span>52W Low: ${quote.fiftyTwoWeekLow.toFixed(2)}</span>
                <span className="text-white font-bold font-sans">52-Week Range</span>
                <span>52W High: ${quote.fiftyTwoWeekHigh.toFixed(2)}</span>
              </div>
              <div className="relative w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 bottom-0 bg-gradient-to-r from-blue-500 via-emerald-500 to-indigo-500 rounded-full"
                  style={{ width: `${current52Pos}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Quick External Links */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800 text-xs">
            <span className="text-slate-500">External Links:</span>
            <a
              href={`https://www.google.com/finance/quote/${quote.symbol}:NASDAQ`}
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 hover:text-blue-300 flex items-center gap-1 hover:underline"
            >
              Google Finance <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-slate-700">•</span>
            <a
              href={`https://finance.yahoo.com/quote/${quote.symbol}`}
              target="_blank"
              rel="noreferrer"
              className="text-purple-400 hover:text-purple-300 flex items-center gap-1 hover:underline"
            >
              Yahoo Finance <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-slate-700">•</span>
            <a
              href={`https://robinhood.com/stocks/${quote.symbol}`}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 hover:underline"
            >
              Robinhood View <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
