import React, { useState } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Sparkles,
  ClipboardCheck,
  Copy,
  ExternalLink
} from 'lucide-react';
import {
  parseRobinhoodCSV,
  parseGoogleFinanceCSV,
  SAMPLE_ROBINHOOD_CSV,
  SAMPLE_GOOGLE_FINANCE_CSV,
  exportToCSV,
  generateGoogleSheetsFormulas,
  ImportSummary
} from '../utils/importers';
import { Portfolio, Holding } from '../types/portfolio';

interface ImmigrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePortfolio: Portfolio;
  allPortfolios: Portfolio[];
  holdings: Holding[];
  onCompleteImport: (newPortfolioName: string, summary: ImportSummary, mergeIntoExisting: boolean) => void;
}

export const ImmigrationsModal: React.FC<ImmigrationsModalProps> = ({
  isOpen,
  onClose,
  activePortfolio,
  allPortfolios: _allPortfolios,
  holdings,
  onCompleteImport
}) => {
  const [activeTab, setActiveTab] = useState<'robinhood' | 'google-finance' | 'export'>('robinhood');
  const [rawText, setRawText] = useState('');
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importTarget, setImportTarget] = useState<'new' | 'merge'>('new');
  const [customPortfolioName, setCustomPortfolioName] = useState('');
  const [copiedFormula, setCopiedFormula] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  if (!isOpen) return null;

  const handleProcessRobinhood = (text: string) => {
    const summary = parseRobinhoodCSV(text);
    setImportSummary(summary);
    if (!customPortfolioName) {
      setCustomPortfolioName(`Robinhood (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`);
    }
  };

  const handleProcessGoogleFinance = (text: string) => {
    const summary = parseGoogleFinanceCSV(text);
    setImportSummary(summary);
    if (!customPortfolioName) {
      setCustomPortfolioName(`Google Finance (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`);
    }
  };

  const handleLoadSample = (type: 'robinhood' | 'google-finance') => {
    if (type === 'robinhood') {
      setRawText(SAMPLE_ROBINHOOD_CSV);
      handleProcessRobinhood(SAMPLE_ROBINHOOD_CSV);
    } else {
      setRawText(SAMPLE_GOOGLE_FINANCE_CSV);
      handleProcessGoogleFinance(SAMPLE_GOOGLE_FINANCE_CSV);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawText(content);
      if (activeTab === 'robinhood') {
        handleProcessRobinhood(content);
      } else {
        handleProcessGoogleFinance(content);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawText(content);
      if (activeTab === 'robinhood') {
        handleProcessRobinhood(content);
      } else {
        handleProcessGoogleFinance(content);
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = (type: 'robinhood' | 'google-finance') => {
    const content = type === 'robinhood' ? SAMPLE_ROBINHOOD_CSV : SAMPLE_GOOGLE_FINANCE_CSV;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${type}_portfolio_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadExport = (format: 'STANDARD' | 'GOOGLE_FINANCE' | 'ROBINHOOD') => {
    const csv = exportToCSV(holdings, format);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activePortfolio.name.replace(/\s+/g, '_')}_${format.toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyGoogleSheetsFormula = () => {
    const symbols = holdings.length > 0 ? holdings.map(h => h.symbol) : ['AAPL', 'NVDA', 'MSFT', 'GOOGL', 'AMZN'];
    const formulaText = generateGoogleSheetsFormulas(symbols);
    navigator.clipboard.writeText(formulaText);
    setCopiedFormula(true);
    setTimeout(() => setCopiedFormula(false), 2500);
  };

  const handleConfirmImport = () => {
    if (!importSummary || importSummary.transactions.length === 0) return;
    const name = importTarget === 'new' ? (customPortfolioName || `${activeTab === 'robinhood' ? 'Robinhood' : 'Google Finance'} Import`) : activePortfolio.name;
    onCompleteImport(name, importSummary, importTarget === 'merge');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Portfolio Immigrations & Data Sync
              </h2>
              <p className="text-xs text-slate-400">
                Seamlessly import transactions and holdings from Robinhood, Google Finance, or Google Sheets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-6">
          <button
            onClick={() => { setActiveTab('robinhood'); setImportSummary(null); setRawText(''); }}
            className={`py-3.5 px-4 font-medium text-sm border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'robinhood'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Robinhood Immigrations
          </button>
          <button
            onClick={() => { setActiveTab('google-finance'); setImportSummary(null); setRawText(''); }}
            className={`py-3.5 px-4 font-medium text-sm border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'google-finance'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            Google Finance & Sheets
          </button>
          <button
            onClick={() => { setActiveTab('export'); setImportSummary(null); }}
            className={`py-3.5 px-4 font-medium text-sm border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'export'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            Export & Google Sheets Sync
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[72vh] overflow-y-auto space-y-6">
          {activeTab === 'robinhood' && (
            <div className="space-y-6">
              {/* How it works guidance */}
              <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                <div className="text-xs space-y-1">
                  <div className="font-semibold text-emerald-300">How to export from Robinhood:</div>
                  <div className="text-slate-300 leading-relaxed">
                    1. On Robinhood Web or App, go to <strong className="text-white">Account</strong> &rarr; <strong className="text-white">Statements & History</strong>.<br />
                    2. Select <strong className="text-white">Recent Activity</strong> or <strong className="text-white">Reports</strong> and click <strong className="text-white">Generate CSV / Download</strong>.<br />
                    3. Upload the downloaded CSV file below, or click <strong className="text-emerald-400">Load Sample Robinhood CSV</strong> to test instantly!
                  </div>
                </div>
              </div>

              {/* Upload Drop Zone & Sample Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`md:col-span-2 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    dragOver ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 bg-slate-950/40 hover:border-slate-500'
                  }`}
                  onClick={() => document.getElementById('rh-file-input')?.click()}
                >
                  <input
                    id="rh-file-input"
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Upload className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <div className="text-sm font-semibold text-white">Click or Drag & Drop Robinhood CSV file</div>
                  <p className="text-xs text-slate-400 mt-1">Supports Robinhood Account Activity, Orders, or Holdings CSV</p>
                </div>

                <div className="space-y-2.5">
                  <button
                    onClick={() => handleLoadSample('robinhood')}
                    className="w-full h-[52px] bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded-xl px-4 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Load Robinhood Sample CSV
                  </button>
                  <button
                    onClick={() => handleDownloadTemplate('robinhood')}
                    className="w-full h-[52px] bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl px-4 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download className="w-4 h-4 text-slate-400" />
                    Download CSV Template
                  </button>
                </div>
              </div>

              {/* Raw CSV Text Paste Option */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                  <span>Or paste raw CSV text directly:</span>
                  {rawText && (
                    <button
                      onClick={() => { setRawText(''); setImportSummary(null); }}
                      className="text-slate-500 hover:text-slate-300 text-xs"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <textarea
                  rows={3}
                  value={rawText}
                  onChange={(e) => {
                    setRawText(e.target.value);
                    if (e.target.value.trim()) handleProcessRobinhood(e.target.value);
                  }}
                  placeholder="Activity Date,Process Date,Settle Date,Instrument,Description,Trans Code,Quantity,Price,Amount&#10;01/15/2024,01/15/2024,01/17/2024,AAPL,Apple Inc.,Buy,15.00,$185.92,-$2788.80..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:border-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>
          )}

          {activeTab === 'google-finance' && (
            <div className="space-y-6">
              {/* How it works guidance */}
              <div className="bg-blue-950/20 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                <div className="text-xs space-y-1">
                  <div className="font-semibold text-blue-300">How to export from Google Finance & Sheets:</div>
                  <div className="text-slate-300 leading-relaxed">
                    1. On <a href="https://www.google.com/finance" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-0.5">Google Finance <ExternalLink className="w-3 h-3" /></a>, open your Watchlist or Portfolio.<br />
                    2. Click the <strong className="text-white">three dots menu</strong> &rarr; <strong className="text-white">Download CSV</strong>.<br />
                    3. Or copy rows directly from your Google Sheets portfolio table and paste below!
                  </div>
                </div>
              </div>

              {/* Upload Drop Zone & Sample Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`md:col-span-2 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    dragOver ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 bg-slate-950/40 hover:border-slate-500'
                  }`}
                  onClick={() => document.getElementById('gf-file-input')?.click()}
                >
                  <input
                    id="gf-file-input"
                    type="file"
                    accept=".csv,.tsv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Upload className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <div className="text-sm font-semibold text-white">Click or Drag & Drop Google Finance CSV</div>
                  <p className="text-xs text-slate-400 mt-1">Supports Google Finance CSV exports or tab-separated Google Sheets copies</p>
                </div>

                <div className="space-y-2.5">
                  <button
                    onClick={() => handleLoadSample('google-finance')}
                    className="w-full h-[52px] bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 rounded-xl px-4 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    Load Google Finance Sample
                  </button>
                  <button
                    onClick={() => handleDownloadTemplate('google-finance')}
                    className="w-full h-[52px] bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl px-4 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download className="w-4 h-4 text-slate-400" />
                    Download CSV Template
                  </button>
                </div>
              </div>

              {/* Raw CSV/TSV Text Paste */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                  <span>Or paste Google Finance CSV / Google Sheets rows:</span>
                  {rawText && (
                    <button
                      onClick={() => { setRawText(''); setImportSummary(null); }}
                      className="text-slate-500 hover:text-slate-300 text-xs"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <textarea
                  rows={3}
                  value={rawText}
                  onChange={(e) => {
                    setRawText(e.target.value);
                    if (e.target.value.trim()) handleProcessGoogleFinance(e.target.value);
                  }}
                  placeholder="Symbol,Name,Shares,Purchase Price,Commission,Currency&#10;GOOGL,Alphabet Inc.,25,148.50,0.00,USD&#10;AMZN,Amazon.com Inc.,18,172.30,0.00,USD..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-6">
              <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-amber-300 flex items-center gap-2 mb-1">
                  <Download className="w-4 h-4" />
                  Export & Google Sheets Live Formulas
                </h4>
                <p className="text-xs text-slate-300">
                  Export your active portfolio ({activePortfolio.name}) into standard formats or generate live Google Finance formulas to use directly inside Google Sheets!
                </p>
              </div>

              {/* Export Format Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="font-semibold text-white text-sm">Universal Portfolio CSV</div>
                    <p className="text-xs text-slate-400 mt-1">Full holdings, cost basis, quantities, and current market values.</p>
                  </div>
                  <button
                    onClick={() => handleDownloadExport('STANDARD')}
                    className="mt-4 w-full bg-slate-800 hover:bg-slate-700 text-white rounded-lg py-2 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Universal CSV
                  </button>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="font-semibold text-white text-sm">Google Finance Format</div>
                    <p className="text-xs text-slate-400 mt-1">Compatible with Google Finance portfolio import tool.</p>
                  </div>
                  <button
                    onClick={() => handleDownloadExport('GOOGLE_FINANCE')}
                    className="mt-4 w-full bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 rounded-lg py-2 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Google Finance CSV
                  </button>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="font-semibold text-white text-sm">Robinhood Format</div>
                    <p className="text-xs text-slate-400 mt-1">Matches Robinhood equity and return summary layout.</p>
                  </div>
                  <button
                    onClick={() => handleDownloadExport('ROBINHOOD')}
                    className="mt-4 w-full bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 rounded-lg py-2 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Robinhood CSV
                  </button>
                </div>
              </div>

              {/* Google Sheets Live Formula Generator */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-semibold text-white">Google Sheets Real-Time Formula Table</span>
                  </div>
                  <button
                    onClick={handleCopyGoogleSheetsFormula}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 transition-colors"
                  >
                    {copiedFormula ? <ClipboardCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedFormula ? 'Copied to Clipboard!' : 'Copy Formulas for Google Sheets'}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Paste this directly into row A1 of a new Google Sheet to automatically link real-time prices and 52-week data:
                </p>
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 font-mono text-[11px] text-slate-300 max-h-36 overflow-y-auto whitespace-pre">
                  {generateGoogleSheetsFormulas(holdings.length > 0 ? holdings.map(h => h.symbol) : ['AAPL', 'NVDA', 'MSFT', 'GOOGL', 'AMZN'])}
                </div>
              </div>
            </div>
          )}

          {/* Parsed Summary & Confirmation Card (Shown when file is parsed) */}
          {importSummary && (
            <div className="border border-slate-700 bg-slate-950/80 rounded-xl p-5 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-bold text-white">
                    Parsed {importSummary.validRows} Records ({importSummary.positions.length} Active Positions)
                  </span>
                </div>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  Total Cost: ${importSummary.totalInvested.toLocaleString()}
                </span>
              </div>

              {/* Parsed Positions Preview Table */}
              <div className="border border-slate-800 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 font-mono text-[11px] border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Symbol</th>
                      <th className="py-2 px-3">Shares</th>
                      <th className="py-2 px-3">Avg Cost</th>
                      <th className="py-2 px-3">Total Invested</th>
                      <th className="py-2 px-3">Orders</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono-numbers">
                    {importSummary.positions.map((pos) => (
                      <tr key={pos.symbol} className="hover:bg-slate-900/40">
                        <td className="py-2 px-3 font-bold text-white flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                          {pos.symbol}
                        </td>
                        <td className="py-2 px-3 text-slate-200">{pos.shares}</td>
                        <td className="py-2 px-3 text-slate-200">${pos.averagePrice.toFixed(2)}</td>
                        <td className="py-2 px-3 text-slate-200">${pos.totalCost.toLocaleString()}</td>
                        <td className="py-2 px-3 text-slate-400">{pos.transactionCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Import Target Selection */}
              <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="text-xs font-semibold text-slate-300">Choose Destination Portfolio:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    onClick={() => setImportTarget('new')}
                    className={`border rounded-xl p-3 flex items-start gap-3 cursor-pointer transition-all ${
                      importTarget === 'new' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importTarget"
                      checked={importTarget === 'new'}
                      onChange={() => setImportTarget('new')}
                      className="mt-1"
                    />
                    <div>
                      <div className="text-xs font-bold text-white">Create New Portfolio</div>
                      <input
                        type="text"
                        value={customPortfolioName}
                        onChange={(e) => setCustomPortfolioName(e.target.value)}
                        placeholder="Portfolio Name"
                        className="mt-1.5 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white w-full focus:outline-hidden focus:border-blue-500"
                      />
                    </div>
                  </label>

                  <label
                    onClick={() => setImportTarget('merge')}
                    className={`border rounded-xl p-3 flex items-start gap-3 cursor-pointer transition-all ${
                      importTarget === 'merge' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importTarget"
                      checked={importTarget === 'merge'}
                      onChange={() => setImportTarget('merge')}
                      className="mt-1"
                    />
                    <div>
                      <div className="text-xs font-bold text-white">Merge Into Active Portfolio</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Will add {importSummary.positions.length} holdings into <strong>{activePortfolio.name}</strong>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {importSummary.errors.length > 0 && (
                <div className="text-xs text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importSummary.errors.length} non-trade rows skipped (e.g. headers or comments).</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Real-time quotes will automatically link to all imported tickers.
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            {importSummary && (
              <button
                onClick={handleConfirmImport}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
              >
                <span>Import {importSummary.positions.length} Positions</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
