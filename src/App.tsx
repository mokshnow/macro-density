import React, { useState } from 'react';
import { useKalshiLive } from './hooks/useKalshiLive';
import { MacroMarket } from './types/market';
import { Header } from './components/Header';
import { MarketSelector } from './components/MarketSelector';
import { MacroHeroCard } from './components/MacroHeroCard';
import { DensityChart } from './components/DensityChart';
import { FedRatePathFanChart } from './components/FedRatePathFanChart';
import { RiskMomentsCard } from './components/RiskMomentsCard';
import { StressTestCard } from './components/StressTestCard';
import { HedgingSimulator } from './components/HedgingSimulator';
import { CustomMarketModal } from './components/CustomMarketModal';
import { Footer } from './components/Footer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './context/ThemeContext';
import { Analytics } from '@vercel/analytics/react';

function MacroDensityApp() {
  const {
    markets,
    isRefreshing,
    refreshLive,
    addCustomMarket,
  } = useKalshiLive();

  const [selectedMarketId, setSelectedMarketId] = useState<string>(markets[0]?.id || 'kxcpiyoy-26aug');
  const [isCustomMarketOpen, setIsCustomMarketOpen] = useState<boolean>(false);

  // Fallback to selected market or first available market
  const currentMarket = markets.find((m) => m.id === selectedMarketId) || markets[0];

  const handleAddCustomMarket = (newMarket: MacroMarket) => {
    addCustomMarket(newMarket);
    setSelectedMarketId(newMarket.id);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] dark:bg-[#0B0F17] text-[#111827] dark:text-[#F8FAFC] bg-grid-subtle transition-colors duration-200">
      {/* Top Header */}
      <Header
        onOpenCustomMarket={() => setIsCustomMarketOpen(true)}
        isRefreshing={isRefreshing}
        onRefresh={refreshLive}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        {/* Market Selector Bar */}
        <div className="mb-6">
          <MarketSelector
            markets={markets}
            selectedMarketId={currentMarket?.id || selectedMarketId}
            onSelectMarket={setSelectedMarketId}
          />
        </div>

        {/* Macro Hero Card */}
        {currentMarket && (
          <ErrorBoundary fallbackTitle="Macro Overview Error">
            <MacroHeroCard
              market={currentMarket}
              isRefreshing={isRefreshing}
              onRefresh={refreshLive}
            />
          </ErrorBoundary>
        )}

        {/* Fed Funds Rate Path & Uncertainty Fan Chart (when policy rate path exists) */}
        {currentMarket?.ratePath && currentMarket.ratePath.length > 0 && (
          <ErrorBoundary fallbackTitle="Rate Path Fan Chart Error">
            <FedRatePathFanChart
              ratePath={currentMarket.ratePath}
              unitSuffix={currentMarket.unitSuffix}
            />
          </ErrorBoundary>
        )}

        {/* Interactive Probability Distribution Visualizer */}
        {currentMarket && (
          <ErrorBoundary fallbackTitle="Density Visualizer Error">
            <DensityChart market={currentMarket} />
          </ErrorBoundary>
        )}

        {/* Distribution Moments & Tail Risk Parameters */}
        {currentMarket && (
          <ErrorBoundary fallbackTitle="Moments Card Error">
            <RiskMomentsCard
              moments={currentMarket.moments}
              unitSuffix={currentMarket.unitSuffix}
            />
          </ErrorBoundary>
        )}

        {/* Macro Stress-Test & What-If Scenario Shifter */}
        {currentMarket && (
          <ErrorBoundary fallbackTitle="Stress Test Error">
            <StressTestCard market={currentMarket} />
          </ErrorBoundary>
        )}

        {/* Scenario & Tail Hedging Simulator */}
        {currentMarket && (
          <ErrorBoundary fallbackTitle="Hedging Simulator Error">
            <HedgingSimulator market={currentMarket} />
          </ErrorBoundary>
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Modals & Dialogs */}
      <CustomMarketModal
        isOpen={isCustomMarketOpen}
        onClose={() => setIsCustomMarketOpen(false)}
        onAddMarket={handleAddCustomMarket}
      />

      <Analytics />
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <MacroDensityApp />
    </ThemeProvider>
  );
}

export default App;
