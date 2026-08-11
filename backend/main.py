from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

import os
import logging
import requests

import models
from database import engine, get_db
from sqlalchemy import func

class WhatsAppSendRequest(BaseModel):
    target: Optional[str] = None

class WhatsAppConfigRequest(BaseModel):
    target: Optional[str] = None
    schedule: Optional[str] = "daily"

app = FastAPI(title="API Manajemen Kas - Modul User", version="1.0")
logger = logging.getLogger("uvicorn.error")
BOT_SERVICE_URL = os.getenv("BOT_SERVICE_URL", "http://localhost:8080").rstrip("/")

# Gunakan origin eksplisit agar preflight CORS valid di production.
raw_origins = os.getenv(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:3000,https://kas-cidadap.vercel.app",
)
allowed_origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
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

@app.get("/api/whatsapp/bot-info")
def get_bot_info_proxy():
    try:
        response = requests.get(f"{BOT_SERVICE_URL}/bot-info", timeout=10)
        return response.json()
    except Exception as e:
        logger.exception("Gagal mengambil status bot")
        raise HTTPException(status_code=502, detail=f"Bot service tidak terjangkau: {e}")

@app.post("/api/whatsapp/reset-session")
def reset_bot_session_proxy():
    try:
        response = requests.post(f"{BOT_SERVICE_URL}/reset-session", timeout=15)
        if response.status_code >= 400:
            detail = response.json().get("message", "Gagal reset sesi bot")
            raise HTTPException(status_code=response.status_code, detail=detail)
        return response.json()
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Gagal reset sesi bot")
        raise HTTPException(status_code=502, detail=f"Bot service tidak terjangkau: {e}")

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

@app.get("/api/whatsapp-summary/")
def get_whatsapp_summary(db: Session = Depends(get_db)):
    sum_masuk = (
        db.query(func.coalesce(func.sum(models.Transaction.amount), 0))
        .filter(models.Transaction.type.in_(["income", "masuk"]))
        .scalar()
    )
    sum_keluar = (
        db.query(func.coalesce(func.sum(models.Transaction.amount), 0))
        .filter(models.Transaction.type.in_(["expense", "keluar"]))
        .scalar()
    )

    saldo_akhir = sum_masuk - sum_keluar

    pesan = (
        f"📊 *REKAP UANG KAS*\n\n"
        # f"Periode: Bulan Ini\n\n"
        f"Total Pemasukan: Rp {sum_masuk:,.0f}\n"
        f"Total Pengeluaran: Rp {sum_keluar:,.0f}\n"
        f"-----------------------------------\n"
        f"*Saldo Akhir: Rp {saldo_akhir:,.0f}*\n\n"
        f"_Pesan otomatis dikirim oleh Sistem Kas. #by vonk._"
    )
            
    return {
        "status": "success", 
        "total_masuk": sum_masuk,
        "total_keluar": sum_keluar,
        "saldo_akhir": saldo_akhir,
        "summary_text": pesan
    }

# Endpoint jembatan ke bot Node.js lokal (port 8080) murni dari Database
@app.post("/api/whatsapp/send-live")
def send_live_whatsapp(req: Optional[WhatsAppSendRequest] = None, db: Session = Depends(get_db)):
    try:
        summary_data = get_whatsapp_summary(db)
        pesan = summary_data["summary_text"]

        # Ambil target grup dari Database konfigurasi
        config = db.query(models.WhatsAppConfig).first()
        
        # Jika belum ada pengaturan sama sekali di database, batalkan dan beri peringatan
        if not config or not config.target_group_id:
            raise HTTPException(
                status_code=400, 
                detail="Belum ada grup tujuan yang dipilih. Silakan simpan pengaturan grup terlebih dahulu."
            )

        target_destination = config.target_group_id

        bot_payload = {
            "number": target_destination,
            "message": pesan
        }
        
        response = requests.post(f"{BOT_SERVICE_URL}/send-message", json=bot_payload, timeout=15)
        
        if response.status_code != 200:
            error_detail = response.json().get("message", "Gagal mengirim via bot")
            raise HTTPException(status_code=500, detail=error_detail)

        return {
            "status": "success", 
            "message": "Pesan rekap kas berhasil dikirim ke WhatsApp!"
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.exception("Gagal mengirim WhatsApp live")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/whatsapp/config")
def save_whatsapp_config(req: WhatsAppConfigRequest, db: Session = Depends(get_db)):
    config = db.query(models.WhatsAppConfig).first()
    if not config:
        config = models.WhatsAppConfig(
            target_group_id=req.target,
            schedule_type=req.schedule if hasattr(models.WhatsAppConfig, 'schedule_type') else "daily"
        )
        db.add(config)
    else:
        config.target_group_id = req.target
        if hasattr(config, 'schedule_type'):
            config.schedule_type = req.schedule
    
    db.commit()
    
    # Perbarui jadwal otomatis di background secara dinamis berdasarkan pilihan baru
    update_dynamic_scheduler(req.schedule)
    
    return {"message": "Pengaturan target grup dan tempo berhasil disimpan!"}

@app.get("/api/whatsapp/config")
def get_whatsapp_config(db: Session = Depends(get_db)):
    config = db.query(models.WhatsAppConfig).first()
    return {
        "target": config.target_group_id if config else None,
        "schedule": getattr(config, "schedule_type", "daily") if config else "daily"
    }

# Fungsi inti untuk mengirim pesan rekap ke bot Node.js
def execute_send_whatsapp_logic(db: Session):
    summary_data = get_whatsapp_summary(db)
    pesan = summary_data["summary_text"]

    config = db.query(models.WhatsAppConfig).first()
    if not config or not config.target_group_id:
        raise Exception("Belum ada target grup WhatsApp yang diatur di database.")

    bot_payload = {
        "number": config.target_group_id,
        "message": pesan
    }
    
    response = requests.post(f"{BOT_SERVICE_URL}/send-message", json=bot_payload, timeout=15)
    if response.status_code != 200:
        error_detail = response.json().get("message", "Gagal mengirim via bot")
        raise Exception(error_detail)

# Fungsi otomatis yang dipanggil oleh background scheduler
def scheduled_send_whatsapp():
    try:
        db = next(get_db())
        print("Menjalankan pengiriman rekap kas otomatis...")
        execute_send_whatsapp_logic(db)
        print("Rekap kas otomatis berhasil dikirim!")
    except Exception as e:
        print(f"Gagal kirim otomatis: {e}")
    finally:
        db.close()

# Inisialisasi Background Scheduler
scheduler = BackgroundScheduler()

def update_dynamic_scheduler(schedule_type: str):
    # Hapus job lama jika ada agar tidak duplikat
    if scheduler.get_job("dynamic_wa_recap"):
        scheduler.remove_job("dynamic_wa_recap")

    # Tentukan aturan pemicu (CronTrigger) berdasarkan pilihan UI
    if schedule_type == "weekly":
        # Seminggu sekali: Setiap hari Senin pukul 08:00 pagi
        trigger = CronTrigger(day_of_week='mon', hour=8, minute=0)
    elif schedule_type == "monthly":
        # Sebulan sekali: Setiap tanggal 1 pukul 08:00 pagi
        trigger = CronTrigger(day=1, hour=8, minute=0)
    elif schedule_type == "yearly":
        # Setahun sekali: Setiap tanggal 1 Januari pukul 08:00 pagi
        trigger = CronTrigger(month=1, day=1, hour=8, minute=0)
    else:
        # Default: Sehari sekali (Setiap hari pukul 08:00 pagi)
        trigger = CronTrigger(hour=8, minute=0)

    scheduler.add_job(
        scheduled_send_whatsapp,
        trigger=trigger,
        id="dynamic_wa_recap",
        replace_existing=True
    )
    

# Jalankan scheduler saat aplikasi pertama kali menyala
@app.on_event("startup")
def start_scheduler():
    try:
        db = next(get_db())
        config = db.query(models.WhatsAppConfig).first()
        initial_schedule = getattr(config, "schedule_type", "daily") if config else "daily"
        db.close()
    except Exception:
        initial_schedule = "daily"

    update_dynamic_scheduler(initial_schedule)
    if not scheduler.running:
        scheduler.start()
    logger.info(f"Background WhatsApp Scheduler aktif dengan tempo: {initial_schedule}")

# Endpoint khusus untuk perintah #pemasukan
@app.get("/api/whatsapp-income/")
def get_whatsapp_income(db: Session = Depends(get_db)):
    transactions = db.query(models.Transaction).all()
    
    total_income = 0
    income_details = []

    for tx in transactions:
        if str(tx.type).lower() in ["income", "pemasukan"]:
            # Bungkus dengan int() agar tidak muncul .0 di belakangnya
            amount = int(tx.amount) if tx.amount else 0
            total_income += amount
            
            keterangan = tx.title if hasattr(tx, 'title') and tx.title else "Tanpa Judul"
            income_details.append(f"• {keterangan}: Rp {amount:,}")

    income_text = (
        "📥 *DAFTAR PEMASUKAN KAS*\n\n" + 
        ("\n".join(income_details) if income_details else "- Belum ada pemasukan") + 
        f"\n\n*Total Keseluruhan Pemasukan: Rp {total_income:,}*"
    )

    return {"income_text": income_text}


@app.get("/api/whatsapp-expense/")
def get_whatsapp_expense(db: Session = Depends(get_db)):
    transactions = db.query(models.Transaction).all()
    
    total_expense = 0
    expense_details = []

    for tx in transactions:
        if str(tx.type).lower() in ["expense", "pengeluaran"]:
            # Bungkus dengan int() agar tidak muncul .0
            amount = int(tx.amount) if tx.amount else 0
            total_expense += amount
            
            keterangan = tx.title if hasattr(tx, 'title') and tx.title else "Tanpa Judul"
            expense_details.append(f"• {keterangan}: Rp {amount:,}")

    expense_text = (
        "📤 *DAFTAR PENGELUARAN KAS*\n\n" + 
        ("\n".join(expense_details) if expense_details else "- Belum ada pengeluaran") + 
        f"\n\n*Total Keseluruhan Pengeluaran: Rp {total_expense:,}*"
    )

    return {"expense_text": expense_text}