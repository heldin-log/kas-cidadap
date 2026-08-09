import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

logger = logging.getLogger("uvicorn.error")

# Mengambil DATABASE_URL dari environment Railway, jika di lokal pakai SQLite kas.db
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./kas.db")

# Menyesuaikan awalan URL jika diperlukan oleh SQLAlchemy
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Konfigurasi engine sesuai jenis database yang aktif.
# Jika DATABASE_URL tidak valid, fallback ke SQLite agar service tetap bisa hidup.
try:
    if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
        engine = create_engine(
            SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
        )
    else:
        engine = create_engine(SQLALCHEMY_DATABASE_URL)
except Exception:
    logger.exception("DATABASE_URL tidak valid, fallback ke SQLite lokal")
    SQLALCHEMY_DATABASE_URL = "sqlite:///./kas.db"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()