import React from 'react';
import { PlusCircle, RefreshCw, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

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
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0B0F17]/95 backdrop-blur-md border-b-2 border-gray-300 dark:border-white transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 py-3.5">
          {/* Brand Title */}
          <div>
            <span className="font-extrabold text-2xl sm:text-3xl tracking-tight text-gray-950 dark:text-white font-sans leading-none block">
              Macro Density
            </span>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Dark/Light Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-700 dark:text-gray-200 hover:text-gray-950 dark:hover:text-white bg-white dark:bg-[#131924] hover:bg-gray-50 dark:hover:bg-[#1A2332] border-2 border-gray-300 dark:border-white rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-90 duration-200" />
              ) : (
                <Moon className="w-4 h-4 text-gray-700 animate-in spin-in-90 duration-200" />
              )}
            </button>

            {/* Quick Refresh Icon Button */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="p-2 text-gray-700 dark:text-gray-200 hover:text-gray-950 dark:hover:text-white bg-white dark:bg-[#131924] hover:bg-gray-50 dark:hover:bg-[#1A2332] border-2 border-gray-300 dark:border-white rounded-xl transition-all shadow-2xs cursor-pointer disabled:opacity-50 active:scale-95"
                title="Refresh live Kalshi market prices"
              >
                <RefreshCw className={`w-4 h-4 text-[#00D26A] ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            )}

            {/* Custom URL Importer */}
            <button
              onClick={onOpenCustomMarket}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-gray-800 dark:text-gray-200 hover:text-gray-950 dark:hover:text-white bg-white dark:bg-[#131924] hover:bg-gray-50 dark:hover:bg-[#1A2332] border-2 border-gray-300 dark:border-white rounded-xl transition-colors shadow-2xs cursor-pointer active:scale-95"
              title="Load custom Kalshi Market URL"
            >
              <PlusCircle className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
              <span className="hidden sm:inline">Add Kalshi URL</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
