from pydantic import BaseModel
# Request models
class RegisterRequest(BaseModel):
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class OTPRequest(BaseModel):
    pass
# main.py
# FastAPI app for user registration, login, and OTP verification

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from sqlalchemy.orm import Session
from src.backend.app.db.session import SessionLocal
from src.backend.app.models.user import User, Base
from sqlalchemy import select
import uvicorn
import random
import string
from passlib.hash import bcrypt
import os


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Email config (update with your SMTP details)
conf = ConnectionConfig(
    MAIL_USERNAME = os.getenv("MAIL_USERNAME", "altaakar@gmail.com"),
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "altaakar@15"),
    MAIL_FROM = os.getenv("MAIL_FROM", "altaakar@gmail.com"),
    MAIL_PORT = int(os.getenv("MAIL_PORT", 587)),
    MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com"),
    MAIL_STARTTLS = True,
    MAIL_SSL_TLS = False,
    USE_CREDENTIALS = True,
    VALIDATE_CERTS = True
)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.on_event("startup")
def startup():
    # Create tables
    from src.backend.app.db.session import engine
    Base.metadata.create_all(bind=engine)

def generate_otp(length=6):
    return ''.join(random.choices(string.digits, k=length))

@app.post("/register")
async def register(data: RegisterRequest, db: Session = Depends(get_db)):
    email = data.email
    password = data.password
    user = db.query(User).filter(User.email == email).first()
    if user:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = bcrypt.hash(password)
    new_user = User(email=email, password_hash=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"msg": "User registered successfully."}

@app.post("/verify-otp")
def verify_otp(data: OTPRequest, db: Session = Depends(get_db)):
    raise HTTPException(status_code=400, detail="OTP verification is no longer supported.")

@app.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    email = data.email
    password = data.password
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not bcrypt.verify(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect password")
    return {"msg": "Login successful"}
