"use client";
import { useState } from 'react';
import axios from 'axios';
import { OptimizationResult, OptimizationStats, CabangStats, ViewState } from '@/app/types';
import { Header, UploadView, ResultsTable, DetailView } from '@/app/components';

export default function Home() {
  const [view, setView] = useState<ViewState>('upload');
  const [fileDest, setFileDest] = useState<File | null>(null);
  const [fileOrig, setFileOrig] = useState<File | null>(null);
  const [results, setResults] = useState<OptimizationResult[]>([]);
  const [selectedItem, setSelectedItem] = useState<OptimizationResult | null>(null);
  const [selectedCabang, setSelectedCabang] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<OptimizationStats>({ match: 0, saving: 0, savingCost: 0 });
  const uniqueCabangs = Array.from(new Set(results.map((r) => r.CABANG))).sort();
  const filteredResults =
    selectedCabang === 'all'
      ? results
      : results.filter((r) => r.CABANG === selectedCabang);

  const cabangStats: CabangStats[] = uniqueCabangs.map((cabang) => ({
    cabang,
    count: results.filter((r) => r.CABANG === cabang).length,
    saving: results.filter((r) => r.CABANG === cabang).reduce((acc, r) => acc + (r.SAVING_KM || 0), 0),
  }));

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

      setResults(data);
      setStats({ match: data.length, saving: totalSaving, savingCost: totalSavingCost });

      setView('list');
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
  const handleViewDetail = (item: OptimizationResult) => {
    setSelectedItem(item);
    setView('detail');
  };

  const handleBackToList = () => {
    setSelectedItem(null);
    setView('list');
  };

  const handleBackToUpload = () => {
    setResults([]);
    setFileDest(null);
    setFileOrig(null);
    setSelectedCabang('all');
    setStats({ match: 0, saving: 0, savingCost: 0 });
    setView('upload');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <Header
        stats={stats}
        hasResults={results.length > 0}
        onLogoClick={handleBackToUpload}
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
            onBackToUpload={handleBackToUpload}
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