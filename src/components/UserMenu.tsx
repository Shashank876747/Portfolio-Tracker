import React, { useState, useRef, useEffect } from 'react';
import { User as UserIcon, LogOut, Cloud, Shield, Check, ChevronDown, Sparkles } from 'lucide-react';
import { logOutUser } from '../services/firebase';

interface UserMenuProps {
  currentUser: any | null;
  onOpenSignIn: () => void;
  onOpenSignUp: () => void;
  onSignOut: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  currentUser,
  onOpenSignIn,
  onOpenSignUp,
  onSignOut
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await logOutUser();
    } catch (e) {
      console.warn('Sign out warning:', e);
    }
    onSignOut();
    setIsOpen(false);
  };

  if (!currentUser) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenSignIn}
          className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          Sign In
        </button>
        <button
          onClick={onOpenSignUp}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
        >
          Sign Up
        </button>
      </div>
    );
  }

  const displayName = currentUser.displayName || currentUser.email?.split('@')[0] || 'Investor';
  const provider = currentUser.provider || (currentUser.providerData?.[0]?.providerId?.replace('.com', '') || 'google');
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 pl-2 pr-2.5 rounded-full bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
      >
        {currentUser.photoURL ? (
          <img
            src={currentUser.photoURL}
            alt={displayName}
            className="w-7 h-7 rounded-full object-cover border border-slate-700"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-[11px] font-bold text-white font-mono">
            {initials}
          </div>
        )}
        <span className="text-xs font-semibold text-white max-w-[100px] truncate hidden sm:inline">
          {displayName}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl z-50 p-3 space-y-3 animate-in fade-in zoom-in-95 duration-150">
          {/* User Info Header */}
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
            {currentUser.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt={displayName}
                className="w-10 h-10 rounded-full object-cover border border-slate-700"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-sm font-bold text-white font-mono">
                {initials}
              </div>
            )}
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-white truncate">{displayName}</div>
              <div className="text-[11px] text-slate-400 truncate">{currentUser.email}</div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 uppercase">
                  {provider}
                </span>
              </div>
            </div>
          </div>

          {/* Cloud Sync Status */}
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Cloud className="w-4 h-4 text-emerald-400" />
              <span>Firebase Cloud Sync</span>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-mono font-medium text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              ACTIVE
            </span>
          </div>

          {/* Sign Out Action */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
};
