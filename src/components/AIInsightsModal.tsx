import React, { useState } from 'react';
import { X, Sparkles, ShieldAlert, CheckCircle, Lightbulb, RefreshCw, Activity, ArrowUpRight } from 'lucide-react';
import { AIAnalysisResult, Holding, Portfolio } from '../types/portfolio';
import { analyzePortfolioWithAI } from '../services/api';

interface AIInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePortfolio: Portfolio;
  holdings: Holding[];
  totalValue: number;
}

export const AIInsightsModal: React.FC<AIInsightsModalProps> = ({
  isOpen,
  onClose,
  activePortfolio,
  holdings,
  totalValue
}) => {
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Trigger analysis if not already loaded
  React.useEffect(() => {
    if (isOpen && !analysis && holdings.length > 0) {
      runAnalysis();
    }
  }, [isOpen, holdings]);

  const runAnalysis = async () => {
    setIsLoading(true);
    try {
      const payload = holdings.map(h => ({
        symbol: h.symbol,
        name: h.name,
        shares: h.shares,
        weightPercent: h.weightPercent,
        marketValue: h.marketValue,
        sector: h.sector,
        assetClass: h.assetClass,
        unrealizedGainPercent: h.unrealizedGainPercent
      }));

      const res = await analyzePortfolioWithAI(payload, totalValue, activePortfolio.name);
      setAnalysis(res);
    } catch (err) {
      console.error('Failed to run AI analysis:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Gemini Portfolio Intelligence & Risk Audit
              </h3>
              <p className="text-xs text-slate-400">
                Institutional-grade risk assessment and portfolio optimization for {activePortfolio.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={runAnalysis}
              disabled={isLoading}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Refresh AI Audit"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-purple-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {isLoading ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-12 h-12 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <div className="text-slate-300 font-semibold text-sm">Auditing your holdings with Gemini AI...</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Analyzing asset allocation, beta covariance, tech concentration, and dividend health across {holdings.length} assets.
              </p>
            </div>
          ) : analysis ? (
            <div className="space-y-6">
              {/* Score & Verdict Banner */}
              <div className="bg-gradient-to-r from-purple-950/40 via-slate-950 to-slate-900 border border-purple-500/30 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-purple-300 font-semibold">
                    Portfolio Health Score
                  </span>
                  <div className="flex items-baseline gap-3 mt-1">
                    <span className="text-4xl font-extrabold text-white font-mono-numbers">
                      {analysis.healthScore}
                    </span>
                    <span className="text-slate-400 text-sm font-mono">/ 100</span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
                      {analysis.verdict}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="bg-slate-900/80 px-3.5 py-2 rounded-xl border border-slate-800 text-center">
                    <div className="text-slate-400 text-[10px] font-sans">Engine</div>
                    <div className="text-purple-300 font-bold mt-0.5">{analysis.engine || "Portfolio Engine"}</div>
                  </div>
                  <div className="bg-slate-900/80 px-3.5 py-2 rounded-xl border border-slate-800 text-center">
                    <div className="text-slate-400 text-[10px] font-sans">Diversification</div>
                    <div className="text-white font-bold mt-0.5">{analysis.diversificationRating}</div>
                  </div>
                  <div className="bg-slate-900/80 px-3.5 py-2 rounded-xl border border-slate-800 text-center">
                    <div className="text-slate-400 text-[10px] font-sans">Portfolio Beta</div>
                    <div className="text-white font-bold mt-0.5">{analysis.betaEstimate}</div>
                  </div>
                </div>
              </div>

              {analysis.notice && (
                <div className="bg-blue-950/20 border border-blue-500/20 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-blue-300">
                  <Sparkles className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                  <div className="leading-relaxed">
                    <span className="font-semibold text-white">Quantitative Portfolio Audit: </span>
                    {analysis.notice}
                  </div>
                </div>
              )}

              {/* Strengths */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>Key Strengths & Tailwinds</span>
                </div>
                <div className="space-y-2">
                  {analysis.strengths.map((str, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
                      <span>{str}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risks & Concentration */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-400">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Risk Factors & Concentration Flags</span>
                </div>
                <div className="space-y-2">
                  {analysis.risks.map((risk, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0"></span>
                      <span>{risk}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                  <Lightbulb className="w-4 h-4" />
                  <span>Actionable Optimization Recommendations</span>
                </div>
                <div className="space-y-2">
                  {analysis.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0"></span>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">
              No holdings found to analyze. Please add or import positions from Robinhood or Google Finance first.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
