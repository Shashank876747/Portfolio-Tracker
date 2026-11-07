import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Search,
  Plus,
  Minus,
  BarChart3,
  Trash2,
  FileSpreadsheet,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import { Holding, StockQuote } from '../types/portfolio';

interface HoldingsTableProps {
  holdings: Holding[];
  onSelectStock: (symbol: string) => void;
  onBuyStock: (symbol: string, currentPrice: number) => void;
  onSellStock: (symbol: string, currentPrice: number, currentShares: number) => void;
  onDeleteHolding: (symbol: string) => void;
  onOpenImportModal: () => void;
  onOpenAddModal: () => void;
}

export const HoldingsTable: React.FC<HoldingsTableProps> = ({
  holdings,
  onSelectStock,
  onBuyStock,
  onSellStock,
  onDeleteHolding,
  onOpenImportModal,
  onOpenAddModal
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [sortField, setSortField] = useState<'value' | 'gain' | 'change' | 'symbol' | 'weight'>('value');
  const [sortAsc, setSortAsc] = useState(false);

  // Extract unique sectors
  const sectors = ['ALL', ...Array.from(new Set(holdings.map(h => h.sector || h.assetClass)))];

  // Filtering & Sorting
  const filteredHoldings = holdings.filter(h => {
    const matchesSearch =
      h.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSector = sectorFilter === 'ALL' || h.sector === sectorFilter || h.assetClass === sectorFilter;
    return matchesSearch && matchesSector;
  });

  const sortedHoldings = [...filteredHoldings].sort((a, b) => {
    let diff = 0;
    if (sortField === 'value') diff = a.marketValue - b.marketValue;
    else if (sortField === 'gain') diff = a.unrealizedGain - b.unrealizedGain;
    else if (sortField === 'change') diff = a.dayGainPercent - b.dayGainPercent;
    else if (sortField === 'weight') diff = a.weightPercent - b.weightPercent;
    else if (sortField === 'symbol') diff = a.symbol.localeCompare(b.symbol);
    return sortAsc ? diff : -diff;
  });

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl backdrop-blur-xs">
      {/* Table Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-950/40">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by ticker or company name..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Sector / Asset Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
            <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0 ml-1" />
            {sectors.slice(0, 5).map(sec => (
              <button
                key={sec}
                onClick={() => setSectorFilter(sec)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-lg whitespace-nowrap transition-colors ${
                  sectorFilter === sec
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {sec}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenImportModal}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Migrate / Import</span>
          </button>
          <button
            onClick={onOpenAddModal}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Position</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      {sortedHoldings.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th
                  onClick={() => handleSort('symbol')}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Asset</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold text-right">Holdings</th>
                <th className="py-3 px-4 font-semibold text-right">Real-Time Price</th>
                <th
                  onClick={() => handleSort('change')}
                  className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>24h Change</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('value')}
                  className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Market Value</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('gain')}
                  className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Total Gain/Loss</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('weight')}
                  className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Weight</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono-numbers">
              {sortedHoldings.map((h) => {
                const isDayPositive = h.dayGain >= 0;
                const isTotalPositive = h.unrealizedGain >= 0;

                return (
                  <tr
                    key={h.symbol}
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => onSelectStock(h.symbol)}
                  >
                    {/* Symbol & Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center font-bold text-white text-xs font-mono shrink-0">
                          {h.symbol.slice(0, 3)}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-2">
                            <span>{h.symbol}</span>
                            <span className="text-[10px] font-sans px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-normal">
                              {h.assetClass}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-sans truncate max-w-[140px] sm:max-w-[200px]">
                            {h.name}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Shares & Cost Basis */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-semibold text-white">
                        {h.shares} <span className="text-[10px] text-slate-500 font-sans">shares</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        @ ${h.averageCost.toFixed(2)}
                      </div>
                    </td>

                    {/* Real-Time Price with flash animation */}
                    <td className="py-3.5 px-4 text-right">
                      <div className={`font-bold text-sm text-white inline-block px-1.5 py-0.5 rounded transition-all ${
                        h.priceDirection === 'up' ? 'flash-up text-emerald-300' : h.priceDirection === 'down' ? 'flash-down text-rose-300' : ''
                      }`}>
                        ${h.currentPrice.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Live Quote
                      </div>
                    </td>

                    {/* 24h Change */}
                    <td className="py-3.5 px-4 text-right">
                      <div className={`font-semibold flex items-center justify-end gap-1 ${isDayPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isDayPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        <span>{isDayPositive ? '+' : ''}${Math.abs(h.dayGain).toFixed(2)}</span>
                      </div>
                      <div className={`text-[11px] ${isDayPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isDayPositive ? '+' : ''}{h.dayGainPercent.toFixed(2)}%
                      </div>
                    </td>

                    {/* Total Market Value */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-bold text-white text-sm">
                        ${h.marketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Cost: ${h.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </td>

                    {/* Total Unrealized Gain */}
                    <td className="py-3.5 px-4 text-right">
                      <div className={`font-bold text-sm ${isTotalPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isTotalPositive ? '+' : ''}${h.unrealizedGain.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className={`text-[11px] ${isTotalPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isTotalPositive ? '+' : ''}{h.unrealizedGainPercent.toFixed(2)}%
                      </div>
                    </td>

                    {/* Weight % */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-semibold text-slate-200">
                        {h.weightPercent.toFixed(1)}%
                      </div>
                      <div className="w-16 h-1 bg-slate-800 rounded-full ml-auto mt-1 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${Math.min(h.weightPercent * 2, 100)}%` }}
                        ></div>
                      </div>
                    </td>

                    {/* Row Actions */}
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onBuyStock(h.symbol, h.currentPrice)}
                          className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-md transition-colors"
                          title={`Buy more ${h.symbol}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onSellStock(h.symbol, h.currentPrice, h.shares)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
                          title={`Sell ${h.symbol}`}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onSelectStock(h.symbol)}
                          className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-md transition-colors"
                          title={`View ${h.symbol} Chart`}
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteHolding(h.symbol)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
                          title={`Remove ${h.symbol}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Empty State */
        <div className="py-16 px-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 mx-auto">
            <FileSpreadsheet className="w-7 h-7 text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No Holdings Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Start tracking your investments by immigrating from Robinhood, Google Finance, or adding positions manually.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onOpenImportModal}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Immigrate from Robinhood / Google Finance</span>
            </button>
            <button
              onClick={onOpenAddModal}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Stock Manually</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
