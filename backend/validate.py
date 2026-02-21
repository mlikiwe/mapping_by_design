import time
from datetime import datetime
from difflib import get_close_matches
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd

from logic import (
    CABANG_ALIASES,
    PORT_LOCATIONS,
    geocode_helper,
    geocode_cache,
)

REQUIRED_COLUMNS = [
    'NO SOPT', 'ALAMAT', 'CABANG', 'ACT. LOAD DATE',
    'CUST ID', 'SIZE CONT', 'SERVICE TYPE', 'GRADE CONT'
]

COLUMN_ALIASES: Dict[str, str] = {
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
}

VALID_SIZE_CONT = {'20DC', '20RM', '21DC', '40HC', '40RM'}
VALID_SERVICE_TYPE = {'INTERCHANGE', 'STRIPPING'}
VALID_GRADE_CONT = {'A', 'B', 'C', '-', '', 'NAN', 'NONE'}
VALID_CABANG_CODES = set(PORT_LOCATIONS.keys())
VALID_CABANG_NAMES = set(CABANG_ALIASES.keys())

DATETIME_FORMATS = [
    '%Y-%m-%d %H:%M:%S',
    '%Y-%m-%d %H:%M',
    '%Y-%m-%dT%H:%M:%S',
    '%Y-%m-%dT%H:%M',
    '%d/%m/%Y %H:%M:%S',
    '%d/%m/%Y %H:%M',
    '%d-%m-%Y %H:%M:%S',
    '%d-%m-%Y %H:%M',
    '%d %b %Y %H:%M',
    '%d %B %Y %H:%M',
    '%Y/%m/%d %H:%M',
    '%Y-%m-%d',
    '%d/%m/%Y',
    '%d-%m-%Y',
]


def _normalize_column_name(raw: str) -> str:
    """Normalize a column name using aliases."""
    cleaned = raw.strip().upper().replace('  ', ' ')
    return COLUMN_ALIASES.get(cleaned, cleaned)


def _find_column_suggestion(col_name: str, existing_cols: List[str]) -> Optional[str]:
    """Find close match for a missing column among existing columns."""
    matches = get_close_matches(col_name, existing_cols, n=1, cutoff=0.6)
    return matches[0] if matches else None


def _try_parse_datetime(value: Any) -> Tuple[Optional[str], Optional[str]]:
    """
    Try to parse a value into ISO datetime string.
    Returns (parsed_iso, error_message).
    """
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None, "Nilai kosong"

    if isinstance(value, datetime):
        return value.strftime('%Y-%m-%dT%H:%M:%S'), None

    if isinstance(value, pd.Timestamp):
        return value.strftime('%Y-%m-%dT%H:%M:%S'), None

    s = str(value).strip()
    if not s or s.lower() in ('nat', 'nan', 'none', ''):
        return None, "Nilai kosong"

    # Try each format
    for fmt in DATETIME_FORMATS:
        try:
            dt = datetime.strptime(s, fmt)
            return dt.strftime('%Y-%m-%dT%H:%M:%S'), None
        except ValueError:
            continue

    # Try pandas as last resort (with dayfirst=True for DD/MM convention)
    try:
        dt = pd.to_datetime(s, dayfirst=True)
        if pd.notna(dt):
            return dt.strftime('%Y-%m-%dT%H:%M:%S'), None
    except Exception:
        pass

    return None, f"Format tidak dikenali: '{s}'"


def _validate_cabang(value: Any) -> Tuple[Optional[str], Optional[str]]:
    """
    Validate CABANG value.
    Returns (normalized_code, warning_message).
    """
    if pd.isna(value) or value is None:
        return None, "Nilai CABANG kosong"

    s = str(value).strip().upper()
    if not s:
        return None, "Nilai CABANG kosong"

    # Direct code match
    if s in VALID_CABANG_CODES:
        return s, None

    # Alias match
    if s in CABANG_ALIASES:
        return CABANG_ALIASES[s], None

    # Fuzzy match on names
    all_names = list(VALID_CABANG_NAMES) + list(VALID_CABANG_CODES)
    matches = get_close_matches(s, all_names, n=1, cutoff=0.7)
    if matches:
        suggestion = matches[0]
        if suggestion in CABANG_ALIASES:
            return None, f"'{s}' tidak dikenali. Mungkin maksud Anda '{suggestion}'?"
        elif suggestion in VALID_CABANG_CODES:
            return None, f"'{s}' tidak dikenali. Mungkin maksud Anda kode '{suggestion}'?"

    return None, f"'{s}' bukan nama/kode cabang yang valid"


def _validate_value(column: str, value: Any) -> Optional[str]:
    if pd.isna(value) or value is None:
        return None

    s = str(value).strip().upper()
    if not s:
        return None

    if column == 'SIZE CONT':
        if s not in VALID_SIZE_CONT:
            return f"'{value}' bukan SIZE CONT valid. Pilihan: {', '.join(sorted(VALID_SIZE_CONT))}"

    elif column == 'SERVICE TYPE':
        if s not in VALID_SERVICE_TYPE:
            return f"'{value}' bukan SERVICE TYPE valid. Pilihan: {', '.join(sorted(VALID_SERVICE_TYPE))}"

    elif column == 'GRADE CONT':
        if s not in VALID_GRADE_CONT:
            return f"'{value}' bukan GRADE CONT valid. Pilihan: A, B, C"

    return None


def geocode_single_address(address: str) -> Dict[str, Any]:
    if not address or not address.strip():
        return {"lat": None, "lon": None, "error": "Alamat kosong"}

    address = address.strip()

    if address in geocode_cache and geocode_cache[address] == (None, None):
        del geocode_cache[address]

    lat, lon = geocode_helper(address)

    if lat is not None and lon is not None:
        return {"lat": lat, "lon": lon, "error": None}
    else:
        return {"lat": None, "lon": None, "error": f"Alamat tidak ditemukan: '{address}'"}


def validate_dataframe(
    df: pd.DataFrame,
    label: str = "data"
) -> Dict[str, Any]:
    result: Dict[str, Any] = {
        "column_issues": [],
        "rows": [],
        "summary": {
            "total_rows": len(df),
            "geocode_success": 0,
            "geocode_failed": 0,
            "datetime_success": 0,
            "datetime_failed": 0,
            "value_warnings": 0,
            "missing_required": 0,
        }
    }

    if len(df) == 0:
        return result

    original_cols = list(df.columns)
    rename_map = {}
    for col in original_cols:
        normalized = _normalize_column_name(col)
        if normalized != col:
            rename_map[col] = normalized
            result["column_issues"].append({
                "original": col,
                "suggestion": normalized,
                "type": "renamed"
            })

    if rename_map:
        df = df.rename(columns=rename_map)

    current_cols = list(df.columns)
    for req_col in REQUIRED_COLUMNS:
        if req_col not in current_cols:
            suggestion = _find_column_suggestion(req_col, current_cols)
            result["column_issues"].append({
                "original": req_col,
                "suggestion": suggestion or "",
                "type": "missing"
            })

    unique_addresses = {}
    address_col_exists = 'ALAMAT' in df.columns
    date_col_exists = 'ACT. LOAD DATE' in df.columns

    if address_col_exists:
        for idx, row in df.iterrows():
            addr = str(row.get('ALAMAT', '')).strip()
            if addr and addr.lower() not in ('nan', 'none', ''):
                unique_addresses[addr] = None

    if unique_addresses:
        total = len(unique_addresses)
        print(f"[Validate] Geocoding {total} alamat unik untuk {label}...")
        for i, addr in enumerate(unique_addresses.keys()):
            print(f"  [{i + 1}/{total}] Geocoding: {addr[:50]}...")
            lat, lon = geocode_helper(addr)
            unique_addresses[addr] = (lat, lon)
            time.sleep(1.2 if lat is not None else 0.5)

    for idx, row in df.iterrows():
        row_result: Dict[str, Any] = {
            "index": int(idx),
            "datetime_parsed": None,
            "datetime_error": None,
            "geocode_lat": None,
            "geocode_lon": None,
            "geocode_error": None,
            "value_warnings": [],
        }

        if date_col_exists:
            date_val = row.get('ACT. LOAD DATE')
            parsed, error = _try_parse_datetime(date_val)
            row_result["datetime_parsed"] = parsed
            row_result["datetime_error"] = error
            if parsed:
                result["summary"]["datetime_success"] += 1
            else:
                result["summary"]["datetime_failed"] += 1
        else:
            row_result["datetime_error"] = "Kolom 'ACT. LOAD DATE' tidak ada"
            result["summary"]["datetime_failed"] += 1

        if address_col_exists:
            addr = str(row.get('ALAMAT', '')).strip()
            if addr and addr.lower() not in ('nan', 'none', ''):
                coords = unique_addresses.get(addr, (None, None))
                if coords[0] is not None and coords[1] is not None:
                    row_result["geocode_lat"] = coords[0]
                    row_result["geocode_lon"] = coords[1]
                    result["summary"]["geocode_success"] += 1
                else:
                    row_result["geocode_error"] = f"Alamat tidak ditemukan: '{addr}'"
                    result["summary"]["geocode_failed"] += 1
            else:
                row_result["geocode_error"] = "Alamat kosong"
                result["summary"]["geocode_failed"] += 1
        else:
            row_result["geocode_error"] = "Kolom 'ALAMAT' tidak ada"
            result["summary"]["geocode_failed"] += 1

        if 'CABANG' in df.columns:
            cabang_val = row.get('CABANG')
            normalized_cabang, cabang_warning = _validate_cabang(cabang_val)
            if cabang_warning:
                row_result["value_warnings"].append({
                    "column": "CABANG",
                    "value": str(cabang_val),
                    "message": cabang_warning
                })
                result["summary"]["value_warnings"] += 1

        for col in ['SIZE CONT', 'SERVICE TYPE', 'GRADE CONT']:
            if col in df.columns:
                val = row.get(col)
                warning = _validate_value(col, val)
                if warning:
                    row_result["value_warnings"].append({
                        "column": col,
                        "value": str(val),
                        "message": warning
                    })
                    result["summary"]["value_warnings"] += 1

        for req_col in REQUIRED_COLUMNS:
            if req_col in df.columns:
                val = row.get(req_col)
                if pd.isna(val) or val is None or str(val).strip() == '':
                    result["summary"]["missing_required"] += 1

        result["rows"].append(row_result)

    return result


def validate_data(
    df_dest: pd.DataFrame,
    df_orig: pd.DataFrame
) -> Dict[str, Any]:
    print("=" * 60)
    print("STARTING DATA VALIDATION")
    print("=" * 60)

    dest_result = validate_dataframe(df_dest, "bongkar/destinasi")
    orig_result = validate_dataframe(df_orig, "muat/origin")

    print("=" * 60)
    print("VALIDATION COMPLETE")
    ds = dest_result["summary"]
    os_summary = orig_result["summary"]
    print(f"  Dest: {ds['geocode_success']}/{ds['total_rows']} geocoded, "
          f"{ds['datetime_success']}/{ds['total_rows']} date parsed")
    print(f"  Orig: {os_summary['geocode_success']}/{os_summary['total_rows']} geocoded, "
          f"{os_summary['datetime_success']}/{os_summary['total_rows']} date parsed")
    print("=" * 60)

    return {
        "dest": dest_result,
        "orig": orig_result
    }