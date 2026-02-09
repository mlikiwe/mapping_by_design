"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMappingContext } from '@/context';
import { Header, DetailView } from '@/app/components';

export default function DetailPage() {
  const router = useRouter();
  const { 
    stats, 
    results, 
    appMode,
    selectedItem,
    isHydrated,
    isDBLoading,
    setSelectedItem,
    handleReset 
  } = useMappingContext();

  // Redirect if no selected item or no results
  useEffect(() => {
    if (isHydrated && !isDBLoading) {
      if (!selectedItem || results.length === 0) {
        router.push('/results');
      }
    }
  }, [isHydrated, isDBLoading, selectedItem, results.length, router]);

  const handleLogoClick = async () => {
    await handleReset();
    router.push('/');
  };

  const handleBackToList = () => {
    setSelectedItem(null);
    router.push('/results');
  };

  // Loading state
  if (!isHydrated || isDBLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500 animate-pulse">Memuat...</div>
      </div>
    );
  }

  // No selected item guard
  if (!selectedItem) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <Header
        stats={stats}
        hasResults={results.length > 0}
        onLogoClick={handleLogoClick}
        currentView="detail"
        appMode={appMode}
      />

      <main className="flex-1 p-6 w-full max-w-480 mx-auto">
        <DetailView
          item={selectedItem}
          onBackToList={handleBackToList}
        />
      </main>
    </div>
  );
}
