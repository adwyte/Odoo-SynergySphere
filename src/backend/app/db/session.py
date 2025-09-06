# session.py
# SQLAlchemy session setup for PostgreSQL

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.backend.app.core.config import DATABASE_URL

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
