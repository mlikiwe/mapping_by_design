export interface TimeProfile {
  mode_hour: number | null;
  distribution: Record<string, number>;
  sample_count: number;
  source: string;  // "customer" | "cabang_default" | "none"
}

export interface OptimizationResult {
  DEST_ID: string;
  ORIG_ID: string;
  CABANG: string;
  SIZE_CONT?: string;
  STATUS: string;
  KATEGORI_POOL: string;
  
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
  DURASI_BONGKAR_EST?: number;
  DURASI_MUAT_EST?: number;
  SELESAI_BONGKAR?: string;
  OPSI_SISI_ORIGIN?: string | null;
  OPSI_SISI_DEST?: string | null;
  
  DEST_CUST_ID?: string;
  ORIG_CUST_ID?: string;
  DEST_TIME_PROFILE?: TimeProfile;
  ORIG_TIME_PROFILE?: TimeProfile;

  origin_coords?: [number, number];
  dest_coords?: [number, number];
  port_coords?: [number, number];
  geometry?: string;
}

export interface CabangStats {
  cabang: string;
  total_origin: number;
  total_dest: number;
  match: number;
  saving: number;
  saving_cost: number;
}

export interface OptimizationStats {
  match: number;
  saving: number;
  savingCost: number;
  total_origin?: number;
  total_dest?: number;
  cabang_breakdown?: CabangStats[];
}

export type ViewState = 'landing' | 'upload' | 'simulation-upload' | 'download' | 'list' | 'detail';

export type AppMode = 'mapping' | 'simulation';