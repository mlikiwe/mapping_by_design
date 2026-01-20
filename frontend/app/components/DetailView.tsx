"use client";

import dynamic from 'next/dynamic';
import { OptimizationResult } from '@/app/types';
import RouteSummaryCard from './RouteSummaryCard';
import DistanceCard from './DistanceCard';
import CostCard from './CostCard';
import TimeCard from './TimeCard';
import RecommendationCard from './RecommendationCard';

const MapVisualizer = dynamic(() => import('./MapVisualizer'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-slate-100 animate-pulse rounded-xl flex items-center justify-center text-slate-400">
      Memuat Peta...
    </div>
  ),
});

interface DetailViewProps {
  item: OptimizationResult;
  onBackToList: () => void;
}

export default function DetailView({ item, onBackToList }: DetailViewProps) {
  return (
    <div className="animate-in slide-in-from-right-8 fade-in duration-300 h-[calc(100vh-140px)] flex flex-col">
      {/* Navigation Back */}
      <div className="mb-4 flex items-center gap-4">
        <button
          onClick={onBackToList}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold transition-colors"
        >
        Kembali
        </button>
        <div className="h-6 w-px bg-slate-300"></div>
        <span className="ml-auto inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold bg-purple-100 text-purple-700 border border-purple-200">
          {item.CABANG}
        </span>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        <div className="col-span-5 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
          <RouteSummaryCard item={item} />
          <DistanceCard item={item} />
          <CostCard item={item} />
          <TimeCard item={item} />
          <RecommendationCard item={item} />
        </div>

        <div className="col-span-7 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col min-h-125">
          <MapVisualizer data={item} />
        </div>
      </div>
    </div>
  );
}
