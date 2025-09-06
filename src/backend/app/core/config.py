import os
from pydantic import BaseModel
from typing import Optional
try:
    from dotenv import load_dotenv; load_dotenv()
except Exception:
    pass

class Settings(BaseModel):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    ENV: str = os.getenv("ENV", "dev")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-change-me")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    JWT_ALGORITHM: str = "HS256"

settings = Settings()
