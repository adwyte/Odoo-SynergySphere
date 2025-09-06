# src/backend/app/core/config.py
import os
from pydantic import BaseModel
from typing import Optional

# Optional: load .env if present (handy on Windows)
try:
    from dotenv import load_dotenv  # pip install python-dotenv (optional)
    load_dotenv()
except Exception:
    pass

class Settings(BaseModel):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    ENV: str = os.getenv("ENV", "dev")

# IMPORTANT: this is what Alembic imports
settings = Settings()

# Safety check to help debug if DATABASE_URL is missing
if not settings.DATABASE_URL:
    # Don't raise, but make it easy to see when imported directly
    print("[config] WARNING: DATABASE_URL is empty – set env var or create .env")
