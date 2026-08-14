import React, { useState } from 'react';
import { INITIAL_MACRO_MARKETS } from './data/mockMarkets';
import { MacroMarket } from './types/market';
import { Header } from './components/Header';
import { MarketSelector } from './components/MarketSelector';
import { MacroHeroCard } from './components/MacroHeroCard';
import { DensityChart } from './components/DensityChart';
import { RiskMomentsCard } from './components/RiskMomentsCard';
import { HedgingSimulator } from './components/HedgingSimulator';
import { CustomMarketModal } from './components/CustomMarketModal';
import { ExportModal } from './components/ExportModal';
import { Footer } from './components/Footer';
import { Analytics } from '@vercel/analytics/react';

export function App() {
  const [markets, setMarkets] = useState<MacroMarket[]>(INITIAL_MACRO_MARKETS);
  const [selectedMarketId, setSelectedMarketId] = useState<string>(INITIAL_MACRO_MARKETS[0].id);

  // Modals state
  const [isCustomMarketOpen, setIsCustomMarketOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  const currentMarket = markets.find((m) => m.id === selectedMarketId) || markets[0];

  const handleAddCustomMarket = (newMarket: MacroMarket) => {
    setMarkets((prev) => [newMarket, ...prev]);
    setSelectedMarketId(newMarket.id);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-[#111827] bg-grid-subtle">
      {/* Top Header */}
      <Header
        onOpenCustomMarket={() => setIsCustomMarketOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        totalMarketsCount={markets.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        {/* Market Selector Bar */}
        <div className="mb-6">
          <MarketSelector
            markets={markets}
            selectedMarketId={selectedMarketId}
            onSelectMarket={setSelectedMarketId}
          />
        </div>

        {/* Macro Hero Card */}
        <MacroHeroCard market={currentMarket} />

        {/* Interactive Probability Distribution Visualizer */}
        <DensityChart market={currentMarket} />

        {/* Tail Risk Parameters */}
        <RiskMomentsCard
          moments={currentMarket.moments}
          unitSuffix={currentMarket.unitSuffix}
        />

        {/* Scenario & Tail Hedging Simulator */}
        <HedgingSimulator market={currentMarket} />
      </main>

      {/* Footer */}
      <Footer />

      {/* Modals & Dialogs */}
      <CustomMarketModal
        isOpen={isCustomMarketOpen}
        onClose={() => setIsCustomMarketOpen(false)}
        onAddMarket={handleAddCustomMarket}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        market={currentMarket}
      />

      <Analytics />
    </div>
  );
}

export default App;
