"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { useMappingContext } from '@/context';
import { Header } from '@/app/components';
import { OptimizationResult } from '@/types';

export default function SimulationPage() {
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

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBackToLanding = () => {
    setAppMode(null);
    router.push('/');
  };

  const handleLogoClick = async () => {
    await handleReset();
    router.push('/');
  };

  const handleFileChange = (selectedFile: File | null) => {
    setFile(selectedFile);
    setError(null);
  };

  const handleLoadFile = async () => {
    if (!file) {
      setError('Pilih file terlebih dahulu');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      
      // Get first sheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as OptimizationResult[];
      
      // Validate required fields
      if (jsonData.length === 0) {
        throw new Error('File tidak memiliki data');
      }

      // Check if it's a valid mapping result file
      const requiredFields = ['DEST_ID', 'ORIG_ID', 'CABANG', 'STATUS'];
      const firstRow = jsonData[0];
      const missingFields = requiredFields.filter(field => !(field in firstRow));
      
      if (missingFields.length > 0) {
        throw new Error(`File tidak valid. Kolom yang diperlukan tidak ditemukan: ${missingFields.join(', ')}`);
      }

      // Helper function to parse coordinate strings back to arrays
      const parseCoords = (value: unknown): [number, number] | undefined => {
        if (!value) return undefined;
        if (Array.isArray(value) && value.length === 2) {
          return [Number(value[0]), Number(value[1])];
        }
        if (typeof value === 'string' && value.includes(',')) {
          const parts = value.split(',').map(Number);
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            return [parts[0], parts[1]];
          }
        }
        return undefined;
      };

      // Parse numeric fields and coordinate fields
      const parsedResults: OptimizationResult[] = jsonData.map((row) => ({
        ...row,
        JARAK_TRIANGULASI: Number(row.JARAK_TRIANGULASI) || 0,
        JARAK_VIA_PORT: Number(row.JARAK_VIA_PORT) || 0,
        JARAK_BONGKAR_MUAT: Number(row.JARAK_BONGKAR_MUAT) || 0,
        SAVING_KM: Number(row.SAVING_KM) || 0,
        COST_TRIANGULASI: Number(row.COST_TRIANGULASI) || 0,
        COST_VIA_PORT: Number(row.COST_VIA_PORT) || 0,
        SAVING_COST: Number(row.SAVING_COST) || 0,
        SCORE_FINAL: Number(row.SCORE_FINAL) || 0,
        EST_PERJALANAN_JAM: Number(row.EST_PERJALANAN_JAM) || 0,
        GAP_WAKTU_ASLI: Number(row.GAP_WAKTU_ASLI) || 0,
        // Parse coordinate strings back to arrays
        origin_coords: parseCoords(row.origin_coords),
        dest_coords: parseCoords(row.dest_coords),
        port_coords: parseCoords(row.port_coords),
      }));

      const totalSaving = parsedResults.reduce((acc, curr) => acc + (curr.SAVING_KM || 0), 0);
      const totalSavingCost = parsedResults.reduce((acc, curr) => acc + (curr.SAVING_COST || 0), 0);
      const newStats = { match: parsedResults.length, saving: totalSaving, savingCost: totalSavingCost };

      // Save to context and IndexedDB
      saveToStorage(parsedResults, newStats);
      setAppMode('simulation');

      // Navigate to results
      router.push('/results');

    } catch (err) {
      console.error('Error loading file:', err);
      setError(err instanceof Error ? err.message : 'Gagal membaca file');
    } finally {
      setLoading(false);
    }
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
        currentView="simulation-upload"
        appMode={appMode || 'simulation'}
      />

      <main className="flex-1 p-6 w-full max-w-480 mx-auto">
        <div className="max-w-2xl mx-auto mt-16 animate-in fade-in slide-in-from-bottom-8">
          {/* Back Button */}
          <button
            onClick={handleBackToLanding}
            className="mb-6 text-slate-500 hover:text-slate-700 text-sm font-medium flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Kembali ke Menu Utama
          </button>

          <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 flex flex-col gap-6">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Upload Hasil Mapping</h2>
              <p className="text-slate-500 text-sm">
                Upload file Excel hasil mapping untuk visualisasi
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                File Hasil Mapping
              </label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer border border-slate-200 rounded-lg"
              />
              {file && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ {file.name}
                </p>
              )}
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              </div>
            )}

            <button
              onClick={handleLoadFile}
              disabled={loading || !file}
              className={`w-full py-4 rounded-xl font-bold text-white text-lg transition-all shadow-lg ${
                loading || !file
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/30'
              }`}
            >
              {loading ? 'Memuat Data...' : 'Lihat Hasil Mapping'}
            </button>

            {/* Info Box */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Format File yang Diterima
              </h4>
              <ul className="text-xs text-slate-500 space-y-1">
                <li>• File Excel (.xlsx) hasil download dari menu Mapping</li>
                <li>• Harus memiliki kolom: DEST_ID, ORIG_ID, CABANG, STATUS</li>
                <li>• Kolom tambahan: SAVING_KM, SAVING_COST, dll akan digunakan jika tersedia</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
