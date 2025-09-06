# src/backend/app/db/session.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# create engine once
engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)

# classic session factory
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

# FastAPI dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
