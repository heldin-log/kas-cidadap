from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date
import os
import logging

import models
from database import engine, get_db

app = FastAPI(title="API Manajemen Kas - Modul User", version="1.0")
logger = logging.getLogger("uvicorn.error")

# Gunakan origin eksplisit agar preflight CORS valid di production.
raw_origins = os.getenv(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:3000,https://kas-cidadap.vercel.app",
)
allowed_origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],  # Mengizinkan semua method (GET, POST, PUT, DELETE, dll)
    allow_headers=["*"],  # Mengizinkan semua header
)

# Fungsi untuk membuat admin default otomatis saat aplikasi pertama kali dinyalakan
def create_default_admin():
    db = next(get_db())
    try:
        # Cek apakah sudah ada user dengan role admin
        admin = db.query(models.User).filter(models.User.role == "admin").first()
        if not admin:
            db_admin = models.User(
                name="Vonk",
                phone="083114566294", # Nilai unik agar tidak melanggar constraint jika ada
                password="vonXvi31",   # Password default sesuai permintaan
                role="admin"
            )
            db.add(db_admin)
            db.commit()
    finally:
        db.close()

# Event startup FastAPI untuk inisialisasi database dan akun default
@app.on_event("startup")
def startup_event():
    try:
        models.Base.metadata.create_all(bind=engine)
        create_default_admin()
    except Exception:
        # Jangan matikan proses aplikasi agar service tetap up dan error terlihat di log.
        logger.exception("Gagal inisialisasi database saat startup")

# Skema data masuk untuk tambah user
class UserCreate(BaseModel):
    name: str
    phone: str
    password: str
    role: str = "member"

# Skema data masuk untuk update user
class UserUpdate(BaseModel):
    name: str
    phone: str
    password: str
    role: str

# Skema data masuk untuk transaksi (date dibuat optional dengan default hari ini)
class TransactionCreate(BaseModel):
    title: str
    amount: float
    type: str  # "income" atau "expense"
    date: Optional[str] = Field(default_factory=lambda: str(date.today()))

class LoginRequest(BaseModel):
    password: str

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/login/")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    # Cek apakah password cocok dengan admin default kita
    admin = db.query(models.User).filter(
        models.User.password == request.password,
        models.User.role == "admin"
    ).first()
    
    if not admin:
        raise HTTPException(status_code=401, detail="Password salah!")
    
    # TAMBAHKAN 'role' KE DALAM RESPONS
    return {
        "message": "Login berhasil", 
        "user": admin.name, 
        "role": admin.role  # Ini akan mengirimkan nilai "admin" ke frontend
    }

# 1. CREATE: Tambah User Baru
@app.post("/users/", status_code=201)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.phone == user.phone).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Nomor telepon sudah terdaftar!")
    
    db_user = models.User(name=user.name, phone=user.phone, password=user.password, role=user.role)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return {"message": "User berhasil ditambahkan", "data": db_user}

# 2. READ: Ambil Semua Daftar User
@app.get("/users/")
def get_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()

# 3. READ: Ambil Detail User Berdasarkan ID
@app.get("/users/{user_id}")
def get_user_by_id(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    return user

# 4. UPDATE: Ubah Data User
@app.put("/users/{user_id}")
def update_user(user_id: int, user_update: UserUpdate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    
    user.name = user_update.name
    user.phone = user_update.phone
    user.password = user_update.password
    user.role = user_update.role
    
    db.commit()
    db.refresh(user)
    return {"message": "Data user berhasil diperbarui", "data": user}

# 5. DELETE: Hapus User
@app.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    
    db.delete(user)
    db.commit()
    return {"message": "User berhasil dihapus"}


@app.get("/transactions/")
def get_transactions(db: Session = Depends(get_db)):
    return db.query(models.Transaction).order_by(models.Transaction.id.desc()).all()

@app.post("/transactions/")
def create_transaction(tx: TransactionCreate, db: Session = Depends(get_db)):
    # Menggunakan tanggal dari request atau fallback ke hari ini jika kosong/null
    tx_date = tx.date if tx.date else str(date.today())
    
    db_tx = models.Transaction(
        title=tx.title, 
        amount=tx.amount, 
        type=tx.type, 
        date=tx_date
    )
    db.add(db_tx)
    db.commit()
    db.refresh(db_tx)
    return db_tx

@app.delete("/transactions/{tx_id}")
def delete_transaction(tx_id: int, db: Session = Depends(get_db)):
    tx = db.query(models.Transaction).filter(models.Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan")
    db.delete(tx)
    db.commit()
    return {"message": "Transaksi berhasil dihapus"}