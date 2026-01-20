import pandas as pd
import numpy as np
import requests
import urllib3
from datetime import datetime, timedelta
from scipy.optimize import linear_sum_assignment
from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter
from geopy.exc import GeocoderTimedOut, GeocoderUnavailable, GeocoderServiceError
import time

# --- KONFIGURASI DAN KONSTANTA (SESUAI ATURAN ANDA) ---
VALHALLA_URL = "http://localhost:8002/route"

# Konfigurasi Geocoding
GEOCODE_TIMEOUT = 10  # Timeout dalam detik
GEOCODE_MAX_RETRIES = 3
GEOCODE_RETRY_DELAY = 2  # Delay antar retry dalam detik

# Matikan Warning SSL
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

PORT_LOCATIONS = {
    'MKS': {'lat' : -5.113802573807123, 'lon' : 119.41037950498233},
    'SMG': {'lat' : -6.942867577132296, 'lon' : 110.42457707933995},
    'SEMARANG': {'lat' : -6.942867577132296, 'lon' : 110.42457707933995},
    'JYP': {'lat' : -2.544847344680502, 'lon' : 140.71329620822493},
    'PNK': {'lat' : -0.018584509467722148, 'lon' : 109.33400183258493},
    'SDA': {'lat' : -0.5755879460602218, 'lon' : 117.2067604145952},
    'KDR': {'lat' : -3.9895283429207495, 'lon' : 122.6190354078469},
    'BPN': {'lat' : -1.1568616485972183, 'lon' : 116.78528031499359},
    'SBY': {'lat' : -7.218371647800905, 'lon' : 112.72841955208024},
    'SURABAYA': {'lat' : -7.218371647800905, 'lon' : 112.72841955208024},
    'JKT': {'lat' : -6.108317688297046, 'lon' : 106.87547242239924},
    'JAKARTA': {'lat' : -6.108317688297046, 'lon' : 106.87547242239924},
}

# --- BATASAN SHIFT ---
PREP_TIME_HOURS = 2.0
MAX_IDLE_HOURS = 4.0   
MAX_MUNDURKAN_BONGKAR = 8   
MAX_MUNDURKAN_MUAT    = 8   
MAX_MAJUKAN_BONGKAR   = 24  
MAX_MAJUKAN_MUAT      = 12  

WEIGHT_SAVING = 1000     
PENALTY_PER_HOUR = 500

route_cache = {}
geocode_cache = {}  # Cache untuk hasil geocoding

def geocode_with_retry(geolocator, address, max_retries=GEOCODE_MAX_RETRIES):
    """Geocode dengan retry mechanism yang lebih robust"""
    # Cek cache dulu
    if address in geocode_cache:
        return geocode_cache[address]
    
    for attempt in range(max_retries):
        try:
            query = str(address)
            
            location = geolocator.geocode(query, timeout=GEOCODE_TIMEOUT)
            
            if location:
                result = (location.latitude, location.longitude)
                geocode_cache[address] = result
                return result
            else:
                geocode_cache[address] = (None, None)
                return (None, None)
                
        except (GeocoderTimedOut, GeocoderUnavailable, GeocoderServiceError) as e:
            print(f"Geocoding attempt {attempt + 1}/{max_retries} failed for '{address}': {type(e).__name__}")
            if attempt < max_retries - 1:
                time.sleep(GEOCODE_RETRY_DELAY * (attempt + 1))  # Exponential backoff
            continue
        except Exception as e:
            print(f"Unexpected geocoding error for '{address}': {e}")
            break
    
    geocode_cache[address] = (None, None)
    return (None, None)

def get_coordinates_geopandas(df):
    if 'ALAMAT_LAT' in df.columns and df['ALAMAT_LAT'].notna().all():
        return df
    
    # Gunakan timeout yang lebih lama
    geolocator = Nominatim(
        user_agent="dooring_optimizer_final_v10_fix",
        timeout=GEOCODE_TIMEOUT
    )
    
    if 'ALAMAT' not in df.columns: 
        return df
    
    df['SEARCH_QUERY'] = df['ALAMAT'].astype(str)
    unique_addresses = df['SEARCH_QUERY'].unique()
    address_cache = {}
    
    total = len(unique_addresses)
    print(f"Geocoding {total} alamat unik...")
    
    for idx, addr in enumerate(unique_addresses):
        print(f"  [{idx+1}/{total}] Geocoding: {addr[:50]}...")
        coords = geocode_with_retry(geolocator, addr)
        address_cache[addr] = coords
        
        # Rate limiting - jeda antar request
        if coords != (None, None):
            time.sleep(1.2)  # Nominatim policy: max 1 request/second
        else:
            time.sleep(0.5)
            
    df['ALAMAT_LAT'] = df['SEARCH_QUERY'].map(lambda x: address_cache.get(x, (None, None))[0])
    df['ALAMAT_LONG'] = df['SEARCH_QUERY'].map(lambda x: address_cache.get(x, (None, None))[1])
    
    # Report hasil
    success_count = df['ALAMAT_LAT'].notna().sum()
    print(f"Geocoding selesai: {success_count}/{len(df)} alamat berhasil di-geocode")
    
    return df

def get_route_key(lat1, lon1, lat2, lon2):
    return f"{round(lat1, 5)},{round(lon1, 5)}|{round(lat2, 5)},{round(lon2, 5)}"

def get_valhalla_route(lat_start, lon_start, lat_end, lon_end):
    cache_key = get_route_key(lat_start, lon_start, lat_end, lon_end)
    if cache_key in route_cache: return route_cache[cache_key]

    payload = {"locations": [{"lat": lat_start, "lon": lon_start}, {"lat": lat_end, "lon": lon_end}], "costing": "auto", "units": "km"}
    headers = {"Content-Type": "application/json", "ngrok-skip-browser-warning": "true"}
    
    try:
        resp = requests.post(VALHALLA_URL, json=payload, headers=headers, timeout=15, verify=False)
        if resp.status_code == 200:
            data = resp.json()
            shape = data['trip']['legs'][0]['shape']
            dist = data["trip"]["summary"]["length"]
            time_h = data["trip"]["summary"]["time"] / 3600.0
            res = (dist, time_h, shape)
            route_cache[cache_key] = res
            return res
        return None, None, None
    except Exception: 
        return None, None, None

def process_optimization(df_dest, df_origin):
    df_dest['ACT. FINISH DATE'] = pd.to_datetime(df_dest['ACT. FINISH DATE'], errors='coerce')
    df_origin['PICK / DELIV DATE'] = pd.to_datetime(df_origin['PICK / DELIV DATE'], errors='coerce')

    if 'ALAMAT_LAT' not in df_dest.columns: df_dest = get_coordinates_geopandas(df_dest)
    if 'ALAMAT_LAT' not in df_origin.columns: df_origin = get_coordinates_geopandas(df_origin)

    df_dest = df_dest.dropna(subset=['ALAMAT_LAT', 'ALAMAT_LONG', 'ACT. FINISH DATE']).reset_index(drop=True)
    df_origin = df_origin.dropna(subset=['ALAMAT_LAT', 'ALAMAT_LONG', 'PICK / DELIV DATE']).reset_index(drop=True)

    cost_matrix = np.full((len(df_dest), len(df_origin)), 1e9) 
    match_details = {} 
    
    # Normalisasi nama cabang untuk konsistensi
    def normalize_cabang(cabang):
        """Normalisasi nama cabang agar konsisten"""
        if pd.isna(cabang) or cabang is None:
            return None
        cabang_str = str(cabang).strip().upper()
        # Mapping alias cabang
        cabang_aliases = {
            'SEMARANG': 'SMG',
            'SURABAYA': 'SBY', 
            'JAKARTA': 'JKT',
            'MAKASSAR': 'MKS',
            'PONTIANAK': 'PNK',
            'SAMARINDA': 'SDA',
            'BALIKPAPAN': 'BPN',
            'KENDARI': 'KDR',
            'JAYAPURA': 'JYP',
        }
        return cabang_aliases.get(cabang_str, cabang_str)

    for i, d_row in df_dest.iterrows():
        d_id = d_row['NO SOPT']
        d_lat, d_lon = float(d_row['ALAMAT_LAT']), float(d_row['ALAMAT_LONG'])
        d_finish = d_row['ACT. FINISH DATE']
        d_cabang_raw = d_row['CABANG']
        d_cabang = normalize_cabang(d_cabang_raw)
        
        # Skip jika cabang tidak valid
        if d_cabang is None:
            print(f"Warning: DEST {d_id} memiliki cabang kosong, dilewati.")
            continue
        
        port = PORT_LOCATIONS.get(d_cabang, PORT_LOCATIONS.get('JKT'))
        d_dp, _, _ = get_valhalla_route(d_lat, d_lon, port['lat'], port['lon'])
        dist_dest_port = d_dp if d_dp else 99999

        for j, o_row in df_origin.iterrows():
            o_cabang = normalize_cabang(o_row['CABANG'])
            
            # CONSTRAINT 1: Cabang harus sama (case-insensitive & normalized)
            if d_cabang != o_cabang: 
                continue
                
            # CONSTRAINT 2: Size container harus sama
            if d_row['SIZE CONT'] != o_row['SIZE CONT']: 
                continue
            
            # CONSTRAINT 3: Grade container harus sama (jika ada)
            d_grade = str(d_row.get('GRADE CONT', '-')).strip()
            o_grade = str(o_row.get('GRADE CONT', '-')).strip()
            if d_grade not in ['-', 'nan', 'None'] and o_grade not in ['-', 'nan', 'None']:
                if d_grade != o_grade: continue

            o_lat, o_lon = float(o_row['ALAMAT_LAT']), float(o_row['ALAMAT_LONG'])
            dist_direct, time_direct, shape = get_valhalla_route(d_lat, d_lon, o_lat, o_lon)
            if dist_direct is None: continue

            d_po, _, _ = get_valhalla_route(port['lat'], port['lon'], o_lat, o_lon)
            dist_port_orig = d_po if d_po else 99999
            dist_via_port = dist_dest_port + dist_port_orig

            if dist_direct >= dist_via_port: continue 

            o_start = o_row['PICK / DELIV DATE']
            
            # Logic Waktu
            time_window_avail = (o_start - d_finish).total_seconds() / 3600.0
            time_travel_req = time_direct + PREP_TIME_HOURS
            gap = time_window_avail - time_travel_req

            pool_category = "UNFEASIBLE"
            shift_needed = 0
            score_final = -9999
            rekomendasi_opsi = []
            
            # 1. TERLAMBAT
            if gap < 0:
                kekurangan_waktu = abs(gap)
                can_mundur_muat = kekurangan_waktu <= MAX_MUNDURKAN_MUAT
                can_maju_bongkar = kekurangan_waktu <= MAX_MAJUKAN_BONGKAR
                
                if can_mundur_muat or can_maju_bongkar:
                    pool_category = "LATE_SHIFT_POSSIBLE"
                    shift_needed = kekurangan_waktu
                    if can_mundur_muat: rekomendasi_opsi.append("MUNDUR_MUAT")
                    if can_maju_bongkar: rekomendasi_opsi.append("MAJU_BONGKAR")
                else:
                    continue

            # 2. IDLE
            elif gap > MAX_IDLE_HOURS:
                kelebihan_waktu = gap - MAX_IDLE_HOURS
                can_maju_muat = kelebihan_waktu <= MAX_MAJUKAN_MUAT
                can_mundur_bongkar = kelebihan_waktu <= MAX_MUNDURKAN_BONGKAR
                
                if can_maju_muat or can_mundur_bongkar:
                    pool_category = "IDLE_REDUCE_POSSIBLE"
                    shift_needed = kelebihan_waktu
                    if can_maju_muat: rekomendasi_opsi.append("MAJU_MUAT")
                    if can_mundur_bongkar: rekomendasi_opsi.append("MUNDUR_BONGKAR")
                else:
                    # HIGH_IDLE_FORCED - di luar batasan shift, skip dari matching
                    continue

            # 3. OPTIMAL
            else:
                pool_category = "OPTIMAL"
                shift_needed = 0
                rekomendasi_opsi.append("PERFECT")

            saving_val = (dist_via_port - dist_direct) * WEIGHT_SAVING
            penalty_val = shift_needed * PENALTY_PER_HOUR
            score_final = saving_val - penalty_val
            
            cost_matrix[i, j] = 10000000 - score_final
            
            match_details[(i, j)] = {
                'dest_id': d_id, 'orig_id': o_row['NO SOPT'],
                'cabang': d_cabang,  # Tambahkan cabang untuk filter
                'pool': pool_category, 'score': score_final,
                'saving_km': (dist_via_port - dist_direct),
                'dist_triangulasi': dist_direct,
                'dist_via_port': dist_via_port,
                'est_travel': time_direct,
                'shift': shift_needed, 'gap': gap,
                'opsi': rekomendasi_opsi,
                'shape': shape,
                'waktu_bongkar': d_finish,
                'waktu_muat': o_start,
                'dest_lat': d_lat, 'dest_lon': d_lon, 'orig_lat': o_lat, 'orig_lon': o_lon
            }

    row_ind, col_ind = linear_sum_assignment(cost_matrix)

    results = []
    for r, c in zip(row_ind, col_ind):
        if cost_matrix[r, c] >= 1e9: continue
        
        det = match_details[(r, c)]
        
        # Ambil cabang dari data detail, bukan variabel luar
        # Cari cabang dari df_dest berdasarkan index r
        dest_cabang = df_dest.iloc[r]['CABANG'] if r < len(df_dest) else 'JKT'
        port_loc = PORT_LOCATIONS.get(str(dest_cabang).upper(), PORT_LOCATIONS.get('JKT'))
        
        # --- KONSTRUKSI TEKS REKOMENDASI & VARIABEL TERPISAH ---
        rekom_text = ""
        opsi_origin_text = None
        opsi_dest_text = None
        
        opsi = det['opsi']
        hours = det['shift']
        fmt_date = "%d-%b %H:%M"

        if "OPTIMAL" in det['pool']:
            rekom_text = f"MATCH OPTIMAL. Idle {det['gap']:.1f} jam."
            # Untuk OPTIMAL, berikan pesan informatif
            opsi_origin_text = f"Tidak perlu penyesuaian. Jadwal muat: {det['waktu_muat'].strftime(fmt_date)}"
            opsi_dest_text = f"Tidak perlu penyesuaian. Selesai bongkar: {det['waktu_bongkar'].strftime(fmt_date)}"
            
        elif "LATE_SHIFT_POSSIBLE" in det['pool']:
            rekom_text = f"TERLAMBAT {hours:.1f} JAM. Perlu penyesuaian jadwal."
            
            if "MUNDUR_MUAT" in opsi:
                new_time = det['waktu_muat'] + timedelta(hours=hours)
                txt = f"Mundurkan jadwal muat dari {det['waktu_muat'].strftime(fmt_date)} ke {new_time.strftime(fmt_date)} (+{hours:.1f} jam)"
                opsi_origin_text = txt
                rekom_text += f"\n-> Opsi Origin: {txt}"
            else:
                opsi_origin_text = f"Tidak bisa mundurkan muat (melebihi batas {MAX_MUNDURKAN_MUAT} jam)"
                
            if "MAJU_BONGKAR" in opsi:
                new_time = det['waktu_bongkar'] - timedelta(hours=hours)
                txt = f"Percepat bongkar dari {det['waktu_bongkar'].strftime(fmt_date)} ke {new_time.strftime(fmt_date)} (-{hours:.1f} jam)"
                opsi_dest_text = txt
                rekom_text += f"\n-> Opsi Dest: {txt}"
            else:
                opsi_dest_text = f"Tidak bisa percepat bongkar (melebihi batas {MAX_MAJUKAN_BONGKAR} jam)"
                
        elif "IDLE_REDUCE_POSSIBLE" in det['pool']:
            rekom_text = f"IDLE TINGGI ({det['gap']:.1f} Jam). Bisa dikurangi dengan penyesuaian."
            
            if "MAJU_MUAT" in opsi:
                new_time = det['waktu_muat'] - timedelta(hours=hours)
                txt = f"Majukan jadwal muat dari {det['waktu_muat'].strftime(fmt_date)} ke {new_time.strftime(fmt_date)} (-{hours:.1f} jam)"
                opsi_origin_text = txt
                rekom_text += f"\n-> Opsi Origin: {txt}"
            else:
                opsi_origin_text = f"Tidak bisa majukan muat (melebihi batas {MAX_MAJUKAN_MUAT} jam)"
                
            if "MUNDUR_BONGKAR" in opsi:
                new_time = det['waktu_bongkar'] + timedelta(hours=hours)
                txt = f"Tahan truk/mundur bongkar dari {det['waktu_bongkar'].strftime(fmt_date)} ke {new_time.strftime(fmt_date)} (+{hours:.1f} jam)"
                opsi_dest_text = txt
                rekom_text += f"\n-> Opsi Dest: {txt}"
            else:
                opsi_dest_text = f"Tidak bisa mundurkan bongkar (melebihi batas {MAX_MUNDURKAN_BONGKAR} jam)"

        results.append({
            "DEST_ID": str(det['dest_id']),
            "ORIG_ID": str(det['orig_id']),
            "CABANG": det['cabang'],  # Cabang untuk filter frontend
            "STATUS": "MATCHED",
            "KATEGORI_POOL": det['pool'],
            "JARAK_TRIANGULASI": round(det['dist_triangulasi'], 2),
            "JARAK_VIA_PORT": round(det['dist_via_port'], 2),
            "SAVING_KM": round(det['saving_km'], 2),
            "SCORE_FINAL": round(det['score'], 2),
            "EST_PERJALANAN_JAM": round(det['est_travel'], 2),
            "GAP_WAKTU_ASLI": round(det['gap'], 2),
            "REKOMENDASI_TINDAKAN": rekom_text,
            
            # --- VARIABEL BARU (DIPISAH) ---
            "OPSI_SISI_ORIGIN": opsi_origin_text,
            "OPSI_SISI_DEST": opsi_dest_text,
            
            "WAKTU_BONGKAR_ASLI": det['waktu_bongkar'].strftime('%Y-%m-%d %H:%M:%S'),
            "WAKTU_MUAT_ASLI": det['waktu_muat'].strftime('%Y-%m-%d %H:%M:%S'),
            "geometry": det['shape'],
            "origin_coords": [det['orig_lat'], det['orig_lon']],
            "dest_coords": [det['dest_lat'], det['dest_lon']],
            "port_coords": [port_loc['lat'], port_loc['lon']]
        })

    print(f"Selesai! Ditemukan {len(results)} rute optimal.")
    return results