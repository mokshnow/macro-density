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
          <span className="inline-flex items-center px-3.5 py-1 rounded-full bg-[#F0FDF4] text-[#008A45] border border-[#BBF7D0] font-bold text-xs shadow-2xs tracking-tight">
            Not Officially Endorsed by Kalshi.
          </span>

          {/* Email Contact Feature */}
          <div className="flex items-center gap-2">
            <a
              href={`mailto:${email}?subject=Macro%20Density%20Inquiry%20%2F%20Feedback`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-gray-800 hover:text-gray-950 bg-gray-50 hover:bg-gray-100 border-2 border-gray-300 hover:border-gray-400 rounded-xl transition-all shadow-2xs group"
              title="Send an email to the creator"
            >
              <Mail className="w-3.5 h-3.5 text-[#00D26A] group-hover:scale-110 transition-transform" />
              <span>Contact:</span>
              <span className="font-mono text-gray-950 underline decoration-gray-300 hover:decoration-[#00D26A]">
                {email}
              </span>
            </a>

            <button
              onClick={handleCopyEmail}
              className="p-1.5 rounded-lg border-2 border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-950 transition-all shadow-2xs cursor-pointer"
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
