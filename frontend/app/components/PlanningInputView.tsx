"use client";

import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { PlanningRow } from '@/types';
import DataPreviewEditor from './DataPreviewEditor';

const REQUIRED_COLUMNS = ['NO SOPT', 'CABANG', 'ACT. LOAD DATE', 'CUST ID', 'ALAMAT', 'SIZE CONT', 'SERVICE TYPE', 'GRADE CONT'];

type InputTab = 'upload' | 'paste' | 'manual';

interface PlanningInputViewProps {
    onSubmitData: (destData: PlanningRow[], origData: PlanningRow[]) => void;
    onBackToLanding: () => void;
    loading: boolean;
}

function normalizeColumnName(raw: string): string {
    const cleaned = raw.trim().toUpperCase().replace(/\s+/g, ' ');
    const aliases: Record<string, string> = {
        'NOMOR SOPT': 'NO SOPT',
        'NO_SOPT': 'NO SOPT',
        'NOSOPT': 'NO SOPT',
        'CUSTOMER ID': 'CUST ID',
        'CUSTOMER_ID': 'CUST ID',
        'CUSTID': 'CUST ID',
        'ADDRESS': 'ALAMAT',
        'SIZE': 'SIZE CONT',
        'SIZE_CONT': 'SIZE CONT',
        'ACT LOAD DATE': 'ACT. LOAD DATE',
        'ACT_LOAD_DATE': 'ACT. LOAD DATE',
        'ACTUAL LOAD DATE': 'ACT. LOAD DATE',
        'LOAD DATE': 'ACT. LOAD DATE',
        'SERVICE_TYPE': 'SERVICE TYPE',
        'SERVICETYPE': 'SERVICE TYPE',
        'GRADE_CONT': 'GRADE CONT',
        'GRADECONT': 'GRADE CONT',
    };
    return aliases[cleaned] || cleaned;
}

function parseExcelDate(value: unknown): string {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'number') {
        try {
            const date = XLSX.SSF.parse_date_code(value);
            if (date) {
                const pad = (n: number) => n.toString().padStart(2, '0');
                return `${date.y}-${pad(date.m)}-${pad(date.d)}T${pad(date.H)}:${pad(date.M)}`;
            }
        } catch {}
    }
    const str = String(value).trim();
    if (!str) return '';
    try {
        const d = new Date(str);
        if (!isNaN(d.getTime())) {
            const pad = (n: number) => n.toString().padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        }
    } catch {}
    return str;
}

function convertToRows(records: Record<string, unknown>[]): PlanningRow[] {
    return records.map((rec) => {
        const row: PlanningRow = {
            'NO SOPT': '',
            'CABANG': '',
            'ACT. LOAD DATE': '',
            'CUST ID': '',
            'ALAMAT': '',
            'SIZE CONT': '',
            'SERVICE TYPE': '',
            'GRADE CONT': '',
        };

        for (const [rawKey, rawValue] of Object.entries(rec)) {
            const col = normalizeColumnName(rawKey);
            const value = col === 'ACT. LOAD DATE'
                ? parseExcelDate(rawValue)
                : String(rawValue ?? '').trim();
            row[col] = value;
        }

        return row;
    });
}

function parseTSV(text: string): PlanningRow[] {
    const lines = text.trim().split('\n').map(l => l.replace(/\r$/, ''));
    if (lines.length < 2) return [];

    const headers = lines[0].split('\t').map(h => normalizeColumnName(h));

    return lines.slice(1).filter(l => l.trim()).map(line => {
        const values = line.split('\t');
        const row: PlanningRow = {
            'NO SOPT': '',
            'CABANG': '',
            'ACT. LOAD DATE': '',
            'CUST ID': '',
            'ALAMAT': '',
            'SIZE CONT': '',
            'SERVICE TYPE': '',
            'GRADE CONT': '',
        };

        headers.forEach((header, idx) => {
            const value = values[idx]?.trim() ?? '';
            row[header] = header === 'ACT. LOAD DATE' ? parseExcelDate(value) : value;
        });

        return row;
    });
}

export default function PlanningInputView({
    onSubmitData,
    onBackToLanding,
    loading,
}: PlanningInputViewProps) {
    const [activeTab, setActiveTab] = useState<InputTab>('upload');
    const [destData, setDestData] = useState<PlanningRow[]>([]);
    const [origData, setOrigData] = useState<PlanningRow[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);

    const [fileDest, setFileDest] = useState<File | null>(null);
    const [fileOrig, setFileOrig] = useState<File | null>(null);

    const [pasteDest, setPasteDest] = useState('');
    const [pasteOrig, setPasteOrig] = useState('');

    const handleSubmit = useCallback(() => {
        onSubmitData(destData, origData);
    }, [destData, origData, onSubmitData]);

    const validateParsedData = (rows: PlanningRow[], label: string): string | null => {
        if (rows.length === 0) return `Data ${label} kosong.`;
        const firstRow = rows[0];
        const missing = REQUIRED_COLUMNS.filter(col => !(col in firstRow) || firstRow[col] === undefined);
        if (missing.length > 0) {
            return `Data ${label} kehilangan kolom: ${missing.join(', ')}. Anda dapat menambahkan kolom tersebut di tabel preview.`;
        }
        return null;
    };

    const parseExcelFile = async (file: File): Promise<PlanningRow[]> => {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];

        if (jsonData.length === 0) throw new Error('File tidak memiliki data');
        return convertToRows(jsonData);
    };

    const handleLoadExcel = async () => {
        if (!fileDest || !fileOrig) {
            setError('Pilih kedua file (bongkar dan muat) terlebih dahulu');
            return;
        }
        setError(null);
        try {
            const dest = await parseExcelFile(fileDest);
            const orig = await parseExcelFile(fileOrig);

            const destErr = validateParsedData(dest, 'bongkar');
            const origErr = validateParsedData(orig, 'muat');
            if (destErr && origErr) {
                setError(`${destErr}\n${origErr}`);
            } else if (destErr) {
                setError(destErr);
            } else if (origErr) {
                setError(origErr);
            }

            setDestData(dest);
            setOrigData(orig);
            setShowPreview(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal membaca file');
        }
    };

    const handleLoadPaste = () => {
        if (!pasteDest.trim() || !pasteOrig.trim()) {
            setError('Paste data bongkar dan muat terlebih dahulu');
            return;
        }
        setError(null);
        try {
            const dest = parseTSV(pasteDest);
            const orig = parseTSV(pasteOrig);

            if (dest.length === 0 || orig.length === 0) {
                setError('Format data tidak valid. Pastikan data memiliki header di baris pertama dan dipisahkan dengan tab.');
                return;
            }

            const destErr = validateParsedData(dest, 'bongkar');
            const origErr = validateParsedData(orig, 'muat');
            if (destErr && origErr) {
                setError(`${destErr}\n${origErr}`);
            } else if (destErr) {
                setError(destErr);
            } else if (origErr) {
                setError(origErr);
            }

            setDestData(dest);
            setOrigData(orig);
            setShowPreview(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal memparse data');
        }
    };

    const handleStartManual = () => {
        setError(null);
        setDestData([]);
        setOrigData([]);
        setShowPreview(true);
    };

    const handleBackFromPreview = () => {
        setShowPreview(false);
    };
    
    if (showPreview) {
        return (
            <div className="animate-in fade-in duration-300">
                <button
                    onClick={handleBackFromPreview}
                    className="mb-4 text-slate-500 hover:text-slate-700 text-sm font-medium flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Kembali
                </button>

                <div className="mb-4">
                    <h2 className="text-2xl font-bold text-slate-800">📊 Preview & Edit Data</h2>
                    <p className="text-slate-500 text-sm mt-1">
                        Review data sebelum menjalankan mapping. Klik cell untuk edit.
                    </p>
                </div>

                <DataPreviewEditor
                    destData={destData}
                    origData={origData}
                    onDestDataChange={setDestData}
                    onOrigDataChange={setOrigData}
                    onSubmit={handleSubmit}
                    loading={loading}
                />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-8">
            <button
                onClick={onBackToLanding}
                className="mb-6 text-slate-500 hover:text-slate-700 text-sm font-medium flex items-center gap-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Kembali
            </button>

            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-slate-800 mb-2">Planning Bongkar Muat</h2>
                <p className="text-slate-500">
                    Input rencana bongkar muat
                </p>
            </div>

            <div className="flex bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm mb-6">
                {([
                    { key: 'upload', label: 'Upload Excel', description: 'Upload file .xlsx' },
                    { key: 'paste', label: 'Copy-Paste', description: 'Paste dari Excel' },
                    { key: 'manual', label: 'Input Manual', description: 'Isi satu per satu' },
                ] as { key: InputTab; label: string; description: string }[]).map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => { setActiveTab(tab.key); setError(null); }}
                        className={`flex-1 py-3 px-3 rounded-lg text-center transition-all ${activeTab === tab.key
                            ? 'bg-violet-500 text-white shadow-md shadow-violet-500/30'
                            : 'text-slate-500 hover:bg-slate-50'
                            }`}
                    >
                        <div className="font-bold text-sm">{tab.label}</div>
                        <div className={`text-xs mt-0.5 ${activeTab === tab.key ? 'text-violet-100' : 'text-slate-400'}`}>
                            {tab.description}
                        </div>
                    </button>
                ))}
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm whitespace-pre-line flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                </div>
            )}

            <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
                {activeTab === 'upload' && (
                    <div className="flex flex-col gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                File Data Bongkar
                            </label>
                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={(e) => setFileDest(e.target.files?.[0] || null)}
                                className="block w-full text-sm text-slate-500 file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 cursor-pointer border border-slate-200 rounded-lg"
                            />
                            {fileDest && <p className="text-xs text-green-600 mt-1">✓ {fileDest.name}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                File Data Muat
                            </label>
                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={(e) => setFileOrig(e.target.files?.[0] || null)}
                                className="block w-full text-sm text-slate-500 file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-200 rounded-lg"
                            />
                            {fileOrig && <p className="text-xs text-green-600 mt-1">✓ {fileOrig.name}</p>}
                        </div>

                        <button
                            onClick={handleLoadExcel}
                            disabled={!fileDest || !fileOrig}
                            className={`w-full py-4 rounded-xl font-bold text-white text-lg transition-all shadow-lg ${!fileDest || !fileOrig
                                ? 'bg-slate-400 cursor-not-allowed'
                                : 'bg-linear-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 shadow-violet-500/30'
                                }`}
                        >
                            Muat & Preview Data
                        </button>

                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <h4 className="text-sm font-semibold text-slate-700 mb-2">Kolom yang Diperlukan</h4>
                            <div className="flex flex-wrap gap-1.5">
                                {REQUIRED_COLUMNS.map(col => (
                                    <span key={col} className="px-2 py-1 bg-white rounded-md text-xs font-mono text-slate-600 border border-slate-200">
                                        {col}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'paste' && (
                    <div className="flex flex-col gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Paste Data Bongkar
                            </label>
                            <p className="text-xs text-slate-400 mb-2">
                                Masukkan seluruh kolom beserta Header
                            </p>
                            <textarea
                                value={pasteDest}
                                onChange={(e) => setPasteDest(e.target.value)}
                                placeholder={"NO SOPT\tCABANG\tACT. LOAD DATE\tCUST ID\tALAMAT\tSIZE CONT\tSERVICE TYPE\tGRADE CONT\nS001\tMAKASSAR\t2026-02-25 10:00\tABC001\tJl. Example\t20\tINTERCHANGE\tGRADE A"}
                                className="w-full h-40 p-3 border border-slate-200 rounded-lg text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
                            />
                            {pasteDest && (
                                <p className="text-xs text-green-600 mt-1">
                                    {pasteDest.trim().split('\n').length - 1} baris terdeteksi
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Paste Data Muat
                            </label>
                            <p className="text-xs text-slate-400 mb-2">
                                Masukkan seluruh kolom beserta Header
                            </p>
                            <textarea
                                value={pasteOrig}
                                onChange={(e) => setPasteOrig(e.target.value)}
                                placeholder={"NO SOPT\tCABANG\tACT. LOAD DATE\tCUST ID\tALAMAT\tSIZE CONT\tSERVICE TYPE\tGRADE CONT\nS011\tMAKASSAR\t2026-02-27 08:00\tDEF002\tJl. Sample\t40\tINTERCHANGE\tGRADE A"}
                                className="w-full h-40 p-3 border border-slate-200 rounded-lg text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                            />
                            {pasteOrig && (
                                <p className="text-xs text-green-600 mt-1">
                                    {pasteOrig.trim().split('\n').length - 1} baris terdeteksi
                                </p>
                            )}
                        </div>

                        <button
                            onClick={handleLoadPaste}
                            disabled={!pasteDest.trim() || !pasteOrig.trim()}
                            className={`w-full py-4 rounded-xl font-bold text-white text-lg transition-all shadow-lg ${!pasteDest.trim() || !pasteOrig.trim()
                                ? 'bg-slate-400 cursor-not-allowed'
                                : 'bg-linear-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 shadow-violet-500/30'
                                }`}
                        >
                            Parse & Preview Data
                        </button>

                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <h4 className="text-sm font-semibold text-slate-700 mb-2">Kolom yang Diperlukan</h4>
                            <div className="flex flex-wrap gap-1.5">
                                {REQUIRED_COLUMNS.map(col => (
                                    <span key={col} className="px-2 py-1 bg-white rounded-md text-xs font-mono text-slate-600 border border-slate-200">
                                        {col}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'manual' && (
                    <div className="flex flex-col gap-6">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Input Manual</h3>
                            <p className="text-slate-500 text-sm mb-6">
                                Isi data bongkar dan muat pada tabel di bawah ini.
                            </p>
                        </div>

                        <button
                            onClick={handleStartManual}
                            className="w-full py-4 rounded-xl font-bold text-white text-lg transition-all shadow-lg bg-linear-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 shadow-violet-500/30"
                        >
                            Mulai Input Manual
                        </button>

                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <h4 className="text-sm font-semibold text-slate-700 mb-2">Kolom yang Diperlukan</h4>
                            <div className="flex flex-wrap gap-1.5">
                                {REQUIRED_COLUMNS.map(col => (
                                    <span key={col} className="px-2 py-1 bg-white rounded-md text-xs font-mono text-slate-600 border border-slate-200">
                                        {col}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
