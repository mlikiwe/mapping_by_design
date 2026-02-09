"use client";

import { AppMode } from '@/types';

interface LandingViewProps {
  onSelectMode: (mode: AppMode) => void;
}

export default function LandingView({ onSelectMode }: LandingViewProps) {
  return (
    <div className="max-w-4xl mx-auto mt-16 animate-in fade-in slide-in-from-bottom-8">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-slate-800 mb-4">
          Sistem Optimasi<span className="text-blue-600">Roundtrip</span>
        </h2>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Mapping Mode Card */}
        <div 
          onClick={() => onSelectMode('mapping')}
          className="group bg-white p-8 rounded-2xl shadow-lg border-2 border-slate-100 hover:border-blue-500 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
        >
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          
          <h3 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-blue-600 transition-colors">
            Mapping Baru
          </h3>
          
          <p className="text-slate-500 mb-4">
            Upload data bongkar muat untuk diproses oleh algoritma mapping
          </p>

          <div className="mt-6 flex items-center text-blue-600 font-semibold">
            Mulai Mapping
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
        </div>

        {/* Simulation Mode Card */}
        <div 
          onClick={() => onSelectMode('simulation')}
          className="group bg-white p-8 rounded-2xl shadow-lg border-2 border-slate-100 hover:border-emerald-500 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
        >
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-600 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          
          <h3 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-emerald-600 transition-colors">
            Simulasi
          </h3>
          
          <p className="text-slate-500 mb-4">
            Upload file hasil mapping yang sudah ada untuk visualisasi hasil
          </p>

          <div className="mt-6 flex items-center text-emerald-600 font-semibold">
            Upload Hasil Mapping
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
