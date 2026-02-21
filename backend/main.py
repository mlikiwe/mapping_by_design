from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from logic import process_optimization
from validate import validate_data, geocode_single_address
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import io
import os
import requests

app = FastAPI()

VALHALLA_URL = os.getenv("VALHALLA_URL", "http://localhost:8002/route")

class ValhallaLocation(BaseModel):
    lat: float
    lon: float

class ValhallaRequest(BaseModel):
    locations: List[ValhallaLocation]
    costing: str = "auto"
    units: str = "km"

class GeocodeSingleRequest(BaseModel):
    address: str

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/valhalla/route")
async def valhalla_proxy(request: ValhallaRequest):
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


@app.post("/api/validate")
async def validate_endpoint(
    file_dest: UploadFile = File(...),
    file_orig: UploadFile = File(...)
):
    try:
        content_dest = await file_dest.read()
        content_orig = await file_orig.read()

        df_d = pd.read_excel(io.BytesIO(content_dest))
        df_o = pd.read_excel(io.BytesIO(content_orig))

        result = validate_data(df_d, df_o)
        return result

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/geocode-single")
async def geocode_single_endpoint(request: GeocodeSingleRequest):
    try:
        result = geocode_single_address(request.address)
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/optimize")
async def optimize_endpoint(
    file_dest: UploadFile = File(...),
    file_orig: UploadFile = File(...)
):
    try:
        content_dest = await file_dest.read()
        content_orig = await file_orig.read()
        
        df_d = pd.read_excel(io.BytesIO(content_dest))
        df_o = pd.read_excel(io.BytesIO(content_orig))
        
        required = ['NO SOPT', 'ALAMAT', 'CABANG', 'ACT. LOAD DATE', 'CUST ID'] 
        
        missing_d = [col for col in required if col not in df_d.columns]
        missing_o = [col for col in required if col not in df_o.columns]
        
        if missing_d:
            raise HTTPException(400, f"File Destinasi kurang kolom: {missing_d}")
        if missing_o:
            raise HTTPException(400, f"File Origin kurang kolom: {missing_o}")
        
        results = process_optimization(df_d, df_o)
        return results
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))