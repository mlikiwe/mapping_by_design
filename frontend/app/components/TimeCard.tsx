"use client";

import { OptimizationResult } from '@/app/types';
import { formatNumber } from '@/app/utils/formatters';

interface TimeCardProps {
  item: OptimizationResult;
}

export default function TimeCard({ item }: TimeCardProps) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
      <h4 className="text-sm font-bold text-slate-700 mb-3 pb-2 border-b border-slate-100">
        Data Waktu
      </h4>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-600">EST_PERJALANAN_JAM</span>
          <span className="font-mono font-bold text-slate-800">
            {formatNumber(item.EST_PERJALANAN_JAM)} jam
          </span>
        </div>

        <div className="bg-red-50 border border-red-100 rounded-lg p-3">
          <div className="text-xs font-bold text-red-600 uppercase tracking-wide">
            WAKTU_BONGKAR
          </div>
          <div className="text-sm font-medium text-slate-800 mt-1">
            {item.WAKTU_BONGKAR_ASLI}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
          <div className="text-xs font-bold text-blue-600 uppercase tracking-wide">
            WAKTU_MUAT
          </div>
          <div className="text-sm font-medium text-slate-800 mt-1">
            {item.WAKTU_MUAT_ASLI}
          </div>
        </div>
      </div>
    </div>
  );
}
