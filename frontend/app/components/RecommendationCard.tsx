"use client";

import { OptimizationResult } from '@/app/types';

interface RecommendationCardProps {
  item: OptimizationResult;
}

export default function RecommendationCard({ item }: RecommendationCardProps) {
  return (
    <div className="bg-linear-to-br from-indigo-50 to-white rounded-xl p-5 shadow-sm border border-indigo-100">
      <h4 className="text-sm font-bold text-indigo-800 mb-3 pb-2 border-b border-indigo-100 flex items-center gap-2">
        Rekomendasi Tindakan
      </h4>

      <div className="space-y-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-xs font-bold text-blue-600 uppercase tracking-wide">
              Sisi Origin (Muat)
            </div>
          </div>
          <div className="text-sm font-medium text-slate-800 bg-white/70 rounded p-2">
            {item.OPSI_SISI_ORIGIN || 'Data tidak tersedia'}
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-xs font-bold text-red-600 uppercase tracking-wide">
              Sisi Destination (Bongkar)
            </div>
          </div>
          <div className="text-sm font-medium text-slate-800 bg-white/70 rounded p-2">
            {item.OPSI_SISI_DEST || 'Data tidak tersedia'}
          </div>
        </div>
      </div>
    </div>
  );
}