"use client";

import { OptimizationResult } from '@/app/types';
import { formatNumber } from '@/app/utils/formatters';

interface DistanceCardProps {
  item: OptimizationResult;
}

export default function DistanceCard({ item }: DistanceCardProps) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
      <h4 className="text-sm font-bold text-slate-700 mb-3 pb-2 border-b border-slate-100">
        Data Jarak
      </h4>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-600">JARAK TRIANGULASI</span>
          <span className="font-mono font-bold text-slate-800">
            {formatNumber(item.JARAK_TRIANGULASI)} km
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-600">JARAK VIA PORT</span>
          <span className="font-mono font-bold text-slate-800">
            {formatNumber(item.JARAK_VIA_PORT)} km
          </span>
        </div>

        <div className="flex justify-between items-center bg-green-50 border border-green-200 rounded-lg p-3">
          <span className="text-sm font-medium text-green-700">SAVING JARAK</span>
          <span className="font-mono font-bold text-green-700 text-lg">
            {formatNumber(item.SAVING_KM)} km
          </span>
        </div>
      </div>
    </div>
  );
}