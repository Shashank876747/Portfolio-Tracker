import React, { useState } from 'react';
import { X, Wallet, Plus, Minus, CheckCircle2 } from 'lucide-react';

interface CashModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCash: number;
  onUpdateCash: (newBalance: number, delta: number, type: 'DEPOSIT' | 'WITHDRAWAL') => void;
}

export const CashModal: React.FC<CashModalProps> = ({
  isOpen,
  onClose,
  currentCash,
  onUpdateCash
}) => {
  const [action, setAction] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT');
  const [amount, setAmount] = useState('1000');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;

    const newBalance = action === 'DEPOSIT' ? currentCash + val : Math.max(0, currentCash - val);
    onUpdateCash(newBalance, val, action);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Cash Balance Management</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Current Cash:</span>
            <span className="font-bold text-white font-mono text-sm">${currentCash.toLocaleString()}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAction('DEPOSIT')}
              className={`py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                action === 'DEPOSIT'
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Deposit
            </button>
            <button
              type="button"
              onClick={() => setAction('WITHDRAWAL')}
              className={`py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                action === 'WITHDRAWAL'
                  ? 'bg-rose-600 border-rose-500 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <Minus className="w-3.5 h-3.5" />
              Withdraw
            </button>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Transfer Amount ($)</label>
            <input
              type="number"
              step="any"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-blue-500 focus:outline-hidden"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-md shadow-blue-600/30"
            >
              Confirm Transfer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
