import React, { useState } from 'react';
import { Mail, Check, Copy } from 'lucide-react';

export const Footer: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const email = 'desaimoksh15@gmail.com';

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <footer className="border-t-2 border-gray-300 bg-white py-4 mt-2 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Disclaimer Badge */}
          <span className="inline-flex items-center px-3.5 py-1.5 rounded-xl bg-[#F0FDF4] text-[#008A45] border-2 border-[#BBF7D0] font-bold text-xs shadow-2xs tracking-tight">
            Not Officially Endorsed by Kalshi.
          </span>

          {/* Email Contact Feature - Same Height & Sizing */}
          <div className="inline-flex items-center rounded-xl border-2 border-gray-300 bg-gray-50 hover:bg-white hover:border-gray-400 transition-all shadow-2xs">
            <a
              href={`mailto:${email}?subject=Macro%20Density%20Inquiry%20%2F%20Feedback`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-gray-800 hover:text-gray-950 group"
              title="Send an email to the creator"
            >
              <Mail className="w-3.5 h-3.5 text-[#00D26A] group-hover:scale-110 transition-transform" />
              <span>Contact:</span>
              <span className="font-mono text-gray-950 font-semibold">
                {email}
              </span>
            </a>

            <button
              onClick={handleCopyEmail}
              className="px-2.5 py-1.5 border-l-2 border-gray-300 hover:bg-gray-200 text-gray-600 hover:text-gray-950 transition-colors cursor-pointer"
              title="Copy email to clipboard"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 animate-fade-in" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
