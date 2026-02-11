import os
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any

import numpy as np
import pandas as pd
import requests
import urllib3
from scipy.optimize import linear_sum_assignment
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderUnavailable, GeocoderServiceError

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

VALHALLA_URL = os.getenv("VALHALLA_URL", "http://localhost:8002/route")

GEOCODE_TIMEOUT = 10        
GEOCODE_MAX_RETRIES = 3
GEOCODE_RETRY_DELAY = 2     

PREP_TIME_HOURS = 2.0       
MAX_IDLE_HOURS = 4.0        

MAX_MUNDURKAN_BONGKAR = 8   # Max waktu jadwal bongkar mundur
MAX_MUNDURKAN_MUAT = 8      # Max waktu jadwal muat mundur
MAX_MAJUKAN_BONGKAR = 24    # Max waktu jadwal bongkar maju
MAX_MAJUKAN_MUAT = 12       # Max waktu jadwal muat maju

WEIGHT_SAVING = 1000        
PENALTY_PER_HOUR = 500      

PORT_LOCATIONS: Dict[str, Dict[str, float]] = {
    'MKS': {'lat': -5.113802573807123, 'lon': 119.41037950498233},
    'SMG': {'lat': -6.942867577132296, 'lon': 110.42457707933995},
    'SEMARANG': {'lat': -6.942867577132296, 'lon': 110.42457707933995},
    'JYP': {'lat': -2.544847344680502, 'lon': 140.71329620822493},
    'PNK': {'lat': -0.018584509467722148, 'lon': 109.33400183258493},
    'SDA': {'lat': -0.5755879460602218, 'lon': 117.2067604145952},
    'KDR': {'lat': -3.9895283429207495, 'lon': 122.6190354078469},
    'BPN': {'lat': -1.1568616485972183, 'lon': 116.78528031499359},
    'SBY': {'lat': -7.218371647800905, 'lon': 112.72841955208024},
    'SURABAYA': {'lat': -7.218371647800905, 'lon': 112.72841955208024},
    'JKT': {'lat': -6.108317688297046, 'lon': 106.87547242239924},
    'JAKARTA': {'lat': -6.108317688297046, 'lon': 106.87547242239924},
}

CABANG_ALIASES: Dict[str, str] = {
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

TRUCKING_COST_MODEL: Dict[str, Dict[int, Dict[str, int]]] = {
    'SBY': {
        20: {'base': 1012092, 'per_km': 13225},   
        40: {'base': 1151394, 'per_km': 15489},   
    },
    'MKS': {
        20: {'base': 1191595, 'per_km': 15765},   
        40: {'base': 1650161, 'per_km': 30059},   
    },
    'SMG': {
        20: {'base': 1126369, 'per_km': 13724},   
        40: {'base': 1504052, 'per_km': 12384},   
    },
    'JKT': {
        20: {'base': 1066635, 'per_km': 15201},   
        40: {'base': 842506, 'per_km': 20348},    
    },
    'BPN': {
        20: {'base': 974899, 'per_km': 67692},    
        40: {'base': 2165839, 'per_km': 84821},   
    },
    'SDA': {
        20: {'base': 1268345, 'per_km': 68670},   
        40: {'base': 1887260, 'per_km': 91306},   
    },
    'PNK': {
        20: {'base': 1720838, 'per_km': 31480},   
        40: {'base': 2715683, 'per_km': 44559},   
    },
    'KDR': {
        20: {'base': 1062738, 'per_km': 31920},   
        40: {'base': 1240141, 'per_km': 57552},   
    },
    'JYP': {
        20: {'base': 2147488, 'per_km': 13825},   
        40: {'base': 4404528, 'per_km': 277301},  
    },
}

DEFAULT_COST_MODEL: Dict[int, Dict[str, int]] = {
    20: {'base': 1200000, 'per_km': 25000},
    40: {'base': 1800000, 'per_km': 40000},
}

route_cache: Dict[str, Tuple[float, float, str]] = {}
geocode_cache: Dict[str, Tuple[Optional[float], Optional[float]]] = {}

def geocode_helper(
    geolocator: Nominatim,
    address: str,
    max_retries: int = GEOCODE_MAX_RETRIES
) -> Tuple[Optional[float], Optional[float]]:
    if address in geocode_cache:
        return geocode_cache[address]
    
    for attempt in range(max_retries):
        try:
            query = str(address)
            if "indonesia" not in query.lower():
                query += ", Indonesia"
            
            location = geolocator.geocode(query, timeout=GEOCODE_TIMEOUT)
            
            if location:
                result = (location.latitude, location.longitude)
            else:
                result = (None, None)
            
            geocode_cache[address] = result
            return result
            
        except (GeocoderTimedOut, GeocoderUnavailable, GeocoderServiceError) as e:
            print(f"Geocoding attempt {attempt + 1}/{max_retries} failed for '{address}': {type(e).__name__}")
            if attempt < max_retries - 1:
                time.sleep(GEOCODE_RETRY_DELAY * (attempt + 1))
            continue
            
        except Exception as e:
            print(f"Unexpected geocoding error for '{address}': {e}")
            break
    
    geocode_cache[address] = (None, None)
    return (None, None)

def geocode_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    if 'ALAMAT_LAT' in df.columns and df['ALAMAT_LAT'].notna().all():
        return df
    
    if 'ALAMAT' not in df.columns:
        return df
    
    geolocator = Nominatim(
        user_agent="mapping_dooring",
        timeout=GEOCODE_TIMEOUT
    )
    
    df['SEARCH_QUERY'] = df['ALAMAT'].astype(str)
    unique_addresses = df['SEARCH_QUERY'].unique()
    
    address_coords: Dict[str, Tuple[Optional[float], Optional[float]]] = {}
    total = len(unique_addresses)
    
    print(f"Geocoding {total} alamat unik...")
    
    for idx, addr in enumerate(unique_addresses):
        print(f"  [{idx + 1}/{total}] Geocoding: {addr[:50]}...")
        coords = geocode_helper(geolocator, addr)
        address_coords[addr] = coords
        
        sleep_time = 1.2 if coords != (None, None) else 0.5
        time.sleep(sleep_time)
    
    df['ALAMAT_LAT'] = df['SEARCH_QUERY'].map(lambda x: address_coords.get(x, (None, None))[0])
    df['ALAMAT_LONG'] = df['SEARCH_QUERY'].map(lambda x: address_coords.get(x, (None, None))[1])
    
    success_count = df['ALAMAT_LAT'].notna().sum()
    print(f"Geocoding selesai: {success_count}/{len(df)} alamat berhasil di-geocode")
    
    return df

def _create_route_cache_key(lat1: float, lon1: float, lat2: float, lon2: float) -> str:
    return f"{round(lat1, 5)},{round(lon1, 5)}|{round(lat2, 5)},{round(lon2, 5)}"

def get_valhalla_route(
    lat_start: float,
    lon_start: float,
    lat_end: float,
    lon_end: float
) -> Tuple[Optional[float], Optional[float], Optional[str]]:
    cache_key = _create_route_cache_key(lat_start, lon_start, lat_end, lon_end)
    
    if cache_key in route_cache:
        return route_cache[cache_key]
    
    payload = {
        "locations": [
            {"lat": lat_start, "lon": lon_start},
            {"lat": lat_end, "lon": lon_end}
        ],
        "costing": "auto",
        "units": "km"
    }
    
    headers = {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true"
    }
    
    try:
        response = requests.post(
            VALHALLA_URL,
            json=payload,
            headers=headers,
            timeout=15,
            verify=False
        )
        
        if response.status_code == 200:
            data = response.json()
            shape = data['trip']['legs'][0]['shape']
            distance_km = data['trip']['summary']['length']
            time_hours = data['trip']['summary']['time'] / 3600.0
            
            result = (distance_km, time_hours, shape)
            route_cache[cache_key] = result
            return result
            
    except Exception:
        pass
    
    return (None, None, None)

def normalize_cabang(cabang: Any) -> Optional[str]:
    if pd.isna(cabang) or cabang is None:
        return None
    
    cabang_str = str(cabang).strip().upper()
    return CABANG_ALIASES.get(cabang_str, cabang_str)

def get_port_location(cabang: str) -> Dict[str, float]:
    return PORT_LOCATIONS.get(cabang, PORT_LOCATIONS['JKT'])

def calculate_trucking_cost(cabang: str, size: int, distance_km: float) -> float:
    normalized_size = 20 if size in [20, 21] else 40
    
    if cabang in TRUCKING_COST_MODEL:
        model = TRUCKING_COST_MODEL[cabang].get(normalized_size, DEFAULT_COST_MODEL[normalized_size])
    else:
        model = DEFAULT_COST_MODEL[normalized_size]
    
    cost = model['base'] + model['per_km'] * distance_km
    return cost

def is_grade_match(grade_dest: str, grade_orig: str) -> bool:
    invalid_values = ['-', 'nan', 'None', '']
    
    d_grade = str(grade_dest).strip()
    o_grade = str(grade_orig).strip()
    
    if d_grade in invalid_values or o_grade in invalid_values:
        return True
    
    return d_grade == o_grade

def evaluate_time_feasibility(
    time_gap: float
) -> Tuple[str, float, List[str]]:
    if time_gap < 0:
        shortage = abs(time_gap)
        can_delay_load = shortage <= MAX_MUNDURKAN_MUAT
        can_advance_unload = shortage <= MAX_MAJUKAN_BONGKAR
        
        if can_delay_load or can_advance_unload:
            options = []
            if can_delay_load:
                options.append("MUNDUR_MUAT")
            if can_advance_unload:
                options.append("MAJU_BONGKAR")
            return ("LATE_SHIFT_POSSIBLE", shortage, options)
        else:
            return ("UNFEASIBLE", 0, [])
    
    elif time_gap > MAX_IDLE_HOURS:
        excess = time_gap - MAX_IDLE_HOURS
        can_advance_load = excess <= MAX_MAJUKAN_MUAT
        can_delay_unload = excess <= MAX_MUNDURKAN_BONGKAR
        
        if can_advance_load or can_delay_unload:
            options = []
            if can_advance_load:
                options.append("MAJU_MUAT")
            if can_delay_unload:
                options.append("MUNDUR_BONGKAR")
            return ("IDLE_REDUCE_POSSIBLE", excess, options)
        else:
            return ("UNFEASIBLE", 0, [])
    
    else:
        return ("OPTIMAL", 0, ["PERFECT"])

def calculate_match_score(saving_km: float, shift_hours: float) -> float:
    saving_value = saving_km * WEIGHT_SAVING
    penalty_value = shift_hours * PENALTY_PER_HOUR
    return saving_value - penalty_value

def build_recommendation_text(
    pool_category: str,
    shift_hours: float,
    time_gap: float,
    options: List[str],
    unload_time: datetime,
    load_time: datetime
) -> Tuple[str, Optional[str], Optional[str]]:
    date_format = "%d-%b %H:%M"
    origin_text: Optional[str] = None
    dest_text: Optional[str] = None
    
    if pool_category == "OPTIMAL":
        main_text = f"MATCH OPTIMAL. Idle {time_gap:.1f} jam."
        origin_text = f"Tidak perlu penyesuaian. Jadwal muat: {load_time.strftime(date_format)}"
        dest_text = f"Tidak perlu penyesuaian. Selesai bongkar: {unload_time.strftime(date_format)}"
        
    elif pool_category == "LATE_SHIFT_POSSIBLE":
        main_text = f"TERLAMBAT {shift_hours:.1f} JAM. Perlu penyesuaian jadwal."
        
        if "MUNDUR_MUAT" in options:
            new_time = load_time + timedelta(hours=shift_hours)
            origin_text = (
                f"Mundurkan jadwal muat dari {load_time.strftime(date_format)} "
                f"ke {new_time.strftime(date_format)} (+{shift_hours:.1f} jam)"
            )
            main_text += f"\n-> Opsi Origin: {origin_text}"
        else:
            origin_text = f"Tidak bisa mundurkan muat (melebihi batas {MAX_MUNDURKAN_MUAT} jam)"
        
        if "MAJU_BONGKAR" in options:
            new_time = unload_time - timedelta(hours=shift_hours)
            dest_text = (
                f"Percepat bongkar dari {unload_time.strftime(date_format)} "
                f"ke {new_time.strftime(date_format)} (-{shift_hours:.1f} jam)"
            )
            main_text += f"\n-> Opsi Dest: {dest_text}"
        else:
            dest_text = f"Tidak bisa percepat bongkar (melebihi batas {MAX_MAJUKAN_BONGKAR} jam)"
            
    elif pool_category == "IDLE_REDUCE_POSSIBLE":
        main_text = f"IDLE TINGGI ({time_gap:.1f} Jam). Bisa dikurangi dengan penyesuaian."
        
        if "MAJU_MUAT" in options:
            new_time = load_time - timedelta(hours=shift_hours)
            origin_text = (
                f"Majukan jadwal muat dari {load_time.strftime(date_format)} "
                f"ke {new_time.strftime(date_format)} (-{shift_hours:.1f} jam)"
            )
            main_text += f"\n-> Opsi Origin: {origin_text}"
        else:
            origin_text = f"Tidak bisa majukan muat (melebihi batas {MAX_MAJUKAN_MUAT} jam)"
        
        if "MUNDUR_BONGKAR" in options:
            new_time = unload_time + timedelta(hours=shift_hours)
            dest_text = (
                f"Tahan truk/mundur bongkar dari {unload_time.strftime(date_format)} "
                f"ke {new_time.strftime(date_format)} (+{shift_hours:.1f} jam)"
            )
            main_text += f"\n-> Opsi Dest: {dest_text}"
        else:
            dest_text = f"Tidak bisa mundurkan bongkar (melebihi batas {MAX_MUNDURKAN_BONGKAR} jam)"
    
    else:
        main_text = "Status tidak diketahui"
    
    return (main_text, origin_text, dest_text)

def process_optimization(
    df_dest: pd.DataFrame,
    df_origin: pd.DataFrame
) -> List[Dict[str, Any]]:

    df_dest['ACT. FINISH DATE'] = pd.to_datetime(
        df_dest['ACT. FINISH DATE'], 
        errors='coerce'
    )
    df_origin['PICK / DELIV DATE'] = pd.to_datetime(
        df_origin['PICK / DELIV DATE'], 
        errors='coerce'
    )
    
    if 'ALAMAT_LAT' not in df_dest.columns:
        df_dest = geocode_dataframe(df_dest)
    if 'ALAMAT_LAT' not in df_origin.columns:
        df_origin = geocode_dataframe(df_origin)
    
    df_dest = df_dest.dropna(
        subset=['ALAMAT_LAT', 'ALAMAT_LONG', 'ACT. FINISH DATE']
    ).reset_index(drop=True)
    
    df_origin = df_origin.dropna(
        subset=['ALAMAT_LAT', 'ALAMAT_LONG', 'PICK / DELIV DATE']
    ).reset_index(drop=True)
    
    num_dest = len(df_dest)
    num_origin = len(df_origin)
    
    print(f"Data valid: {num_dest} destinasi, {num_origin} origin")
    
    INFINITY_COST = 1e9
    cost_matrix = np.full((num_dest, num_origin), INFINITY_COST)
    
    match_details: Dict[Tuple[int, int], Dict[str, Any]] = {}
    
    print("Membangun cost matrix...")
    
    for i, dest_row in df_dest.iterrows():
        dest_id = dest_row['NO SOPT']
        dest_lat = float(dest_row['ALAMAT_LAT'])
        dest_lon = float(dest_row['ALAMAT_LONG'])
        dest_finish_time = dest_row['ACT. FINISH DATE']
        dest_cabang = normalize_cabang(dest_row['CABANG'])
        
        if dest_cabang is None:
            print(f"  Warning: DEST {dest_id} memiliki cabang kosong, dilewati.")
            continue
        
        port = get_port_location(dest_cabang)
        
        dist_port_to_dest, _, _ = get_valhalla_route(
            port['lat'], port['lon'],
            dest_lat, dest_lon
        )
        dist_port_to_dest = dist_port_to_dest if dist_port_to_dest else 99999
        
        dist_dest_to_port, _, _ = get_valhalla_route(
            dest_lat, dest_lon, 
            port['lat'], port['lon']
        )
        dist_dest_to_port = dist_dest_to_port if dist_dest_to_port else 99999
        
        for j, orig_row in df_origin.iterrows():
            orig_cabang = normalize_cabang(orig_row['CABANG'])

            if dest_cabang != orig_cabang:
                continue
            
            if dest_row['SIZE CONT'] != orig_row['SIZE CONT']:
                continue
            
            if not is_grade_match(
                dest_row.get('GRADE CONT', '-'),
                orig_row.get('GRADE CONT', '-')
            ):
                continue

            orig_lat = float(orig_row['ALAMAT_LAT'])
            orig_lon = float(orig_row['ALAMAT_LONG'])
            
            dist_direct, time_direct, route_shape = get_valhalla_route(
                dest_lat, dest_lon,
                orig_lat, orig_lon
            )
            
            if dist_direct is None:
                continue
            
            dist_port_to_orig, _, _ = get_valhalla_route(
                port['lat'], port['lon'],
                orig_lat, orig_lon
            )
            dist_port_to_orig = dist_port_to_orig if dist_port_to_orig else 99999
            
            dist_orig_to_port, _, _ = get_valhalla_route(
                orig_lat, orig_lon,
                port['lat'], port['lon']
            )
            dist_orig_to_port = dist_orig_to_port if dist_orig_to_port else 99999
            
            dist_via_port_full = (
                dist_port_to_dest +   
                dist_dest_to_port +   
                dist_port_to_orig +   
                dist_orig_to_port     
            )
            
            dist_triangulasi_full = (
                dist_port_to_dest +   
                dist_direct +         
                dist_orig_to_port     
            )
            
            saving_km = dist_via_port_full - dist_triangulasi_full
            
            if saving_km <= 0:
                continue
            
            orig_start_time = orig_row['PICK / DELIV DATE']
            
            time_window_available = (orig_start_time - dest_finish_time).total_seconds() / 3600.0
            time_travel_required = time_direct + PREP_TIME_HOURS
            time_gap = time_window_available - time_travel_required
            
            pool_category, shift_needed, options = evaluate_time_feasibility(time_gap)
            
            if pool_category == "UNFEASIBLE":
                continue
            
            score = calculate_match_score(saving_km, shift_needed)
            
            size_cont = dest_row['SIZE CONT']
            size_int = 20 if '20' in str(size_cont) or '21' in str(size_cont) else 40
            
            cost_via_port = calculate_trucking_cost(dest_cabang, size_int, dist_via_port_full)
            
            cost_triangulasi = calculate_trucking_cost(dest_cabang, size_int, dist_triangulasi_full)
            
            saving_cost = cost_via_port - cost_triangulasi
            
            cost_matrix[i, j] = 10_000_000 - score
            
            match_details[(i, j)] = {
                'dest_id': dest_id,
                'orig_id': orig_row['NO SOPT'],
                'cabang': dest_cabang,
                'size_cont': size_cont,
                'pool': pool_category,
                'score': score,
                'saving_km': saving_km,
                'saving_cost': saving_cost,
                'cost_triangulasi': cost_triangulasi,
                'cost_via_port': cost_via_port,
                'dist_triangulasi': dist_triangulasi_full,  
                'dist_via_port': dist_via_port_full,        
                'dist_direct': dist_direct,                  
                'est_travel': time_direct,
                'shift': shift_needed,
                'gap': time_gap,
                'opsi': options,
                'shape': route_shape,
                'waktu_bongkar': dest_finish_time,
                'waktu_muat': orig_start_time,
                'dest_lat': dest_lat,
                'dest_lon': dest_lon,
                'orig_lat': orig_lat,
                'orig_lon': orig_lon
            }

    print("Menjalankan Hungarian Algorithm untuk optimasi global...")
    row_indices, col_indices = linear_sum_assignment(cost_matrix)
    
    results: List[Dict[str, Any]] = []
    
    for row_idx, col_idx in zip(row_indices, col_indices):
        if cost_matrix[row_idx, col_idx] >= INFINITY_COST:
            continue
        
        details = match_details[(row_idx, col_idx)]
        
        dest_cabang = df_dest.iloc[row_idx]['CABANG'] if row_idx < num_dest else 'JKT'
        port_loc = get_port_location(str(dest_cabang).upper())
        
        rekom_text, opsi_origin, opsi_dest = build_recommendation_text(
            pool_category=details['pool'],
            shift_hours=details['shift'],
            time_gap=details['gap'],
            options=details['opsi'],
            unload_time=details['waktu_bongkar'],
            load_time=details['waktu_muat']
        )
        
        results.append({
            "DEST_ID": str(details['dest_id']),
            "ORIG_ID": str(details['orig_id']),
            "CABANG": details['cabang'],
            "SIZE_CONT": str(details['size_cont']),
            "STATUS": "MATCHED",
            "KATEGORI_POOL": details['pool'],
            "JARAK_TRIANGULASI": round(details['dist_triangulasi'], 2),  
            "JARAK_VIA_PORT": round(details['dist_via_port'], 2),        
            "JARAK_BONGKAR_MUAT": round(details['dist_direct'], 2),      
            "SAVING_KM": round(details['saving_km'], 2),
            "COST_TRIANGULASI": round(details['cost_triangulasi']),
            "COST_VIA_PORT": round(details['cost_via_port']),
            "SAVING_COST": round(details['saving_cost']),
            "SCORE_FINAL": round(details['score'], 2),
            "EST_PERJALANAN_JAM": round(details['est_travel'], 2),
            "GAP_WAKTU_ASLI": round(details['gap'], 2),
            "REKOMENDASI_TINDAKAN": rekom_text,
            "OPSI_SISI_ORIGIN": opsi_origin,
            "OPSI_SISI_DEST": opsi_dest,
            "WAKTU_BONGKAR_ASLI": details['waktu_bongkar'].strftime('%Y-%m-%d %H:%M:%S'),
            "WAKTU_MUAT_ASLI": details['waktu_muat'].strftime('%Y-%m-%d %H:%M:%S'),
            "geometry": details['shape'],
            "origin_coords": [details['orig_lat'], details['orig_lon']],
            "dest_coords": [details['dest_lat'], details['dest_lon']],
            "port_coords": [port_loc['lat'], port_loc['lon']]
        })
    
    total_saving_km = sum(r['SAVING_KM'] for r in results)
    total_saving_cost = sum(r['SAVING_COST'] for r in results)
    
    print(f"Selesai! Ditemukan {len(results)} rute optimal.")
    print(f"Total Penghematan Jarak: {total_saving_km:,.2f} km")
    print(f"Total Penghematan Biaya: Rp {total_saving_cost:,.0f}")
    
    return results