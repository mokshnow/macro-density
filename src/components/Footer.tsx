import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-gray-200/80 bg-white py-6 mt-12 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#F0FDF4] text-[#008A45] border border-[#BBF7D0] font-bold text-xs sm:text-sm shadow-2xs tracking-tight">
          Not Officially Endorsed by Kalshi.
        </span>
      </div>
    </footer>
  );
};
