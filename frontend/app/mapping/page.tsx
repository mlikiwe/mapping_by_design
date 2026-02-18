"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useMappingContext } from '@/context';
import { Header, UploadView } from '@/app/components';
import { OptimizationResult } from '@/types';

export default function MappingPage() {
  const router = useRouter();
  const {
    stats,
    results,
    appMode,
    isHydrated,
    isDBLoading,
    setAppMode,
    saveToStorage,
    handleReset
  } = useMappingContext();

  const [fileDest, setFileDest] = useState<File | null>(null);
  const [fileOrig, setFileOrig] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleBackToLanding = () => {
    setAppMode(null);
    router.push('/');
  };

  const handleLogoClick = async () => {
    await handleReset();
    router.push('/');
  };

  const handleRun = async () => {
    if (!fileDest || !fileOrig) {
      alert('Harap upload kedua file!');
      return;
    }

    setLoading(true);

    const fd = new FormData();
    fd.append('file_dest', fileDest);
    fd.append('file_orig', fileOrig);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const res = await axios.post(`${apiUrl}/api/optimize`, fd);

      const { results: data, stats: backendStats } = res.data;

      const newStats = {
        match: backendStats.total_match,
        saving: backendStats.saving,
        savingCost: backendStats.saving_cost,
        total_origin: backendStats.total_origin,
        total_dest: backendStats.total_dest,
        cabang_breakdown: backendStats.cabang_breakdown
      };

      saveToStorage(data, newStats);
      setAppMode('mapping');

      router.push('/download');

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
        currentView="upload"
        appMode={appMode || 'mapping'}
      />

      <main className="flex-1 p-6 w-full max-w-480 mx-auto">
        <button
          onClick={handleBackToLanding}
          className="mb-6 text-slate-500 hover:text-slate-700 text-sm font-medium flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Kembali ke Menu Utama
        </button>

        <UploadView
          fileDest={fileDest}
          fileOrig={fileOrig}
          loading={loading}
          onFileDestChange={setFileDest}
          onFileOrigChange={setFileOrig}
          onRun={handleRun}
        />
      </main>
    </div>
  );
}
