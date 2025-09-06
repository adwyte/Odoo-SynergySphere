from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from app.db.session import get_db
from app.models.user import User
from app.core.security import hash_password, verify_password, create_access_token, decode_token

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

class SignupIn(BaseModel):
    email: EmailStr
    password: str
    name: str | None = None
    avatar_url: str | None = None

class UserOut(BaseModel):
    id: int
    email: EmailStr
    name: str | None = None
    avatar_url: str | None = None
    class Config: from_attributes = True

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> User:
    try:
        payload = decode_token(token)
        email = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.scalar(select(User).where(User.email == email))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User inactive or not found")
    return user

@router.post("/signup", response_model=UserOut)
def signup(data: SignupIn, db: Session = Depends(get_db)):
    if db.scalar(select(User).where(User.email == data.email)):
        raise HTTPException(status_code=400, detail="Email already registered")
    u = User(
        email=data.email,
        name=data.name,
        avatar_url=data.avatar_url,
        hashed_password=hash_password(data.password),
        is_active=True,
    )
    db.add(u); db.commit(); db.refresh(u)
    return u

@router.post("/login", response_model=TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # OAuth2 form fields: username, password
    user = db.scalar(select(User).where(User.email == form.username))
    if not user or not user.hashed_password or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    token = create_access_token(user.email)
    return TokenOut(access_token=token, user=user)  # includes user for convenience

@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
