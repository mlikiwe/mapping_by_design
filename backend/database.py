import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# 1. Load variabel dari file .env
load_dotenv()

# 2. Ambil URL database
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL tidak ditemukan di file .env!")

# --- BAGIAN PERBAIKAN ---

# A. Ubah driver menjadi asyncpg
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# B. BERSIHKAN URL DARI QUERY PARAMETER (?sslmode=...)
# asyncpg sering error jika ada parameter di URL, jadi kita hapus semua setelah tanda tanya "?"
if "?" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.split("?")[0]

# C. Buat Engine dengan parameter SSL eksplisit
# Kita pindahkan 'sslmode=require' menjadi connect_args={"ssl": "require"}
engine = create_async_engine(
    DATABASE_URL,
    echo=True, # Set False nanti di production
    connect_args={
        "ssl": "require",  # <-- INI KUNCI FIX-NYA UTK NEON + ASYNCPG
        "server_settings": {
            "jit": "off"   # Opsional: Mematikan JIT kadang mempercepat query simple di asyncpg
        }
    }
)

# 3. Buat Session Factory
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

# 4. Dependency Injection untuk FastAPI
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()