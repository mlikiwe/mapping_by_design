"use client";

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useMappingContext } from '@/context';
import { Header, LandingView } from '@/app/components';
import { AppMode } from '@/types';

export default function Home() {
  const router = useRouter();
  const {
    stats,
    results,
    appMode,
    isHydrated,
    isDBLoading,
    setAppMode,
    handleReset
  } = useMappingContext();

  useEffect(() => {
    if (isHydrated && !isDBLoading && results.length > 0) {
      router.push('/results');
    }
  }, [isHydrated, isDBLoading, results.length, router]);

  const handleSelectMode = (mode: AppMode) => {
    setAppMode(mode);

    if (mode === 'planning') {
      router.push('/planning');
    } else if (mode === 'mapping') {
      router.push('/mapping');
    } else {
      router.push('/simulation');
    }
  };

  const handleLogoClick = async () => {
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

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <Header
        stats={stats}
        hasResults={results.length > 0}
        onLogoClick={handleLogoClick}
        currentView="landing"
        appMode={appMode}
      />

      <main className="flex-1 p-6 w-full max-w-480 mx-auto">
        <LandingView onSelectMode={handleSelectMode} />
      </main>
    </div>
  );
}