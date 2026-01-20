"use client";

interface UploadViewProps {
  fileDest: File | null;
  fileOrig: File | null;
  loading: boolean;
  onFileDestChange: (file: File | null) => void;
  onFileOrigChange: (file: File | null) => void;
  onRun: () => void;
}

export default function UploadView({
  fileDest,
  fileOrig,
  loading,
  onFileDestChange,
  onFileOrigChange,
  onRun,
}: UploadViewProps) {
  return (
    <div className="max-w-2xl mx-auto mt-20 animate-in fade-in slide-in-from-bottom-8">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">UPLOAD DATA</h2>
        <p className="text-slate-500">
          Upload Data Rencana Bongkar dengan format Excel .xlsx
        </p>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 flex flex-col gap-6">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Data Bongkar (Destinasi)
          </label>
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => onFileDestChange(e.target.files?.[0] || null)}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-200 rounded-lg"
          />
          {fileDest && (
            <p className="text-xs text-green-600 mt-1">
              ✓ {fileDest.name}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Data Muat (Origin)
          </label>
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => onFileOrigChange(e.target.files?.[0] || null)}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-200 rounded-lg"
          />
          {fileOrig && (
            <p className="text-xs text-green-600 mt-1">
              ✓ {fileOrig.name}
            </p>
          )}
        </div>

        <button
          onClick={onRun}
          disabled={loading || !fileDest || !fileOrig}
          className={`w-full py-4 rounded-xl font-bold text-white text-lg transition-all shadow-lg ${
            loading || !fileDest || !fileOrig
              ? 'bg-slate-400 cursor-not-allowed'
              : 'bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/30'
          }`}
        >
          {loading ? 'Sedang Memproses Algoritma...' : 'Jalankan Mapping'}
        </button>
      </div>
    </div>
  );
}
