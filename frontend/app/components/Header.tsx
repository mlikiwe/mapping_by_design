"use client";

import { OptimizationStats } from '@/app/types';
import { formatNumber, formatRupiah } from '@/app/utils/formatters';

interface HeaderProps {
  stats: OptimizationStats;
  hasResults: boolean;
  onLogoClick: () => void;
}

export default function Header({ stats, hasResults, onLogoClick }: HeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
      <div 
        className="flex items-center gap-2 cursor-pointer" 
        onClick={onLogoClick}
      >
        <h1 className="text-xl font-bold tracking-tight text-slate-800">
          <span className="text-blue-600">E2E</span> Roundtrip
        </h1>
      </div>

      {hasResults && (
        <div className="flex gap-4 text-sm font-medium">
          <div className="bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full border border-emerald-200 shadow-sm">
            Saving: {formatRupiah(stats.savingCost)}
          </div>
          
          <div className="bg-green-50 text-green-700 px-4 py-1.5 rounded-full border border-green-200 shadow-sm">
            Saving: {formatNumber(stats.saving)} km
          </div>
          
          <div className="bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full border border-blue-200 shadow-sm">
            Matched: {stats.match}
          </div>
        </div>
      )}
    </header>
  );
}
