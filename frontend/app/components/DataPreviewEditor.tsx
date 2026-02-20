"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { PlanningRow } from '@/types';

const REQUIRED_COLUMNS = ['NO SOPT', 'CABANG', 'ACT. LOAD DATE', 'CUST ID', 'ALAMAT', 'SIZE CONT', 'SERVICE TYPE', 'GRADE CONT'] as const;
const ALL_COLUMNS = ['NO SOPT', 'CABANG', 'ACT. LOAD DATE', 'CUST ID', 'ALAMAT', 'SIZE CONT', 'SERVICE TYPE', 'GRADE CONT'] as const;

const DROPDOWN_OPTIONS: Record<string, string[]> = {
    'CABANG': ['BIT', 'BMS', 'BPN', 'BRU', 'BTM', 'JYP', 'KDR', 'KTG', 'MKS', 'MRI', 'NBR', 'NNK', 'PAL', 'PNK', 'SDA', 'SMG'],
    'SIZE CONT': ['20DC', '20RM', '21DC', '40HC', '40RM'],
    'SERVICE TYPE': ['INTERCHANGE', 'STRIPPING'],
    'GRADE CONT': ['A', 'B', 'C'],
};

interface DataPreviewEditorProps {
    destData: PlanningRow[];
    origData: PlanningRow[];
    onDestDataChange: (rows: PlanningRow[]) => void;
    onOrigDataChange: (rows: PlanningRow[]) => void;
    onSubmit: () => void;
    loading: boolean;
}

type ActiveView = 'dest' | 'orig';

interface EditingCell {
    rowIndex: number;
    column: string;
}

function createEmptyRow(): PlanningRow {
    return {
        'NO SOPT': '',
        'CABANG': '',
        'ACT. LOAD DATE': '',
        'CUST ID': '',
        'ALAMAT': '',
        'SIZE CONT': '',
        'SERVICE TYPE': '',
        'GRADE CONT': '',
    };
}

function getValidationErrors(rows: PlanningRow[]): { rowIndex: number; column: string }[] {
    const errors: { rowIndex: number; column: string }[] = [];
    rows.forEach((row, i) => {
        REQUIRED_COLUMNS.forEach((col) => {
            const val = row[col];
            if (!val || String(val).trim() === '') {
                errors.push({ rowIndex: i, column: col });
            }
        });
    });
    return errors;
}

function formatDateForInput(value: string): string {
    if (!value) return '';
    try {
        const d = new Date(value);
        if (isNaN(d.getTime())) return value;
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
        return value;
    }
}

function formatDateForDisplay(value: string): string {
    if (!value) return '';
    try {
        const d = new Date(value);
        if (isNaN(d.getTime())) return value;
        return d.toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return value;
    }
}

export default function DataPreviewEditor({
    destData,
    origData,
    onDestDataChange,
    onOrigDataChange,
    onSubmit,
    loading,
}: DataPreviewEditorProps) {
    const [activeView, setActiveView] = useState<ActiveView>('dest');
    const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
    const inputRef = useRef<HTMLInputElement>(null);

    const currentData = activeView === 'dest' ? destData : origData;
    const onCurrentDataChange = activeView === 'dest' ? onDestDataChange : onOrigDataChange;

    const destErrors = getValidationErrors(destData);
    const origErrors = getValidationErrors(origData);
    const currentErrors = activeView === 'dest' ? destErrors : origErrors;

    const destValid = destData.length > 0 && destErrors.length === 0;
    const origValid = origData.length > 0 && origErrors.length === 0;
    const canSubmit = destValid && origValid && destData.length > 0 && origData.length > 0;

    const destMissingDates = destData.filter(r => !r['ACT. LOAD DATE'] || String(r['ACT. LOAD DATE']).trim() === '').length;
    const origMissingDates = origData.filter(r => !r['ACT. LOAD DATE'] || String(r['ACT. LOAD DATE']).trim() === '').length;

    useEffect(() => {
        if (editingCell && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingCell]);

    const handleCellClick = useCallback((rowIndex: number, column: string) => {
        setEditingCell({ rowIndex, column });
    }, []);

    const handleCellChange = useCallback((rowIndex: number, column: string, value: string) => {
        const updated = [...currentData];
        updated[rowIndex] = { ...updated[rowIndex], [column]: value };
        onCurrentDataChange(updated);
    }, [currentData, onCurrentDataChange]);

    const handleCellBlur = useCallback(() => {
        setEditingCell(null);
    }, []);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === 'Escape') {
            setEditingCell(null);
        }
        if (e.key === 'Tab' && editingCell) {
            e.preventDefault();
            const colIdx = ALL_COLUMNS.indexOf(editingCell.column as typeof ALL_COLUMNS[number]);
            if (colIdx < ALL_COLUMNS.length - 1) {
                setEditingCell({ rowIndex: editingCell.rowIndex, column: ALL_COLUMNS[colIdx + 1] });
            } else if (editingCell.rowIndex < currentData.length - 1) {
                setEditingCell({ rowIndex: editingCell.rowIndex + 1, column: ALL_COLUMNS[0] });
            }
        }
    }, [editingCell, currentData.length]);

    const handleAddRow = useCallback(() => {
        onCurrentDataChange([...currentData, createEmptyRow()]);
    }, [currentData, onCurrentDataChange]);

    const handleDeleteSelected = useCallback(() => {
        if (selectedRows.size === 0) return;
        const filtered = currentData.filter((_, i) => !selectedRows.has(i));
        onCurrentDataChange(filtered);
        setSelectedRows(new Set());
    }, [currentData, onCurrentDataChange, selectedRows]);

    const toggleRowSelection = useCallback((idx: number) => {
        setSelectedRows(prev => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    }, []);

    const toggleSelectAll = useCallback(() => {
        if (selectedRows.size === currentData.length) {
            setSelectedRows(new Set());
        } else {
            setSelectedRows(new Set(currentData.map((_, i) => i)));
        }
    }, [selectedRows.size, currentData]);

    const handleViewSwitch = useCallback((view: ActiveView) => {
        setActiveView(view);
        setEditingCell(null);
        setSelectedRows(new Set());
    }, []);

    const isErrorCell = (rowIndex: number, column: string) =>
        currentErrors.some(e => e.rowIndex === rowIndex && e.column === column);

    return (
        <div className="space-y-4">
            {/* Toggle Switch */}
            <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                <button
                    onClick={() => handleViewSwitch('dest')}
                    className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeView === 'dest'
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                        : 'text-slate-500 hover:bg-slate-50'
                        }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    Data Bongkar ({destData.length})
                    {destErrors.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-100 text-red-700 border border-red-200">
                            {destErrors.length} ⚠
                        </span>
                    )}
                </button>
                <button
                    onClick={() => handleViewSwitch('orig')}
                    className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeView === 'orig'
                        ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30'
                        : 'text-slate-500 hover:bg-slate-50'
                        }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Data Muat ({origData.length})
                    {origErrors.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-100 text-red-700 border border-red-200">
                            {origErrors.length} ⚠
                        </span>
                    )}
                </button>
            </div>

            {/* Validation Warnings */}
            {(destMissingDates > 0 || origMissingDates > 0) && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                        {destMissingDates > 0 && <p><strong>Bongkar:</strong> {destMissingDates} baris tanpa ACT. LOAD DATE</p>}
                        {origMissingDates > 0 && <p><strong>Muat:</strong> {origMissingDates} baris tanpa ACT. LOAD DATE</p>}
                    </div>
                </div>
            )}

            {/* Data Table */}
            {currentData.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-12 text-center">
                    <p className="text-slate-400 mb-4">
                        Belum ada data {activeView === 'dest' ? 'bongkar' : 'muat'}
                    </p>
                    <button
                        onClick={handleAddRow}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium transition-colors"
                    >
                        + Tambah Baris Pertama
                    </button>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-3 py-3 w-10">
                                        <input
                                            type="checkbox"
                                            checked={selectedRows.size === currentData.length && currentData.length > 0}
                                            onChange={toggleSelectAll}
                                            className="rounded border-slate-300"
                                        />
                                    </th>
                                    <th className="px-3 py-3 w-10">#</th>
                                    {ALL_COLUMNS.map(col => (
                                        <th
                                            key={col}
                                            className={`px-4 py-3 ${(REQUIRED_COLUMNS as readonly string[]).includes(col)
                                                ? 'text-slate-700 font-bold'
                                                : 'text-slate-400'
                                                }`}
                                        >
                                            {col}
                                            {(REQUIRED_COLUMNS as readonly string[]).includes(col) && (
                                                <span className="text-red-400 ml-0.5">*</span>
                                            )}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {currentData.map((row, rowIdx) => (
                                    <tr key={rowIdx} className={`transition-colors ${selectedRows.has(rowIdx) ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                                        <td className="px-3 py-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedRows.has(rowIdx)}
                                                onChange={() => toggleRowSelection(rowIdx)}
                                                className="rounded border-slate-300"
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-slate-400 text-xs">{rowIdx + 1}</td>
                                        {ALL_COLUMNS.map(col => {
                                            const isEditing = editingCell?.rowIndex === rowIdx && editingCell?.column === col;
                                            const hasError = isErrorCell(rowIdx, col);
                                            const isDateCol = col === 'ACT. LOAD DATE';
                                            const cellValue = row[col] ?? '';

                                            return (
                                                <td
                                                    key={col}
                                                    className={`px-4 py-2 cursor-pointer ${hasError ? 'bg-red-50' : ''}`}
                                                    onClick={() => !isEditing && handleCellClick(rowIdx, col)}
                                                >
                                                    {isEditing ? (
                                                        col in DROPDOWN_OPTIONS ? (
                                                            <select
                                                                autoFocus
                                                                value={cellValue}
                                                                onChange={(e) => {
                                                                    handleCellChange(rowIdx, col, e.target.value);
                                                                    setEditingCell(null);
                                                                }}
                                                                onBlur={handleCellBlur}
                                                                className="w-full px-2 py-1 border-2 border-blue-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                                                                style={{ minWidth: '140px' }}
                                                            >
                                                                <option value="">— Pilih —</option>
                                                                {DROPDOWN_OPTIONS[col].map(opt => (
                                                                    <option key={opt} value={opt}>{opt}</option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <input
                                                                ref={inputRef}
                                                                type={isDateCol ? 'datetime-local' : 'text'}
                                                                value={isDateCol ? formatDateForInput(cellValue) : cellValue}
                                                                onChange={(e) => handleCellChange(rowIdx, col, e.target.value)}
                                                                onBlur={handleCellBlur}
                                                                onKeyDown={handleKeyDown}
                                                                className="w-full px-2 py-1 border-2 border-blue-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                                                                style={{ minWidth: isDateCol ? '200px' : '120px' }}
                                                            />
                                                        )
                                                    ) : (
                                                        <div className={`px-2 py-1 rounded-md min-h-7 text-sm border border-transparent hover:border-slate-300 transition-colors ${hasError ? 'text-red-400 italic border-red-200' : 'text-slate-700'
                                                            }`}>
                                                            {cellValue
                                                                ? (isDateCol ? formatDateForDisplay(cellValue) : cellValue)
                                                                : (hasError ? '(pilih)' : '—')}
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    <button
                        onClick={handleAddRow}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Tambah Baris
                    </button>
                    {selectedRows.size > 0 && (
                        <button
                            onClick={handleDeleteSelected}
                            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Hapus ({selectedRows.size})
                        </button>
                    )}
                </div>

                <div className="text-xs text-slate-400">
                    Klik cell untuk edit • Tab untuk pindah kolom
                </div>
            </div>

            {/* Validation Summary */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="grid grid-cols-2 gap-4">
                    <div className={`p-3 rounded-lg border ${destValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex items-center gap-2">
                            {destValid ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                            <span className={`text-sm font-bold ${destValid ? 'text-green-700' : 'text-red-700'}`}>
                                Bongkar: {destData.length > 0 ? (destValid ? `${destData.length} valid` : `${destErrors.length} error`) : 'belum ada data'}
                            </span>
                        </div>
                    </div>
                    <div className={`p-3 rounded-lg border ${origValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex items-center gap-2">
                            {origValid ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                            <span className={`text-sm font-bold ${origValid ? 'text-green-700' : 'text-red-700'}`}>
                                Muat: {origData.length > 0 ? (origValid ? `${origData.length} valid` : `${origErrors.length} error`) : 'belum ada data'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Submit Button */}
            <button
                onClick={onSubmit}
                disabled={!canSubmit || loading}
                className={`w-full py-4 rounded-xl font-bold text-white text-lg transition-all shadow-lg ${!canSubmit || loading
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/30'
                    }`}
            >
                {loading ? (
                    <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Sedang Memproses Mapping...
                    </span>
                ) : (
                    `🚀 Jalankan Mapping (${destData.length} Bongkar + ${origData.length} Muat)`
                )}
            </button>
        </div>
    );
}
