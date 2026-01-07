import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { NormalizedRow, DataQuality, Filters } from '@/types';

interface AppState {
  // Data
  rawData: NormalizedRow[];
  dataQuality: DataQuality | null;
  rawSample: any | null; // Amostra dos dados brutos para debug
  isLoading: boolean;
  error: string | null;

  // Filters
  filters: Filters;

  // Active tab
  activeTab: 'overview' | 'clients' | 'products' | 'basket' | 'predictions' | 'data';

  // Actions
  setData: (data: NormalizedRow[], quality: DataQuality, rawSample?: any) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Partial<Filters>) => void;
  resetFilters: () => void;
  setActiveTab: (tab: AppState['activeTab']) => void;
  clearData: () => void;
}

const defaultFilters: Filters = {
  gerenciaCodes: [],
  setores: [],
  ciclos: [],
  meiosCaptacao: [],
  entregaCategorias: [],
  searchRevendedora: '',
  searchProduto: '',
  incluirBrindesDoacao: false,
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      rawData: [],
      dataQuality: null,
      rawSample: null,
      isLoading: false,
      error: null,
      filters: defaultFilters,
      activeTab: 'overview',

      // Actions
      setData: (data, quality, rawSample) =>
        set({
          rawData: data,
          dataQuality: quality,
          rawSample: rawSample || null,
          isLoading: false,
          error: null,
        }),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) =>
        set({
          error,
          isLoading: false,
        }),

      setFilters: (newFilters) =>
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        })),

      resetFilters: () => set({ filters: defaultFilters }),

      setActiveTab: (tab) => set({ activeTab: tab }),

      clearData: () =>
        set({
          rawData: [],
          dataQuality: null,
          rawSample: null,
          error: null,
          filters: defaultFilters,
        }),
    }),
    {
      name: 'vendas-analytics-storage',
      partialize: (state) => ({
        filters: state.filters,
        activeTab: state.activeTab,
      }),
    }
  )
);
