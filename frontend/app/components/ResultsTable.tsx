"use client";

import { OptimizationResult, CabangStats } from '@/app/types';
import { formatNumber } from '@/app/utils/formatters';
import StatusBadge from './StatusBadge';
import CabangFilter from './CabangFilter';

interface ResultsTableProps {
  results: OptimizationResult[];
  filteredResults: OptimizationResult[];
  cabangStats: CabangStats[];
  uniqueCabangs: string[];
  selectedCabang: string;
  onSelectCabang: (cabang: string) => void;
  onViewDetail: (item: OptimizationResult) => void;
  onBackToUpload: () => void;
}

export default function ResultsTable({
  results,
  filteredResults,
  cabangStats,
  uniqueCabangs,
  selectedCabang,
  onSelectCabang,
  onViewDetail,
  onBackToUpload,
}: ResultsTableProps) {
  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Hasil Optimasi</h2>
          <p className="text-slate-500 text-sm">
            Menampilkan {filteredResults.length} dari {results.length} kandidat rute.
          </p>
        </div>

        {uniqueCabangs.length > 1 && (
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-600">Filter Cabang:</label>
            <select
              value={selectedCabang}
              onChange={(e) => onSelectCabang(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            >
              <option value="all">Semua Cabang ({results.length})</option>
              {cabangStats.map(({ cabang, count, saving }) => (
                <option key={cabang} value={cabang}>
                  {cabang} ({count} rute • {formatNumber(saving)} km saving)
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={onBackToUpload}
          className="text-sm text-red-600 hover:underline font-medium"
        >
          Reset / Upload Ulang
        </button>
      </div>

      <CabangFilter
        cabangStats={cabangStats}
        selectedCabang={selectedCabang}
        onSelectCabang={onSelectCabang}
      />

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">ID SOPT Destination</th>
                <th className="px-6 py-4">ID SOPT Origin</th>
                <th className="px-6 py-4">Cabang</th>
                <th className="px-6 py-4">Waktu Bongkar</th>
                <th className="px-6 py-4">Waktu Muat</th>
                <th className="px-6 py-4">Status & Kategori</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredResults.map((row, idx) => (
                <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">{row.DEST_ID}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">{row.ORIG_ID}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200">
                      {row.CABANG}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{row.WAKTU_BONGKAR_ASLI}</td>
                  <td className="px-6 py-4 text-slate-600">{row.WAKTU_MUAT_ASLI}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={row.KATEGORI_POOL || row.STATUS} />
                    <div className="text-xs text-slate-400 mt-1 font-mono">{row.STATUS}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => onViewDetail(row)}
                      className="bg-white border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-lg font-bold text-xs shadow-sm transition-all"
                    >
                      Lihat Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}