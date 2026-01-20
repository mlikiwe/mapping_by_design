"use client";

import { CabangStats } from '@/app/types';
import { formatNumber } from '@/app/utils/formatters';

interface CabangFilterProps {
  cabangStats: CabangStats[];
  selectedCabang: string;
  onSelectCabang: (cabang: string) => void;
}

export default function CabangFilter({
  cabangStats,
  selectedCabang,
  onSelectCabang,
}: CabangFilterProps) {
  if (cabangStats.length <= 1) return null;

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {cabangStats.map(({ cabang, count, saving }) => (
        <button
          key={cabang}
          onClick={() => onSelectCabang(selectedCabang === cabang ? 'all' : cabang)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
            selectedCabang === cabang
              ? 'bg-purple-600 text-white border-purple-600 shadow-md'
              : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300 hover:bg-purple-50'
          }`}
        >
          <span className="font-bold">{cabang}</span>
          <span className="ml-2 opacity-80">{count} rute</span>
          <span className="ml-2 text-xs opacity-60">• {formatNumber(saving)} km</span>
        </button>
      ))}
      
      {selectedCabang !== 'all' && (
        <button
          onClick={() => onSelectCabang('all')}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 transition-all"
        >
        Reset Filter
        </button>
      )}
    </div>
  );
}
