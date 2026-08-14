import React, { useState } from 'react';
import { MacroMarket } from '../types/market';
import { exportToPDF, exportToCSV, exportToJSON, generatePythonSnippet } from '../utils/exporter';
import { X, Download, FileText, Code2, Copy, Check, Table, FileSpreadsheet } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  market: MacroMarket;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  market,
}) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'options' | 'python'>('options');

  if (!isOpen) return null;

  const pythonCode = generatePythonSnippet(market);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyMarkdownTable = () => {
    let md = `| Range | Implied Mass | CDF | Mode |\n|---|---|---|---|\n`;
    market.bins.forEach((b) => {
      md += `| ${b.label} | ${b.probability}% | ${b.cumulativeProb}% | ${b.isMode ? '✓ Peak' : ''} |\n`;
    });
    handleCopy(md, 'markdown');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl border-2 border-gray-400 shadow-elevated max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between pb-4 border-b-2 border-gray-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-[#00A854] border border-[#BBF7D0]">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-gray-950 tracking-tight">
                Extract Probability Density Data
              </h2>
              <p className="text-xs text-gray-600 font-medium">
                {market.title} ({market.eventTicker})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-950 hover:bg-gray-100 transition-colors border border-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex gap-2 my-4 border-b-2 border-gray-200 pb-2">
          <button
            onClick={() => setActiveTab('options')}
            className={`text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'options'
                ? 'bg-gray-950 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Export Formats
          </button>
          <button
            onClick={() => setActiveTab('python')}
            className={`text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'python'
                ? 'bg-gray-950 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Python / Pandas Snippet</span>
          </button>
        </div>

        {activeTab === 'options' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            {/* 1. PDF Document Export */}
            <button
              onClick={() => exportToPDF(market)}
              className="p-4 rounded-xl border-2 border-emerald-400 bg-emerald-50/40 hover:border-[#00D26A] hover:bg-[#F0FDF4] transition-all text-left group flex flex-col justify-between shadow-2xs"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-emerald-100 text-[#008A45] group-hover:bg-[#00D26A] group-hover:text-white transition-colors">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono font-bold bg-emerald-100 text-[#008A45] border border-emerald-300 px-2 py-0.5 rounded">
                  .PDF
                </span>
              </div>
              <div>
                <div className="font-bold text-gray-950 text-xs">Printable PDF Report</div>
                <div className="text-[11px] text-gray-600 mt-0.5 font-medium">
                  High-fidelity institutional memo with summary, statistical moments, and PDF tables.
                </div>
              </div>
            </button>

            {/* 2. CSV Download */}
            <button
              onClick={() => exportToCSV(market)}
              className="p-4 rounded-xl border-2 border-gray-300 hover:border-[#00D26A] hover:bg-[#F0FDF4]/30 transition-all text-left group flex flex-col justify-between shadow-2xs"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-gray-100 group-hover:bg-[#00D26A]/10 text-gray-700 group-hover:text-[#00A854] transition-colors border border-gray-200">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono font-bold bg-gray-100 text-gray-700 border border-gray-300 px-1.5 py-0.5 rounded">
                  .CSV
                </span>
              </div>
              <div>
                <div className="font-bold text-gray-950 text-xs">Spreadsheet Data (CSV)</div>
                <div className="text-[11px] text-gray-600 mt-0.5 font-medium">
                  Bins, cumulative probabilities, and statistical moments for Excel / Sheets.
                </div>
              </div>
            </button>

            {/* 3. JSON Download */}
            <button
              onClick={() => exportToJSON(market)}
              className="p-4 rounded-xl border-2 border-gray-300 hover:border-[#00D26A] hover:bg-[#F0FDF4]/30 transition-all text-left group flex flex-col justify-between shadow-2xs"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-gray-100 group-hover:bg-[#00D26A]/10 text-gray-700 group-hover:text-[#00A854] transition-colors border border-gray-200">
                  <Code2 className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono font-bold bg-gray-100 text-gray-700 border border-gray-300 px-1.5 py-0.5 rounded">
                  .JSON
                </span>
              </div>
              <div>
                <div className="font-bold text-gray-950 text-xs">Structured Quant JSON</div>
                <div className="text-[11px] text-gray-600 mt-0.5 font-medium">
                  Programmatic schema for quant trading pipelines and model feeds.
                </div>
              </div>
            </button>

            {/* 4. Copy Markdown Table */}
            <button
              onClick={handleCopyMarkdownTable}
              className="p-4 rounded-xl border-2 border-gray-300 hover:border-[#00D26A] hover:bg-[#F0FDF4]/30 transition-all text-left group flex flex-col justify-between shadow-2xs"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-gray-100 group-hover:bg-[#00D26A]/10 text-gray-700 group-hover:text-[#00A854] transition-colors border border-gray-200">
                  <Table className="w-4 h-4" />
                </div>
                {copiedType === 'markdown' ? (
                  <span className="text-[10px] font-bold text-[#00A854] flex items-center gap-1">
                    <Check className="w-3 h-3" /> Copied!
                  </span>
                ) : (
                  <Copy className="w-3.5 h-3.5 text-gray-500" />
                )}
              </div>
              <div>
                <div className="font-bold text-gray-950 text-xs">Copy Markdown Table</div>
                <div className="text-[11px] text-gray-600 mt-0.5 font-medium">
                  Clean markdown table for Slack, Notion, research memos, or notes.
                </div>
              </div>
            </button>
          </div>
        ) : (
          <div className="py-2">
            <div className="relative">
              <pre className="bg-gray-950 text-gray-100 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-[300px] border-2 border-gray-800">
                {pythonCode}
              </pre>
              <button
                onClick={() => handleCopy(pythonCode, 'python')}
                className="absolute top-3 right-3 px-2.5 py-1 text-xs font-bold rounded-lg bg-gray-800 hover:bg-gray-700 text-white flex items-center gap-1.5 border border-gray-600 shadow-sm"
              >
                {copiedType === 'python' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#00D26A]" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
