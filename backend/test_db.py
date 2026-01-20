# backend/test_db.py
import asyncio
from sqlalchemy import text
from database import get_db

async def test_connection():
    # Simulasi mengambil session
    async_gen = get_db()
    db = await anext(async_gen)
    
    try:
        print("Mencoba koneksi ke Neon...")
        result = await db.execute(text("SELECT version();"))
        version = result.scalar()
        print(f"✅ Berhasil Konek! Versi DB: {version}")
    except Exception as e:
        print(f"❌ Gagal: {e}")
    finally:
        await db.close()

if __name__ == "__main__":
    asyncio.run(test_connection())