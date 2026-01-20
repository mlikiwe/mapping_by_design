interface StatusBadgeProps {
  status?: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  if (!status) {
    return (
      <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded text-xs">
        N/A
      </span>
    );
  }

  const s = status.toUpperCase();

  if (s.includes("OPTIMAL") || s.includes("MATCHED")) {
    return (
      <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md text-xs font-bold border border-emerald-200 tracking-wide">
        OPTIMAL
      </span>
    );
  }

  if (s.includes("LATE")) {
    return (
      <span className="bg-rose-100 text-rose-700 px-2.5 py-1 rounded-md text-xs font-bold border border-rose-200 tracking-wide">
        PERLU SHIFT
      </span>
    );
  }

  if (s.includes("IDLE")) {
    return (
      <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-md text-xs font-bold border border-amber-200 tracking-wide">
        IDLE TINGGI
      </span>
    );
  }

  return (
    <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs font-bold border border-slate-200">
      {status}
    </span>
  );
}