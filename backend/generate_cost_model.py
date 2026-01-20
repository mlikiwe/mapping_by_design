"""
Script untuk menganalisis data RFQ dan menghasilkan cost model per cabang.

Cara Penggunaan:
    python generate_cost_model.py

Output:
    - Menampilkan TRUCKING_COST_MODEL yang bisa di-copy ke logic_v10.py
    - Model: Cost = base + per_km * distance

Catatan:
    - Pastikan file RFQ Excel berada di folder yang sama dengan workspace
    - Sesuaikan path file RFQ jika berbeda
"""

import pandas as pd
import numpy as np
from scipy import stats

# =============================================================================
# KONFIGURASI - Sesuaikan path file RFQ di sini
# =============================================================================
RFQ_FILE_PATH = r'D:\Coolyeah\Semester 7\magang\roundtrip\mapping_by_design\Data_RFQ COMPARE - W ADDT COLUMNS_Kelurahan_Kecamatan_17122025_.xlsx'

# Mapping PORTID ke kode CABANG yang digunakan di sistem
PORTID_TO_CABANG = {
    'IDMAK': 'MKS',   # Makassar
    'IDSRG': 'SMG',   # Semarang
    'IDSUB': 'SBY',   # Surabaya
    'IDJKT': 'JKT',   # Jakarta
    'IDBPN': 'BPN',   # Balikpapan
    'IDPNK': 'PNK',   # Pontianak
    'IDSRI': 'SDA',   # Samarinda (Palaran)
    'IDKDI': 'KDR',   # Kendari
    'IDDJJ': 'JYP',   # Jayapura
}

# Daftar cabang yang akan dianalisis
CABANG_LIST = ['SBY', 'MKS', 'SMG', 'JKT', 'BPN', 'SDA', 'PNK', 'KDR', 'JYP']


def load_and_prepare_data(file_path: str) -> pd.DataFrame:
    """Load dan persiapkan data RFQ."""
    print(f"Loading data dari: {file_path}")
    df = pd.read_excel(file_path)
    
    print(f"Total rows: {len(df)}")
    print(f"Columns: {df.columns.tolist()}")
    
    # Map PORTID ke CABANG
    df['CABANG'] = df['PORTID'].map(PORTID_TO_CABANG)
    
    # Filter hanya cabang yang kita gunakan
    df = df[df['CABANG'].notna()].copy()
    print(f"Rows dengan cabang valid: {len(df)}")
    
    # Filter data valid (distance > 0 dan rate > 0)
    df = df[(df['DISTANCE_KM'] > 0) & (df['ISD_RATE_TR_ONLY'] > 0)].copy()
    print(f"Rows setelah filter (distance > 0, rate > 0): {len(df)}")
    
    # Normalisasi SIZE (20 DC & 21 DC -> 20, 40 HC -> 40)
    df['SIZE'] = df['CONT_TYPE'].apply(lambda x: 20 if '20' in str(x) or '21' in str(x) else 40)
    
    # Hitung rate per km untuk referensi
    df['RATE_PER_KM'] = df['ISD_RATE_TR_ONLY'] / df['DISTANCE_KM']
    
    return df


def analyze_cabang(df: pd.DataFrame, cabang: str, size: int) -> dict:
    """Analisis data untuk satu cabang dan satu size."""
    subset = df[(df['CABANG'] == cabang) & (df['SIZE'] == size)]
    n = len(subset)
    
    if n < 5:
        # Data tidak cukup untuk regresi
        if n > 0:
            median_rate = np.median(subset['ISD_RATE_TR_ONLY'] / subset['DISTANCE_KM'])
            return {
                'base': 1000000,
                'per_km': round(median_rate),
                'r2': 0,
                'n': n,
                'method': 'median'
            }
        else:
            return {
                'base': 1000000,
                'per_km': 50000,
                'r2': 0,
                'n': 0,
                'method': 'default'
            }
    
    # Linear regression
    x = subset['DISTANCE_KM'].values
    y = subset['ISD_RATE_TR_ONLY'].values
    
    slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)
    
    return {
        'base': round(intercept),
        'per_km': round(slope),
        'r2': round(r_value**2, 3),
        'n': n,
        'method': 'regression'
    }


def print_statistics(df: pd.DataFrame):
    """Cetak statistik detail per cabang."""
    print("\n" + "="*80)
    print("STATISTIK DETAIL PER CABANG DAN SIZE")
    print("="*80)
    
    for cabang in CABANG_LIST:
        print(f"\n--- {cabang} ---")
        for size in [20, 40]:
            subset = df[(df['CABANG'] == cabang) & (df['SIZE'] == size)]
            if len(subset) > 0:
                print(f"  Size {size}': n={len(subset)}")
                print(f"    Distance: min={subset['DISTANCE_KM'].min():.1f}, max={subset['DISTANCE_KM'].max():.1f}, avg={subset['DISTANCE_KM'].mean():.1f} km")
                print(f"    Rate: min=Rp {subset['ISD_RATE_TR_ONLY'].min():,.0f}, max=Rp {subset['ISD_RATE_TR_ONLY'].max():,.0f}")
                print(f"    Rate/km: median=Rp {subset['RATE_PER_KM'].median():,.0f}/km")


def generate_cost_model(df: pd.DataFrame) -> dict:
    """Generate cost model untuk semua cabang."""
    cost_model = {}
    
    for cabang in CABANG_LIST:
        cost_model[cabang] = {}
        for size in [20, 40]:
            cost_model[cabang][size] = analyze_cabang(df, cabang, size)
    
    return cost_model


def print_python_dict(cost_model: dict):
    """Cetak dalam format Python dict untuk di-copy ke logic_v10.py."""
    print("\n" + "="*80)
    print("TRUCKING_COST_MODEL - Copy ke logic_v10.py")
    print("="*80)
    print()
    print("TRUCKING_COST_MODEL: Dict[str, Dict[int, Dict[str, int]]] = {")
    
    for cabang in CABANG_LIST:
        print(f"    '{cabang}': {{")
        for size in [20, 40]:
            m = cost_model[cabang][size]
            comment = f"# R²={m['r2']}, n={m['n']}, method={m['method']}"
            print(f"        {size}: {{'base': {m['base']}, 'per_km': {m['per_km']}}},   {comment}")
        print("    },")
    
    print("}")


def print_summary_table(cost_model: dict):
    """Cetak tabel ringkasan."""
    print("\n" + "="*80)
    print("RINGKASAN COST MODEL")
    print("="*80)
    print()
    print(f"{'Cabang':<8} {'Size':<6} {'Base Cost':<15} {'Rate/km':<12} {'R²':<8} {'Data':<6}")
    print("-"*60)
    
    for cabang in CABANG_LIST:
        for size in [20, 40]:
            m = cost_model[cabang][size]
            print(f"{cabang:<8} {size:<6} Rp {m['base']:>10,} Rp {m['per_km']:>7,}/km {m['r2']:<8} n={m['n']}")


def main():
    """Main function."""
    print("="*80)
    print("GENERATOR COST MODEL DARI DATA RFQ")
    print("="*80)
    
    # Load data
    df = load_and_prepare_data(RFQ_FILE_PATH)
    
    # Print statistics
    print_statistics(df)
    
    # Generate cost model
    cost_model = generate_cost_model(df)
    
    # Print summary table
    print_summary_table(cost_model)
    
    # Print Python dict
    print_python_dict(cost_model)
    
    print("\n" + "="*80)
    print("SELESAI")
    print("="*80)


if __name__ == "__main__":
    main()
