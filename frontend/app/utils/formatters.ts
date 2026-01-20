export const formatNumber = (n: number | undefined | null): string => {
  if (n === undefined || n === null) return '0';
  return n.toLocaleString('id-ID', { maximumFractionDigits: 1 });
};

export const fmtNum = formatNumber;

export const formatRupiah = (n: number | undefined | null): string => {
  if (n === undefined || n === null || n === 0) return 'Rp 0';
  return 'Rp ' + n.toLocaleString('id-ID', { maximumFractionDigits: 0 });
};

export const fmtRp = formatRupiah;

export const formatDate = (dateStr: string | undefined | null): string => {
  if (!dateStr) return '-';
  
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
};

export const formatHours = (hours: number | undefined | null): string => {
  if (hours === undefined || hours === null) return '0 jam';
  return `${formatNumber(hours)} jam`;
};

export const formatKm = (km: number | undefined | null): string => {
  if (km === undefined || km === null) return '0 km';
  return `${formatNumber(km)} km`;
};
