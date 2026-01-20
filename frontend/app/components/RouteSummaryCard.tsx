"use client";

import { OptimizationResult } from '@/app/types';
import StatusBadge from './StatusBadge';

interface RouteSummaryCardProps {
  item: OptimizationResult;
}

export default function RouteSummaryCard({ item }: RouteSummaryCardProps) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-bold text-slate-800">Rangkuman Rute</h3>
        <StatusBadge status={item.KATEGORI_POOL} />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-red-50 border border-red-100 rounded-lg p-3">
          <div className="text-xs font-bold text-red-600 uppercase tracking-wide">
            DESTINATION
          </div>
          <div className="text-sm font-bold text-slate-800 mt-1 font-mono">
            {item.DEST_ID}
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
          <div className="text-xs font-bold text-blue-600 uppercase tracking-wide">
            ORIGIN
          </div>
          <div className="text-sm font-bold text-slate-800 mt-1 font-mono">
            {item.ORIG_ID}
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
          <div className="text-xs font-bold text-purple-600 uppercase tracking-wide">
            CABANG
          </div>
          <div className="text-sm font-bold text-slate-800 mt-1">
            {item.CABANG}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            STATUS
          </div>
          <div className="text-sm font-medium text-slate-800 mt-1">
            {item.STATUS}
          </div>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            KATEGORI_POOL
          </div>
          <div className="text-sm font-medium text-slate-800 mt-1">
            {item.KATEGORI_POOL}
          </div>
        </div>
      </div>
    </div>
  );
}