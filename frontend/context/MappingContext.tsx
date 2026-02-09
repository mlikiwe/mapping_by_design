"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { OptimizationResult, OptimizationStats, AppMode } from '@/types';
import { useIndexedDB, STORAGE_KEYS, clearAllMappingData } from '@/hooks';

interface MappingContextType {
  // Data State
  results: OptimizationResult[];
  stats: OptimizationStats;
  appMode: AppMode | null;
  selectedItem: OptimizationResult | null;
  
  // Loading State
  isHydrated: boolean;
  isDBLoading: boolean;
  
  // Setters
  setResults: (results: OptimizationResult[]) => void;
  setStats: (stats: OptimizationStats) => void;
  setAppMode: (mode: AppMode | null) => void;
  setSelectedItem: (item: OptimizationResult | null) => void;
  
  // Derived State
  uniqueCabangs: string[];
  cabangStats: { cabang: string; count: number; saving: number; savingCost: number }[];
  
  // Actions
  handleReset: () => Promise<void>;
  saveToStorage: (data: OptimizationResult[], stats: OptimizationStats) => void;
}

const MappingContext = createContext<MappingContextType | undefined>(undefined);

export function MappingProvider({ children }: { children: ReactNode }) {
  // IndexedDB persistence
  const [storedResults, setStoredResults, clearStoredResults, isLoadingResults] = useIndexedDB<OptimizationResult[]>(
    STORAGE_KEYS.MAPPING_RESULTS,
    []
  );
  const [storedStats, setStoredStats, clearStoredStats, isLoadingStats] = useIndexedDB<OptimizationStats>(
    STORAGE_KEYS.MAPPING_STATS,
    { match: 0, saving: 0, savingCost: 0 }
  );
  const [storedMode, setStoredMode, , isLoadingMode] = useIndexedDB<AppMode | null>(
    STORAGE_KEYS.APP_MODE,
    null
  );

  // Local state
  const [results, setResultsState] = useState<OptimizationResult[]>([]);
  const [stats, setStatsState] = useState<OptimizationStats>({ match: 0, saving: 0, savingCost: 0 });
  const [appMode, setAppModeState] = useState<AppMode | null>(null);
  const [selectedItem, setSelectedItem] = useState<OptimizationResult | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  const isDBLoading = isLoadingResults || isLoadingStats || isLoadingMode;

  // Clean up old localStorage data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const oldKeys = ['roundtrip_mapping_results', 'roundtrip_mapping_stats', 'roundtrip_view_state'];
      oldKeys.forEach(key => {
        try {
          window.localStorage.removeItem(key);
        } catch {
          // Ignore errors
        }
      });
    }
  }, []);

  // Hydrate from IndexedDB
  useEffect(() => {
    if (isDBLoading) return;

    if (storedResults.length > 0) {
      setResultsState(storedResults);
      setStatsState(storedStats);
      setAppModeState(storedMode);
    }
    setIsHydrated(true);
  }, [isDBLoading, storedResults, storedStats, storedMode]);

  // Derived state
  const uniqueCabangs = Array.from(new Set(results.map((r) => r.CABANG))).sort();
  
  const cabangStats = uniqueCabangs.map((cabang) => ({
    cabang,
    count: results.filter((r) => r.CABANG === cabang).length,
    saving: results.filter((r) => r.CABANG === cabang).reduce((acc, r) => acc + (r.SAVING_KM || 0), 0),
    savingCost: results.filter((r) => r.CABANG === cabang).reduce((acc, r) => acc + (r.SAVING_COST || 0), 0),
  }));

  // Setters with persistence
  const setResults = useCallback((newResults: OptimizationResult[]) => {
    setResultsState(newResults);
    setStoredResults(newResults);
  }, [setStoredResults]);

  const setStats = useCallback((newStats: OptimizationStats) => {
    setStatsState(newStats);
    setStoredStats(newStats);
  }, [setStoredStats]);

  const setAppMode = useCallback((mode: AppMode | null) => {
    setAppModeState(mode);
    setStoredMode(mode);
  }, [setStoredMode]);

  // Save results and stats together
  const saveToStorage = useCallback((data: OptimizationResult[], newStats: OptimizationStats) => {
    setResultsState(data);
    setStatsState(newStats);
    setStoredResults(data);
    setStoredStats(newStats);
  }, [setStoredResults, setStoredStats]);

  // Reset handler
  const handleReset = useCallback(async () => {
    await clearAllMappingData();
    clearStoredResults();
    clearStoredStats();
    setStoredMode(null);

    setResultsState([]);
    setStatsState({ match: 0, saving: 0, savingCost: 0 });
    setAppModeState(null);
    setSelectedItem(null);
  }, [clearStoredResults, clearStoredStats, setStoredMode]);

  return (
    <MappingContext.Provider
      value={{
        results,
        stats,
        appMode,
        selectedItem,
        isHydrated,
        isDBLoading,
        setResults,
        setStats,
        setAppMode,
        setSelectedItem,
        uniqueCabangs,
        cabangStats,
        handleReset,
        saveToStorage,
      }}
    >
      {children}
    </MappingContext.Provider>
  );
}

export function useMappingContext() {
  const context = useContext(MappingContext);
  if (context === undefined) {
    throw new Error('useMappingContext must be used within a MappingProvider');
  }
  return context;
}
