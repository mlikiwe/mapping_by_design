"use client";

import { OptimizationResult, TimeProfile } from '@/types';
import { formatNumber } from '@/utils/formatters';

interface TimeCardProps {
  item: OptimizationResult;
}

function formatHour(hour: number | null | undefined): string {
  if (hour === null || hour === undefined) return '-';
  return `${hour.toString().padStart(2, '0')}:00`;
}

function formatDuration(hours: number | null | undefined): string {
  if (hours === null || hours === undefined) return '-';
  return `${formatNumber(hours)} jam`;
}

function SourceDot({ source }: { source?: string }) {
  if (!source || source === 'none') return null;
  const color = source === 'customer' ? 'bg-emerald-400' : 'bg-amber-400';
  const title = source === 'customer' ? 'Data historis customer' : 'Default cabang';
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${color} ml-1`} title={title} />;
}

export default function TimeCard({ item }: TimeCardProps) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
      <h4 className="text-sm font-bold text-slate-700 mb-4 pb-2 border-b border-slate-100">
        Data Waktu
      </h4>

      <div className="grid grid-cols-3 gap-3 mb-2">
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Waktu Order
        </div>
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center">
          Karakteristik Waktu
        </div>
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-right">
          Lead Time
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 items-center bg-red-50 border border-red-100 rounded-lg p-3 mb-2">
        <div>
          <div className="text-[10px] font-bold text-red-500 uppercase tracking-wide mb-0.5">Bongkar</div>
          <div className="text-sm font-medium text-slate-800">{item.WAKTU_BONGKAR_ASLI}</div>
          {item.DEST_CUST_ID && (
            <div className="text-[10px] text-slate-400 mt-0.5">ID: {item.DEST_CUST_ID}</div>
          )}
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-slate-800">
            {formatHour(item.DEST_TIME_PROFILE?.mode_hour)}
            <SourceDot source={item.DEST_TIME_PROFILE?.source} />
          </div>
          {item.DEST_TIME_PROFILE?.sample_count ? (
            <div className="text-[10px] text-slate-400">{item.DEST_TIME_PROFILE.sample_count} data</div>
          ) : null}
        </div>
        <div className="text-right">
          <div className="text-sm font-bold font-mono text-slate-800">
            {formatDuration(item.DURASI_BONGKAR_EST)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 items-center bg-blue-50 border border-blue-100 rounded-lg p-3 mb-3">
        <div>
          <div className="text-[10px] font-bold text-blue-500 uppercase tracking-wide mb-0.5">Muat</div>
          <div className="text-sm font-medium text-slate-800">{item.WAKTU_MUAT_ASLI}</div>
          {item.ORIG_CUST_ID && (
            <div className="text-[10px] text-slate-400 mt-0.5">ID: {item.ORIG_CUST_ID}</div>
          )}
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-slate-800">
            {formatHour(item.ORIG_TIME_PROFILE?.mode_hour)}
            <SourceDot source={item.ORIG_TIME_PROFILE?.source} />
          </div>
          {item.ORIG_TIME_PROFILE?.sample_count ? (
            <div className="text-[10px] text-slate-400">{item.ORIG_TIME_PROFILE.sample_count} data</div>
          ) : null}
        </div>
        <div className="text-right">
          <div className="text-sm font-bold font-mono text-slate-800">
            {formatDuration(item.DURASI_MUAT_EST)}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-2 border-t border-slate-100">
        <span className="text-xs text-slate-500">Est. Perjalanan Bongkar → Muat</span>
        <span className="font-mono font-bold text-slate-700 text-sm">
          {formatNumber(item.EST_PERJALANAN_JAM)} jam
        </span>
      </div>
    </div>
  );
}
