from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from backend.logic import process_optimization
from pydantic import BaseModel
from typing import List
import pandas as pd
import io
import requests

app = FastAPI()

# Valhalla Configuration
VALHALLA_URL = "http://localhost:8002/route"

# Model untuk request Valhalla proxy
class ValhallaLocation(BaseModel):
    lat: float
    lon: float

class ValhallaRequest(BaseModel):
    locations: List[ValhallaLocation]
    costing: str = "auto"
    units: str = "km"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ENDPOINT PROXY VALHALLA ---
@app.post("/api/valhalla/route")
async def valhalla_proxy(request: ValhallaRequest):
    """
    Proxy endpoint untuk mengakses Valhalla dari frontend.
    Ini menghindari masalah CORS karena browser tidak bisa langsung akses Valhalla.
    """
    try:
        payload = {
            "locations": [{"lat": loc.lat, "lon": loc.lon} for loc in request.locations],
            "costing": request.costing,
            "units": request.units
        }
        
        headers = {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true"
        }
        
        response = requests.post(VALHALLA_URL, json=payload, headers=headers, timeout=15, verify=False)
        
        if response.status_code == 200:
            return response.json()
        else:
            raise HTTPException(
                status_code=response.status_code, 
                detail=f"Valhalla error: {response.text[:200]}"
            )
            
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Valhalla timeout")
    except requests.exceptions.ConnectionError:
        raise HTTPException(status_code=503, detail="Tidak dapat terhubung ke Valhalla server")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/optimize")
async def optimize_endpoint(
    file_dest: UploadFile = File(...),
    file_orig: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    try:
        content_dest = await file_dest.read()
        content_orig = await file_orig.read()
        
        df_d = pd.read_excel(io.BytesIO(content_dest))
        df_o = pd.read_excel(io.BytesIO(content_orig))
        
        # Validasi Kolom Wajib (SESUAI INPUT EXCEL RAW ANDA)
        # HAPUS LAT/LON DARI WAJIB, TAMBAH ALAMAT
        required = ['NO SOPT', 'ALAMAT', 'CABANG'] 
        
        # Cek kelengkapan kolom
        missing_d = [col for col in required if col not in df_d.columns]
        missing_o = [col for col in required if col not in df_o.columns]
        
        if missing_d:
            raise HTTPException(400, f"File Destinasi kurang kolom: {missing_d}")
        if missing_o:
            raise HTTPException(400, f"File Origin kurang kolom: {missing_o}")
        
        # Jalankan
        results = process_optimization(df_d, df_o)
        return results
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))