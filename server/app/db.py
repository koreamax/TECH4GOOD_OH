import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DB_PATH = Path(__file__).resolve().parent.parent / "pawpatrol.db"

# 기본은 로컬 SQLite. Supabase PostgreSQL 을 쓰려면 .env 의 DATABASE_URL 설정
# (Supabase 대시보드 → Connect → URI, 예: postgresql://postgres:...@...supabase.com:5432/postgres)
DB_URL = os.getenv("DATABASE_URL", "").strip() or f"sqlite:///{DB_PATH}"
if DB_URL.startswith("postgres://"):
    DB_URL = DB_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    DB_URL,
    connect_args={"check_same_thread": False} if DB_URL.startswith("sqlite") else {},
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
