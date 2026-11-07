import React, { useState } from 'react';
import {
  TrendingUp,
  RefreshCw,
  Sparkles,
  FileSpreadsheet,
  Plus,
  FolderKanban,
  Check,
  Clock,
  Radio
} from 'lucide-react';
import { Portfolio } from '../types/portfolio';

import { UserMenu } from './UserMenu';

interface HeaderProps {
  portfolios: Portfolio[];
  activePortfolio: Portfolio;
  onSelectPortfolio: (portfolio: Portfolio) => void;
  onCreatePortfolio: (name: string) => void;
  onRefreshQuotes: () => void;
  isRefreshing: boolean;
  refreshInterval: number; // in seconds, 0 = off
  onChangeRefreshInterval: (sec: number) => void;
  onOpenImmigrationsModal: () => void;
  onOpenAIModal: () => void;
  onOpenAddModal: () => void;
  lastUpdated: Date;
  currentUser: any | null;
  onOpenSignIn: () => void;
  onOpenSignUp: () => void;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  portfolios,
  activePortfolio,
  onSelectPortfolio,
  onCreatePortfolio,
  onRefreshQuotes,
  isRefreshing,
  refreshInterval,
  onChangeRefreshInterval,
  onOpenImmigrationsModal,
  onOpenAIModal,
  onOpenAddModal,
  lastUpdated,
  currentUser,
  onOpenSignIn,
  onOpenSignUp,
  onSignOut
}) => {
  const [showPortfolioMenu, setShowPortfolioMenu] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Determine market status based on US Eastern Time (9:30 AM - 4:00 PM ET on weekdays)
  const now = new Date();
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const dayOfWeek = now.getUTCDay();
  // ET is UTC - 4 or UTC - 5 depending on DST. Assume ET ~ UTC-4/5
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const isMarketHours = isWeekday && ((utcHours === 13 && utcMinutes >= 30) || (utcHours >= 14 && utcHours < 20));

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPortfolioName.trim()) {
      onCreatePortfolio(newPortfolioName.trim());
      setNewPortfolioName('');
      setIsCreating(false);
      setShowPortfolioMenu(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Portfolio Selector */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 p-0.5 shadow-lg shadow-blue-500/20">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-emerald-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                  ApexPortfolio
                  <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    REAL-TIME
                  </span>
                </span>
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="hidden md:block h-6 w-px bg-slate-800"></div>

            {/* Portfolio Dropdown Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowPortfolioMenu(!showPortfolioMenu)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-white transition-all cursor-pointer"
              >
                <FolderKanban className="w-3.5 h-3.5 text-blue-400" />
                <span className="max-w-[130px] truncate">{activePortfolio.name}</span>
                <span className="text-slate-500 text-[10px]">▼</span>
              </button>

              {showPortfolioMenu && (
                <div className="absolute left-0 mt-1.5 w-64 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl z-50 p-2 space-y-1">
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider px-2 py-1">
                    Your Portfolios ({portfolios.length})
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {portfolios.map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          onSelectPortfolio(p);
                          setShowPortfolioMenu(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                          p.id === activePortfolio.id
                            ? 'bg-blue-600/20 text-blue-300 font-semibold'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="truncate">{p.name}</span>
                        {p.id === activePortfolio.id && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    {isCreating ? (
                      <form onSubmit={handleCreate} className="p-1 space-y-2">
                        <input
                          type="text"
                          value={newPortfolioName}
                          onChange={(e) => setNewPortfolioName(e.target.value)}
                          placeholder="Portfolio name..."
                          autoFocus
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-blue-500"
                        />
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setIsCreating(false)}
                            className="px-2 py-1 text-[11px] text-slate-400 hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-2.5 py-1 bg-blue-600 text-white rounded text-[11px] font-semibold"
                          >
                            Create
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        onClick={() => setIsCreating(true)}
                        className="w-full text-left px-2 py-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1.5 hover:bg-slate-800/60 rounded"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Create New Portfolio
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Market Status & Controls */}
          <div className="flex items-center gap-3">
            {/* Market Open / Closed Pill */}
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono">
              <span className={`w-2 h-2 rounded-full ${isMarketHours ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              <span className={isMarketHours ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-medium'}>
                {isMarketHours ? 'US MARKETS OPEN' : 'AFTER-HOURS / PRE-MARKET'}
              </span>
            </div>

            {/* Auto-Refresh Toggle */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
              <button
                onClick={onRefreshQuotes}
                disabled={isRefreshing}
                className="p-1.5 text-slate-300 hover:text-white rounded transition-colors"
                title={`Manual refresh quotes (Last: ${lastUpdated.toLocaleTimeString()})`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
              </button>
              <select
                value={refreshInterval}
                onChange={(e) => onChangeRefreshInterval(Number(e.target.value))}
                className="bg-transparent text-slate-300 text-[11px] font-mono px-2 py-1 rounded focus:outline-hidden cursor-pointer"
                title="Real-time auto refresh interval"
              >
                <option value={5} className="bg-slate-900 text-white">Live (5s)</option>
                <option value={15} className="bg-slate-900 text-white">15s</option>
                <option value={30} className="bg-slate-900 text-white">30s</option>
                <option value={0} className="bg-slate-900 text-white">Manual</option>
              </select>
            </div>

            {/* Migration Center Button (Prominent) */}
            <button
              onClick={onOpenImmigrationsModal}
              className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600/30 to-blue-600/30 hover:from-emerald-600/40 hover:to-blue-600/40 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Import Robinhood or Google Finance"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Immigrations</span>
              <span className="sm:hidden">Import</span>
            </button>

            {/* AI Audit Button */}
            <button
              onClick={onOpenAIModal}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              title="Gemini AI Portfolio Audit"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>AI Audit</span>
            </button>

            {/* Quick Add Button */}
            <button
              onClick={onOpenAddModal}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Transaction</span>
            </button>

            {/* User Authentication Menu */}
            <div className="pl-1 border-l border-slate-800">
              <UserMenu
                currentUser={currentUser}
                onOpenSignIn={onOpenSignIn}
                onOpenSignUp={onOpenSignUp}
                onSignOut={onSignOut}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
