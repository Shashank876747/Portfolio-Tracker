import React, { useState, useEffect } from 'react';
import { X, Search, DollarSign, Calendar, Plus, Minus, FileText, CheckCircle2 } from 'lucide-react';
import { Transaction, TransactionType } from '../types/portfolio';
import { searchTickers, fetchStockQuote } from '../services/api';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioId: string;
  initialSymbol?: string;
  initialType?: TransactionType;
  initialPrice?: number;
  initialShares?: number;
  onSaveTransaction: (tx: Transaction) => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  portfolioId,
  initialSymbol = '',
  initialType = 'BUY',
  initialPrice,
  initialShares,
  onSaveTransaction
}) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [symbol, setSymbol] = useState(initialSymbol);
  const [shares, setShares] = useState(initialShares ? String(initialShares) : '10');
  const [price, setPrice] = useState(initialPrice ? String(initialPrice) : '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [fees, setFees] = useState('0.00');
  const [notes, setNotes] = useState('');

  // Ticker search state
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (initialSymbol) {
      setSymbol(initialSymbol);
    }
    if (initialPrice) {
      setPrice(String(initialPrice));
    }
    if (initialType) {
      setType(initialType);
    }
  }, [initialSymbol, initialPrice, initialType]);

  // When symbol changes, search or fetch price
  const handleSymbolChange = async (val: string) => {
    const sym = val.toUpperCase();
    setSymbol(sym);

    if (sym.length >= 1) {
      setIsSearching(true);
      setShowDropdown(true);
      try {
        const results = await searchTickers(sym);
        setSearchResults(results);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  };

  const handleSelectSymbol = (selectedSymbol: string, currentPrice?: number) => {
    setSymbol(selectedSymbol);
    setShowDropdown(false);
    if (currentPrice) {
      setPrice(String(currentPrice));
    } else {
      fetchStockQuote(selectedSymbol).then(q => {
        if (q?.price) setPrice(String(q.price));
      }).catch(console.error);
    }
  };

  const numShares = parseFloat(shares) || 0;
  const numPrice = parseFloat(price) || 0;
  const numFees = parseFloat(fees) || 0;
  const totalCost = (numShares * numPrice) + (type === 'BUY' ? numFees : -numFees);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim() && type !== 'DEPOSIT' && type !== 'WITHDRAWAL') return;
    if (numShares <= 0 && type !== 'DIVIDEND') return;

    const tx: Transaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      portfolioId,
      symbol: (type === 'DEPOSIT' || type === 'WITHDRAWAL') ? 'USD' : symbol.toUpperCase().trim(),
      type,
      shares: numShares,
      price: numPrice,
      fees: numFees,
      totalAmount: totalCost,
      date,
      notes: notes.trim() || undefined,
      source: 'MANUAL',
      importedAt: new Date().toISOString()
    };

    onSaveTransaction(tx);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Plus className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white">Record Transaction</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Transaction Type Buttons */}
          <div>
            <label className="block text-slate-400 font-medium mb-1.5">Action Type</label>
            <div className="grid grid-cols-4 gap-2">
              {(['BUY', 'SELL', 'DIVIDEND', 'DEPOSIT'] as TransactionType[]).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setType(t)}
                  className={`py-2 rounded-lg font-semibold text-center border transition-all ${
                    type === t
                      ? t === 'BUY'
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : t === 'SELL'
                        ? 'bg-rose-600 border-rose-500 text-white'
                        : t === 'DIVIDEND'
                        ? 'bg-amber-600 border-amber-500 text-white'
                        : 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Symbol Input (only if not pure cash deposit) */}
          {type !== 'DEPOSIT' && type !== 'WITHDRAWAL' && (
            <div className="relative">
              <label className="block text-slate-400 font-medium mb-1.5">Asset / Ticker Symbol</label>
              <div className="relative">
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => handleSymbolChange(e.target.value)}
                  placeholder="e.g. AAPL, NVDA, SPY, BTC"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono uppercase focus:border-blue-500 focus:outline-hidden"
                />
                <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
              </div>

              {/* Autocomplete Dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-slate-950 border border-slate-800 rounded-lg shadow-xl z-30 max-h-48 overflow-y-auto">
                  {searchResults.map((item) => (
                    <div
                      key={item.symbol}
                      onClick={() => handleSelectSymbol(item.symbol, item.price)}
                      className="px-3 py-2 hover:bg-slate-900 cursor-pointer flex items-center justify-between border-b border-slate-800/50 last:border-b-0"
                    >
                      <div>
                        <span className="font-bold text-white font-mono">{item.symbol}</span>
                        <span className="text-slate-400 text-[11px] ml-2">{item.name}</span>
                      </div>
                      <span className="font-mono text-emerald-400 text-xs font-semibold">
                        ${item.price.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quantity & Price Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-medium mb-1.5">
                {type === 'DEPOSIT' ? 'Amount ($)' : 'Quantity / Shares'}
              </label>
              <input
                type="number"
                step="any"
                min="0.000001"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                placeholder="0"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1.5">
                {type === 'DEPOSIT' ? 'Rate ($)' : 'Price Per Share ($)'}
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Date & Fees */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-medium mb-1.5">Transaction Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1.5">Fees & Commission ($)</label>
              <input
                type="number"
                step="any"
                min="0"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-slate-400 font-medium mb-1.5">Notes (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Robinhood limit order / DCA"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Transaction Summary Card */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between font-mono-numbers">
            <span className="text-slate-400 text-xs">Total Transaction Value:</span>
            <span className="text-base font-bold text-white">
              ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Save Transaction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
