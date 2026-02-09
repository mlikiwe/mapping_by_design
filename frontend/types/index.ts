export interface OptimizationResult {
  DEST_ID: string;
  ORIG_ID: string;
  CABANG: string;
  SIZE_CONT?: string;
  STATUS: string;
  KATEGORI_POOL: string;
  
  // Jarak full round trip (port ke port)
  JARAK_TRIANGULASI: number;   // Port->Bongkar->Muat->Port
  JARAK_VIA_PORT: number;       // Port->Bongkar->Port->Muat->Port
  JARAK_BONGKAR_MUAT?: number;  // Hanya jarak bongkar ke muat
  SAVING_KM: number;
  
  COST_TRIANGULASI?: number;
  COST_VIA_PORT?: number;
  SAVING_COST?: number;
  
  SCORE_FINAL: number;
  EST_PERJALANAN_JAM: number;
  GAP_WAKTU_ASLI: number;
  
  REKOMENDASI_TINDAKAN: string;
  WAKTU_BONGKAR_ASLI: string;
  WAKTU_MUAT_ASLI: string;
  OPSI_SISI_ORIGIN?: string | null;
  OPSI_SISI_DEST?: string | null;
  
  origin_coords?: [number, number];
  dest_coords?: [number, number];
  port_coords?: [number, number];
  geometry?: string;
}

export interface OptimizationStats {
  match: number;
  saving: number;
  savingCost: number;
}

export interface CabangStats {
  cabang: string;
  count: number;
  saving: number;
  savingCost?: number;
}

// Route-based views (for Header display)
export type ViewState = 'landing' | 'upload' | 'simulation-upload' | 'download' | 'list' | 'detail';

export type AppMode = 'mapping' | 'simulation';