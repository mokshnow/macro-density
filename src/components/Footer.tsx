import React from 'react';
import { Mail } from 'lucide-react';

export const Footer: React.FC = () => {
  const email = 'desaimoksh15@gmail.com';

  return (
    <footer className="border-t-2 border-gray-300 dark:border-white/30 bg-white dark:bg-[#0B0F17] py-4 mt-2 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Disclaimer Badge */}
          <span className="inline-flex items-center px-3.5 py-1.5 rounded-xl bg-[#F0FDF4] dark:bg-emerald-950/60 text-[#008A45] dark:text-[#00E676] border-2 border-[#BBF7D0] dark:border-emerald-800/60 font-bold text-xs shadow-2xs tracking-tight">
            Not Officially Endorsed by Kalshi.
          </span>

          {/* Email Draft Button */}
          <a
            href={`mailto:${email}?subject=Macro%20Density%20Inquiry%20%2F%20Feedback`}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border-2 border-gray-300 dark:border-white bg-gray-50 dark:bg-[#131924] hover:bg-white dark:hover:bg-[#1A2332] hover:border-gray-400 dark:hover:border-white text-xs font-bold text-gray-800 dark:text-gray-200 hover:text-gray-950 dark:hover:text-white transition-all shadow-2xs group cursor-pointer"
            title="Open email draft to contact creator"
          >
            <Mail className="w-3.5 h-3.5 text-[#008A45] dark:text-[#00E676] group-hover:scale-110 transition-transform" />
            <span>Contact</span>
          </a>
        </div>
      </div>
    </footer>
  );
};
