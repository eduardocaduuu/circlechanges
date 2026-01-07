import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { applyFilters } from '@/lib/parseExcel';
import FileUpload from '@/components/FileUpload';
import FiltersBar from '@/components/FiltersBar';
import TabNavigation from '@/components/TabNavigation';
import OverviewView from '@/views/OverviewView';
import ClientsView from '@/views/ClientsView';
import ProductsView from '@/views/ProductsView';
import BasketView from '@/views/BasketView';
import PredictionsView from '@/views/PredictionsView';
import DataView from '@/views/DataView';
import { BarChart3 } from 'lucide-react';

function App() {
  const { rawData, filters, activeTab } = useStore();

  // Apply filters
  const filteredData = useMemo(() => {
    if (rawData.length === 0) return [];
    return applyFilters(rawData, filters);
  }, [rawData, filters]);

  const hasData = rawData.length > 0;

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="glass-strong sticky top-0 z-50 border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-green rounded-lg glow">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold gradient-text">Vendas por Ciclo</h1>
              <p className="text-sm text-muted-foreground">Analytics Dashboard</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 mt-6">
        {!hasData ? (
          <div className="max-w-3xl mx-auto mt-20">
            <FileUpload />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Filters */}
            <FiltersBar />

            {/* Tabs */}
            <TabNavigation />

            {/* Content */}
            <div className="fade-in">
              {activeTab === 'overview' && <OverviewView data={filteredData} />}
              {activeTab === 'clients' && <ClientsView data={filteredData} />}
              {activeTab === 'products' && <ProductsView data={filteredData} />}
              {activeTab === 'basket' && <BasketView data={filteredData} />}
              {activeTab === 'predictions' && <PredictionsView data={filteredData} />}
              {activeTab === 'data' && <DataView data={filteredData} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
