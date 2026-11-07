import React, { useState } from 'react';
import { Holding } from '../types/portfolio';
import { PieChart, Layers, ShieldCheck } from 'lucide-react';

interface AllocationViewProps {
  holdings: Holding[];
  totalValue: number;
  cashBalance: number;
}

const SECTOR_COLORS: Record<string, string> = {
  'Technology': '#3b82f6', // blue
  'Communication Services': '#8b5cf6', // purple
  'Consumer Cyclical': '#ec4899', // pink
  'Broad Market ETF': '#10b981', // emerald
  'Tech & Growth ETF': '#06b6d4', // cyan
  'Financial Services': '#f59e0b', // amber
  'Healthcare': '#14b8a6', // teal
  'Cryptocurrency': '#f97316', // orange
  'Exchange Traded Fund': '#6366f1', // indigo
  'Cash': '#64748b', // slate
  'Other': '#a855f7'
};

export const AllocationView: React.FC<AllocationViewProps> = ({
  holdings,
  totalValue,
  cashBalance
}) => {
  const [activeTab, setActiveTab] = useState<'sector' | 'assetClass'>('sector');

  const grandTotal = totalValue + cashBalance;

  // Group by sector
  const sectorMap: Record<string, number> = {};
  holdings.forEach(h => {
    const sec = h.sector || 'Other';
    sectorMap[sec] = (sectorMap[sec] || 0) + h.marketValue;
  });
  if (cashBalance > 0) {
    sectorMap['Cash'] = (sectorMap['Cash'] || 0) + cashBalance;
  }

  const sectors = Object.entries(sectorMap)
    .map(([name, value]) => ({
      name,
      value,
      percent: grandTotal > 0 ? +((value / grandTotal) * 100).toFixed(1) : 0,
      color: SECTOR_COLORS[name] || '#64748b'
    }))
    .sort((a, b) => b.value - a.value);

  // Group by asset class
  const classMap: Record<string, number> = {};
  holdings.forEach(h => {
    const cls = h.assetClass || 'Stock';
    classMap[cls] = (classMap[cls] || 0) + h.marketValue;
  });
  if (cashBalance > 0) {
    classMap['Cash'] = (classMap['Cash'] || 0) + cashBalance;
  }

  const assetClasses = Object.entries(classMap)
    .map(([name, value]) => ({
      name,
      value,
      percent: grandTotal > 0 ? +((value / grandTotal) * 100).toFixed(1) : 0,
      color: name === 'Stock' ? '#3b82f6' : name === 'ETF' ? '#10b981' : name === 'Crypto' ? '#f97316' : '#64748b'
    }))
    .sort((a, b) => b.value - a.value);

  const displayList = activeTab === 'sector' ? sectors : assetClasses;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl backdrop-blur-xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PieChart className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Portfolio Allocation & Diversification
          </h3>
        </div>

        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('sector')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              activeTab === 'sector' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            By Sector
          </button>
          <button
            onClick={() => setActiveTab('assetClass')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              activeTab === 'assetClass' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            By Asset Class
          </button>
        </div>
      </div>

      {/* Multi-segment stacked progress bar */}
      <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex mb-5 border border-slate-800">
        {displayList.map(item => (
          <div
            key={item.name}
            style={{ width: `${item.percent}%`, backgroundColor: item.color }}
            className="h-full transition-all duration-300 relative group"
            title={`${item.name}: ${item.percent}%`}
          />
        ))}
      </div>

      {/* Breakdown List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {displayList.map(item => (
          <div
            key={item.name}
            className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5 truncate">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              ></span>
              <span className="text-xs font-semibold text-slate-200 truncate">{item.name}</span>
            </div>
            <div className="text-right font-mono-numbers shrink-0 ml-2">
              <span className="text-xs font-bold text-white">{item.percent}%</span>
              <div className="text-[10px] text-slate-500">
                ${item.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
