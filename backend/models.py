from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    phone = Column(String, unique=True)
    password = Column(String, nullable=False)
    role = Column(String, default="member")
    created_at = Column(DateTime, default=datetime.utcnow)

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    type = Column(String, nullable=False)  # "income" atau "expense"
    date = Column(String, nullable=False)  # Tanggal manual dari form (format YYYY-MM-DD)
    created_at = Column(DateTime(timezone=True), server_default=func.now()) # Otomatis, tidak ditampilkan di tabel