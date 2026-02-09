"use client";

import { OptimizationResult } from '@/types';
import { formatRupiah } from '@/utils/formatters';

interface CostCardProps {
  item: OptimizationResult;
}

export default function CostCard({ item }: CostCardProps) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
      <h4 className="text-sm font-bold text-slate-700 mb-3 pb-2 border-b border-slate-100 flex items-center gap-2">
        Estimasi Biaya Trucking
        {item.SIZE_CONT && (
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
            Container {item.SIZE_CONT}
          </span>
        )}
      </h4>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-600">Biaya Triangulasi</span>
          <span className="font-mono font-bold text-slate-800">
            {formatRupiah(item.COST_TRIANGULASI)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-600">Biaya Via Port</span>
          <span className="font-mono font-bold text-slate-800">
            {formatRupiah(item.COST_VIA_PORT)}
          </span>
        </div>

        <div className="flex justify-between items-center bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <span className="text-sm font-medium text-emerald-700">SAVING BIAYA</span>
          <span className="font-mono font-bold text-emerald-700 text-lg">
            {formatRupiah(item.SAVING_COST)}
          </span>
        </div>

        <p className="text-xs text-slate-400 italic mt-2">
          * Estimasi berdasarkan model cost RFQ per cabang
        </p>
      </div>
    </div>
  );
}
