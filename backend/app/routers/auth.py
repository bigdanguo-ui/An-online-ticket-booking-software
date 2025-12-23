from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import db
from ..models import User
from ..schemas import LoginIn, RegisterIn, TokenOut, UserOut, UserUpdate
from ..security import current_user, hash_pw, make_jwt, verify_pw, admin_user

router = APIRouter()

@router.post("/auth/register", response_model=UserOut)
def register(body: RegisterIn, sess: Session = Depends(db)):
    if sess.scalar(select(User).where(User.email == body.email)):
        raise HTTPException(409, "邮箱已注册")
    # 创建用户
    u = User(email=body.email, name=body.name, hashed_password=hash_pw(body.password), is_admin=False)
    sess.add(u)
    sess.commit()
    sess.refresh(u)
    # ✅ 修正 1：直接返回对象 u，让 Pydantic 自动处理字段映射
    return u

@router.post("/auth/login", response_model=TokenOut)
def login(body: LoginIn, sess: Session = Depends(db)):
    u = sess.scalar(select(User).where(User.email == body.email))
    if not u or not verify_pw(body.password, u.hashed_password):
        raise HTTPException(401, "邮箱或密码错误")
    if not u.is_active:
        raise HTTPException(403, "该账号已被禁用，请联系管理员")
    return TokenOut(access_token=make_jwt(u))

# ✅ 修正 2：GET 接口修复
@router.get("/me", response_model=UserOut)
def me(u: User = Depends(current_user)):
    # 🔥 关键修改：不要手动写 UserOut(...)
    # 直接返回 u，FastAPI 会自动把 u.phone 和 u.avatar_url 填进响应里
    return u

@router.put("/me", response_model=UserOut)
def update_user_me(
        body: UserUpdate,
        sess: Session = Depends(db),
        current_user: User = Depends(current_user)
):

    db_user = sess.get(User, current_user.id)

    if not db_user:
        raise HTTPException(404, "User not found")

    # 更新字段逻辑
    if body.name is not None:
        db_user.name = body.name

    if body.phone is not None:
        db_user.phone = body.phone

    if body.avatar_url is not None:
        db_user.avatar_url = body.avatar_url

    if body.password is not None:
        db_user.hashed_password = hash_pw(body.password)

    sess.add(db_user)
    sess.commit()
    sess.refresh(db_user)

    return db_user

# ==========================================
# 🔥 新增：用户管理接口 (仅管理员)
# ==========================================

# 1. 获取所有用户列表
@router.get("/admin/users", response_model=List[UserOut])
def list_users(sess: Session = Depends(db), _: User = Depends(admin_user)):
    # 按 ID 排序返回所有用户
    users = sess.scalars(select(User).order_by(User.id)).all()
    return users

# 2. 切换用户状态 (禁用/启用)
@router.put("/admin/users/{id}/status")
def toggle_user_status(id: int, active: bool, sess: Session = Depends(db), admin: User = Depends(admin_user)):
    user = sess.get(User, id)
    if not user:
        raise HTTPException(404, "用户不存在")

    # 防止管理员禁用自己
    if user.id == admin.id:
        raise HTTPException(400, "无法禁用管理员自己的账号")

    user.is_active = active
    sess.commit()
    return {"ok": True, "status": "active" if active else "disabled"}