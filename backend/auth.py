from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import os

from database import get_db
from models import User

SECRET_KEY = "your-very-secure-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def _truncate_password_for_bcrypt(password: str) -> str:
    """
    bcrypt only accepts secrets up to 72 bytes.
    Passlib/bcrypt versions may or may not truncate automatically, so we do it explicitly.
    """
    if password is None:
        return password
    # bcrypt limits the secret length in bytes, not characters.
    b = password.encode("utf-8")
    if len(b) > 72:
        b = b[:72]
        return b.decode("utf-8", errors="ignore")
    return password

def verify_password(plain_password, hashed_password):
    plain_password = _truncate_password_for_bcrypt(plain_password)
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    password = _truncate_password_for_bcrypt(password)
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user
