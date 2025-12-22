from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import db
from ..models import User
from ..schemas import LoginIn, RegisterIn, TokenOut, UserOut
from ..security import current_user, hash_pw, make_jwt, verify_pw

router = APIRouter()


@router.post("/auth/register", response_model=UserOut)
def register(body: RegisterIn, sess: Session = Depends(db)):
    if sess.scalar(select(User).where(User.email == body.email)):
        raise HTTPException(409, "邮箱已注册")
    u = User(email=body.email, name=body.name, hashed_password=hash_pw(body.password), is_admin=False)
    sess.add(u)
    sess.commit()
    sess.refresh(u)
    return UserOut(id=u.id, email=u.email, name=u.name, is_admin=u.is_admin)


@router.post("/auth/login", response_model=TokenOut)
def login(body: LoginIn, sess: Session = Depends(db)):
    u = sess.scalar(select(User).where(User.email == body.email))
    if not u or not verify_pw(body.password, u.hashed_password):
        raise HTTPException(401, "邮箱或密码错误")
    return TokenOut(access_token=make_jwt(u))


@router.get("/me", response_model=UserOut)
def me(u: User = Depends(current_user)):
    return UserOut(id=u.id, email=u.email, name=u.name, is_admin=u.is_admin)
