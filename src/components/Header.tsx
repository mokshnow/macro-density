import React from 'react';
import { PlusCircle, RefreshCw } from 'lucide-react';

interface HeaderProps {
  onOpenCustomMarket: () => void;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenCustomMarket,
  isRefreshing = false,
  onRefresh,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b-2 border-gray-300 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 py-3.5">
          {/* Brand Title */}
          <div>
            <span className="font-extrabold text-2xl sm:text-3xl tracking-tight text-gray-950 font-sans leading-none block">
              Macro Density
            </span>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Quick Refresh Icon Button */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="p-2 text-gray-700 hover:text-gray-950 bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 rounded-xl transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                title="Refresh live Kalshi market prices"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#00D26A] ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            )}

            {/* Custom URL Importer */}
            <button
              onClick={onOpenCustomMarket}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-gray-800 hover:text-gray-950 bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 rounded-xl transition-colors shadow-2xs cursor-pointer"
              title="Load custom Kalshi Market URL"
            >
              <PlusCircle className="w-3.5 h-3.5 text-gray-600" />
              <span className="hidden sm:inline">Add Kalshi URL</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
