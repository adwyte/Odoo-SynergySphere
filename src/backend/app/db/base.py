# src/backend/app/db/base.py
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    """Global SQLAlchemy declarative base."""
    pass
