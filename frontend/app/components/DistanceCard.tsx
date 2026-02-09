"use client";

import { OptimizationResult } from '@/types';
import { formatNumber } from '@/utils/formatters';

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
        {/* Jarak bongkar ke muat (jika ada) */}
        {item.JARAK_BONGKAR_MUAT !== undefined && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Jarak Bongkar → Muat</span>
            <span className="font-mono font-bold text-slate-800">
              {formatNumber(item.JARAK_BONGKAR_MUAT)} km
            </span>
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-600" title="Port→Bongkar→Muat→Port">
            Triangulasi (Full)
          </span>
          <span className="font-mono font-bold text-slate-800">
            {formatNumber(item.JARAK_TRIANGULASI)} km
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-600" title="Port→Bongkar→Port→Muat→Port">
            Via Port (Full)
          </span>
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