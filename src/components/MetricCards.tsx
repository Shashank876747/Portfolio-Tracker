import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, Wallet, Calendar, Percent } from 'lucide-react';

interface MetricCardsProps {
  totalValue: number;
  totalCost: number;
  dayChange: number;
  dayChangePercent: number;
  totalGain: number;
  totalGainPercent: number;
  annualDividends: number;
  portfolioYield: number;
  cashBalance: number;
  onOpenCashModal: () => void;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  totalValue,
  totalCost: _totalCost,
  dayChange,
  dayChangePercent,
  totalGain,
  totalGainPercent,
  annualDividends,
  portfolioYield,
  cashBalance,
  onOpenCashModal
}) => {
  const isDayPositive = dayChange >= 0;
  const isTotalPositive = totalGain >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Portfolio Net Worth */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden backdrop-blur-xs">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
          <span className="font-medium uppercase tracking-wider">Total Portfolio Value</span>
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono-numbers tracking-tight">
          ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="flex items-center gap-1.5 mt-2 text-xs font-mono">
          <span className={`flex items-center font-semibold ${isDayPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isDayPositive ? <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> : <TrendingDown className="w-3.5 h-3.5 mr-0.5" />}
            {isDayPositive ? '+' : ''}${Math.abs(dayChange).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className={`text-[11px] ${isDayPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            ({isDayPositive ? '+' : ''}{dayChangePercent.toFixed(2)}%)
          </span>
          <span className="text-slate-500 text-[11px] ml-auto">Today</span>
        </div>
      </div>

      {/* 2. Total Unrealized Return */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden backdrop-blur-xs">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
          <span className="font-medium uppercase tracking-wider">Total Unrealized P&L</span>
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Percent className="w-4 h-4" />
          </div>
        </div>
        <div className={`text-2xl sm:text-3xl font-extrabold font-mono-numbers tracking-tight ${isTotalPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isTotalPositive ? '+' : ''}${totalGain.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="flex items-center gap-1.5 mt-2 text-xs font-mono">
          <span className={`font-semibold ${isTotalPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isTotalPositive ? '+' : ''}{totalGainPercent.toFixed(2)}%
          </span>
          <span className="text-slate-500 text-[11px]">All-time Return</span>
        </div>
      </div>

      {/* 3. Dividend Projection & Yield */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden backdrop-blur-xs">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
          <span className="font-medium uppercase tracking-wider">Est. Annual Dividends</span>
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Calendar className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono-numbers tracking-tight">
          ${annualDividends.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <span className="text-xs text-slate-400 font-normal ml-1 font-sans">/ yr</span>
        </div>
        <div className="flex items-center gap-1.5 mt-2 text-xs font-mono">
          <span className="text-amber-400 font-semibold">{portfolioYield.toFixed(2)}%</span>
          <span className="text-slate-500 text-[11px]">Weighted Portfolio Yield</span>
        </div>
      </div>

      {/* 4. Cash Balance & Purchasing Power */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden backdrop-blur-xs">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
          <span className="font-medium uppercase tracking-wider">Uninvested Cash</span>
          <button
            onClick={onOpenCashModal}
            className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold transition-colors cursor-pointer"
          >
            + Transfer
          </button>
        </div>
        <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono-numbers tracking-tight">
          ${cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="flex items-center justify-between mt-2 text-xs font-mono text-slate-400">
          <span>Liquid Buying Power</span>
          <span className="text-slate-500 text-[11px]">
            {((cashBalance / (totalValue || 1)) * 100).toFixed(1)}% of assets
          </span>
        </div>
      </div>
    </div>
  );
};
