import time

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from .config import JWT_ALG, JWT_SECRET
from .database import db
from .models import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def hash_pw(pw: str) -> str:
    return pwd_context.hash(pw)


def verify_pw(pw: str, hashed: str) -> bool:
    return pwd_context.verify(pw, hashed)


def make_jwt(user: User) -> str:
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "is_admin": user.is_admin,
        "iat": int(time.time()),
        "exp": int(time.time()) + 3600 * 24,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def get_user(sess: Session, token: str) -> User:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        uid = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="无效登录信息")
    u = sess.get(User, uid)
    if not u:
        raise HTTPException(status_code=401, detail="用户不存在")
    return u


def current_user(token: str = Depends(oauth2_scheme), sess: Session = Depends(db)) -> User:
    return get_user(sess, token)


def admin_user(u: User = Depends(current_user)) -> User:
    if not u.is_admin:
        raise HTTPException(status_code=403, detail="需要管理员权限")
    return u
