import React from 'react';
import { Mail } from 'lucide-react';

export const Footer: React.FC = () => {
  const email = 'desaimoksh15@gmail.com';

  return (
    <footer className="border-t-2 border-gray-300 bg-white py-4 mt-2 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Disclaimer Badge */}
          <span className="inline-flex items-center px-3.5 py-1.5 rounded-xl bg-[#F0FDF4] text-[#008A45] border-2 border-[#BBF7D0] font-bold text-xs shadow-2xs tracking-tight">
            Not Officially Endorsed by Kalshi.
          </span>

          {/* Email Draft Button */}
          <a
            href={`mailto:${email}?subject=Macro%20Density%20Inquiry%20%2F%20Feedback`}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border-2 border-gray-300 bg-gray-50 hover:bg-white hover:border-gray-400 text-xs font-bold text-gray-800 hover:text-gray-950 transition-all shadow-2xs group cursor-pointer"
            title="Open email draft to contact creator"
          >
            <Mail className="w-3.5 h-3.5 text-[#008A45] group-hover:scale-110 transition-transform" />
            <span>Contact</span>
          </a>
        </div>
      </div>
    </footer>
  );
};
