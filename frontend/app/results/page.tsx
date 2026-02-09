"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMappingContext } from '@/context';
import { Header, ResultsTable } from '@/app/components';

export default function ResultsPage() {
  const router = useRouter();
  const { 
    stats, 
    results, 
    appMode,
    uniqueCabangs,
    cabangStats,
    isHydrated,
    isDBLoading,
    setSelectedItem,
    handleReset 
  } = useMappingContext();

  const [selectedCabang, setSelectedCabang] = useState<string>('all');

  // Redirect if no results
  useEffect(() => {
    if (isHydrated && !isDBLoading && results.length === 0) {
      router.push('/');
    }
  }, [isHydrated, isDBLoading, results.length, router]);

  const filteredResults =
    selectedCabang === 'all'
      ? results
      : results.filter((r) => r.CABANG === selectedCabang);

  const handleLogoClick = async () => {
    await handleReset();
    router.push('/');
  };

  const handleViewDetail = (item: typeof results[0]) => {
    setSelectedItem(item);
    router.push('/detail');
  };

  const handleBackToUpload = async () => {
    await handleReset();
    router.push('/');
  };

  // Loading state
  if (!isHydrated || isDBLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500 animate-pulse">Memuat...</div>
      </div>
    );
  }

  // No results guard
  if (results.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <Header
        stats={stats}
        hasResults={results.length > 0}
        onLogoClick={handleLogoClick}
        currentView="list"
        appMode={appMode}
      />

      <main className="flex-1 p-6 w-full max-w-480 mx-auto">
        <ResultsTable
          results={results}
          filteredResults={filteredResults}
          cabangStats={cabangStats}
          uniqueCabangs={uniqueCabangs}
          selectedCabang={selectedCabang}
          onSelectCabang={setSelectedCabang}
          onViewDetail={handleViewDetail}
          onBackToUpload={handleBackToUpload}
          appMode={appMode}
        />
      </main>
    </div>
  );
}
