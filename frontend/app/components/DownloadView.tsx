"use client";

import { OptimizationResult, OptimizationStats } from '@/types';
import { formatNumber, formatRupiah } from '@/utils/formatters';

interface DownloadViewProps {
  results: OptimizationResult[];
  stats: OptimizationStats;
  onDownload: () => void;
  onViewResults: () => void;
  onBackToLanding: () => void;
  isDownloading: boolean;
}

export default function DownloadView({
  results,
  stats,
  onDownload,
  onViewResults,
  onBackToLanding,
  isDownloading,
}: DownloadViewProps) {
  return (
    <div className="max-w-3xl mx-auto mt-16 animate-in fade-in slide-in-from-bottom-8">
      {/* Success Header */}
      <div className="text-center mb-10">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">
          Mapping Berhasil!
        </h2>
        <p className="text-slate-500">
          Proses optimasi selesai. Simpan hasil mapping untuk digunakan kembali nanti.
        </p>
      </div>

      {/* Stats Summary */}
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 mb-8">
        <h3 className="text-lg font-semibold text-slate-700 mb-4">Ringkasan Hasil</h3>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-xl text-center">
            <div className="text-3xl font-bold text-blue-600">{stats.match}</div>
            <div className="text-sm text-blue-600/70 font-medium">Total Match</div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-green-600">{formatNumber(stats.saving)} km</div>
            <div className="text-sm text-green-600/70 font-medium">Total Saving</div>
          </div>
          
          <div className="bg-emerald-50 p-4 rounded-xl text-center">
            <div className="text-xl font-bold text-emerald-600">{formatRupiah(stats.savingCost)}</div>
            <div className="text-sm text-emerald-600/70 font-medium">Estimasi Saving Cost</div>
          </div>
        </div>
        
        {/* Cabang breakdown */}
        <div className="mt-6 pt-4 border-t border-slate-100">
          <div className="text-sm text-slate-500 mb-2">Cabang yang diproses:</div>
          <div className="flex flex-wrap gap-2">
            {Array.from(new Set(results.map(r => r.CABANG))).sort().map((cabang) => (
              <span 
                key={cabang}
                className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium"
              >
                {cabang}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
        <div className="space-y-4">
          {/* Download Button - Primary */}
          <button
            onClick={onDownload}
            disabled={isDownloading}
            className={`w-full py-4 rounded-xl font-bold text-white text-lg transition-all shadow-lg flex items-center justify-center gap-3 ${
              isDownloading
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/30'
            }`}
          >
            {isDownloading ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Menyiapkan File...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Hasil Mapping (.xlsx)
              </>
            )}
          </button>

          <div className="text-center text-sm text-slate-400 py-2">atau</div>

          {/* View Results Button - Secondary */}
          <button
            onClick={onViewResults}
            className="w-full py-4 rounded-xl font-bold text-blue-600 text-lg transition-all border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 flex items-center justify-center gap-3"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Lihat Detail Hasil
          </button>
        </div>

        {/* Info Note */}
        <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
          <div className="flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-sm text-amber-800">
              <strong>Penting:</strong> Simpan file hasil mapping ini untuk menghindari proses mapping ulang (~20 menit). 
              Gunakan menu <strong>Simulasi</strong> untuk membuka kembali file ini kapan saja.
            </div>
          </div>
        </div>
      </div>

      {/* Back to Landing */}
      <div className="text-center mt-8">
        <button
          onClick={onBackToLanding}
          className="text-slate-500 hover:text-slate-700 text-sm font-medium flex items-center gap-2 mx-auto"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Kembali ke Menu Utama
        </button>
      </div>
    </div>
  );
}
