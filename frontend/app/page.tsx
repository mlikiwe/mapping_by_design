"use client";
import { useState, useEffect } from 'react';
import axios from 'axios';
import { OptimizationResult, OptimizationStats, CabangStats, ViewState } from '@/app/types';
import { Header, UploadView, ResultsTable, DetailView } from '@/app/components';
import { useIndexedDB, STORAGE_KEYS, clearAllMappingData } from '@/app/hooks';

export default function Home() {
  // State dengan IndexedDB persistence (kapasitas besar, tidak ada quota error)
  const [storedResults, setStoredResults, clearStoredResults, isLoadingResults] = useIndexedDB<OptimizationResult[]>(
    STORAGE_KEYS.MAPPING_RESULTS,
    []
  );
  const [storedStats, setStoredStats, clearStoredStats, isLoadingStats] = useIndexedDB<OptimizationStats>(
    STORAGE_KEYS.MAPPING_STATS,
    { match: 0, saving: 0, savingCost: 0 }
  );
  const [storedView, setStoredView, , isLoadingView] = useIndexedDB<ViewState>(
    STORAGE_KEYS.VIEW_STATE,
    'upload'
  );

  // Local state
  const [results, setResults] = useState<OptimizationResult[]>([]);
  const [stats, setStats] = useState<OptimizationStats>({ match: 0, saving: 0, savingCost: 0 });
  const [view, setView] = useState<ViewState>('upload');
  const [isHydrated, setIsHydrated] = useState(false);

  const [fileDest, setFileDest] = useState<File | null>(null);
  const [fileOrig, setFileOrig] = useState<File | null>(null);
  const [selectedItem, setSelectedItem] = useState<OptimizationResult | null>(null);
  const [selectedCabang, setSelectedCabang] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  // Check if IndexedDB is still loading
  const isDBLoading = isLoadingResults || isLoadingStats || isLoadingView;

  // Clear old localStorage data (migrated to IndexedDB)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Clean up old localStorage keys that caused quota errors
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

  // Hydrate dari IndexedDB saat pertama kali load
  useEffect(() => {
    if (isDBLoading) return;

    if (storedResults.length > 0) {
      setResults(storedResults);
      setStats(storedStats);
      // Jika ada results, tampilkan list view (kecuali sedang di detail)
      setView(storedView === 'detail' ? 'list' : storedView);
    }
    setIsHydrated(true);
  }, [isDBLoading, storedResults, storedStats, storedView]);

  // Derived state
  const uniqueCabangs = Array.from(new Set(results.map((r) => r.CABANG))).sort();
  const filteredResults =
    selectedCabang === 'all'
      ? results
      : results.filter((r) => r.CABANG === selectedCabang);

  const cabangStats: CabangStats[] = uniqueCabangs.map((cabang) => ({
    cabang,
    count: results.filter((r) => r.CABANG === cabang).length,
    saving: results.filter((r) => r.CABANG === cabang).reduce((acc, r) => acc + (r.SAVING_KM || 0), 0),
    savingCost: results.filter((r) => r.CABANG === cabang).reduce((acc, r) => acc + (r.SAVING_COST || 0), 0),
  }));

  // Handler untuk menjalankan optimasi
  const handleRun = async () => {
    if (!fileDest || !fileOrig) {
      alert('Harap upload kedua file!');
      return;
    }

    setLoading(true);
    setResults([]);

    const fd = new FormData();
    fd.append('file_dest', fileDest);
    fd.append('file_orig', fileOrig);

    try {
      const res = await axios.post('http://127.0.0.1:8000/api/optimize', fd);
      const data: OptimizationResult[] = res.data;

      const totalSaving = data.reduce(
        (acc, curr) => acc + (curr.SAVING_KM || 0),
        0
      );
      const totalSavingCost = data.reduce(
        (acc, curr) => acc + (curr.SAVING_COST || 0),
        0
      );

      const newStats = { match: data.length, saving: totalSaving, savingCost: totalSavingCost };

      // Update local state
      setResults(data);
      setStats(newStats);
      setView('list');

      // Persist ke IndexedDB (kapasitas besar, tidak ada quota error)
      setStoredResults(data);
      setStoredStats(newStats);
      setStoredView('list');

    } catch (e: unknown) {
      console.error(e);
      const errorMessage =
        e instanceof Error
          ? e.message
          : (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Unknown error';
      alert('Gagal memproses: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handler untuk melihat detail
  const handleViewDetail = (item: OptimizationResult) => {
    setSelectedItem(item);
    setView('detail');
    setStoredView('detail');
  };

  // Handler untuk kembali ke list
  const handleBackToList = () => {
    setSelectedItem(null);
    setView('list');
    setStoredView('list');
  };

  // Handler untuk reset dan kembali ke upload (CLEAR SEMUA DATA)
  const handleReset = async () => {
    // Clear IndexedDB
    await clearAllMappingData();
    clearStoredResults();
    clearStoredStats();
    setStoredView('upload');

    // Clear local state
    setResults([]);
    setStats({ match: 0, saving: 0, savingCost: 0 });
    setFileDest(null);
    setFileOrig(null);
    setSelectedCabang('all');
    setSelectedItem(null);
    setView('upload');
  };

  // Loading state saat hydrating
  if (!isHydrated || isDBLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500 animate-pulse">Memuat...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <Header
        stats={stats}
        hasResults={results.length > 0}
        onLogoClick={handleReset}
      />

      <main className="flex-1 p-6 w-full max-w-480 mx-auto">
        {view === 'upload' && (
          <UploadView
            fileDest={fileDest}
            fileOrig={fileOrig}
            loading={loading}
            onFileDestChange={setFileDest}
            onFileOrigChange={setFileOrig}
            onRun={handleRun}
          />
        )}

        {view === 'list' && (
          <ResultsTable
            results={results}
            filteredResults={filteredResults}
            cabangStats={cabangStats}
            uniqueCabangs={uniqueCabangs}
            selectedCabang={selectedCabang}
            onSelectCabang={setSelectedCabang}
            onViewDetail={handleViewDetail}
            onBackToUpload={handleReset}
          />
        )}

        {view === 'detail' && selectedItem && (
          <DetailView
            item={selectedItem}
            onBackToList={handleBackToList}
          />
        )}
      </main>
    </div>
  );
}