from __future__ import annotations

import os
import time
import uuid
from datetime import datetime, timedelta, timezone
from contextlib import asynccontextmanager
from typing import List, Dict

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from pydantic import BaseModel, Field
#2023191127
from sqlalchemy import (
    create_engine,
    String,
    Integer,
    DateTime,
    Boolean,
    ForeignKey,
    UniqueConstraint,
    select,
    func,
    delete,
    and_,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, Session, sessionmaker
from sqlalchemy.exc import IntegrityError

# =========================
# Config
# =========================
DB_URL = os.getenv("DB_URL", "sqlite:///./app.db")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALG = "HS256"
HOLD_MINUTES = int(os.getenv("HOLD_MINUTES", "15"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

engine = create_engine(DB_URL, connect_args={"check_same_thread": False} if DB_URL.startswith("sqlite") else {})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


# =========================
# Time helpers (关键：全部统一 naive UTC)
# =========================
def now_utc() -> datetime:
    """返回 naive UTC 时间（tzinfo=None），避免 naive/aware 比较崩溃。"""
    return datetime.utcnow()


def to_utc_naive(dt: datetime) -> datetime:
    """把 datetime 规范化为 naive UTC。"""
    if dt.tzinfo is None:
        return dt  # 约定：naive 就是 UTC
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


def parse_iso_to_utc_naive(s: str) -> datetime:
    """解析 ISO 时间字符串 -> naive UTC。
    支持 'Z' 结尾或带 '+09:00' 等 offset。
    """
    ss = s.strip()
    if ss.endswith("Z"):
        ss = ss[:-1] + "+00:00"
    dt = datetime.fromisoformat(ss)
    return to_utc_naive(dt)


def iso_utc_z(dt: datetime) -> str:
    """把 naive UTC 输出成带 Z 的 ISO（前端最友好）。"""
    dt2 = to_utc_naive(dt).replace(tzinfo=timezone.utc)
    return dt2.isoformat().replace("+00:00", "Z")


# =========================
# Models
# =========================
class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(80), default="用户")
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)

    orders: Mapped[List["Order"]] = relationship(back_populates="user")


class Movie(Base):
    __tablename__ = "movies"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(200), index=True)
    description: Mapped[str] = mapped_column(String(2000), default="")
    duration_min: Mapped[int] = mapped_column(Integer, default=120)
    rating: Mapped[str] = mapped_column(String(20), default="PG-13")
    poster_url: Mapped[str] = mapped_column(String(500), default="")
    status: Mapped[str] = mapped_column(String(20), default="ON")  # ON/OFF

    showtimes: Mapped[List["Showtime"]] = relationship(back_populates="movie")


class Cinema(Base):
    __tablename__ = "cinemas"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    address: Mapped[str] = mapped_column(String(500), default="")
    city: Mapped[str] = mapped_column(String(100), default="")

    halls: Mapped[List["Hall"]] = relationship(back_populates="cinema")


class Hall(Base):
    __tablename__ = "halls"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cinema_id: Mapped[int] = mapped_column(ForeignKey("cinemas.id"))
    name: Mapped[str] = mapped_column(String(100), default="1号厅")
    rows: Mapped[int] = mapped_column(Integer, default=8)
    cols: Mapped[int] = mapped_column(Integer, default=12)

    cinema: Mapped[Cinema] = relationship(back_populates="halls")
    seats: Mapped[List["Seat"]] = relationship(back_populates="hall")
    showtimes: Mapped[List["Showtime"]] = relationship(back_populates="hall")


class Seat(Base):
    __tablename__ = "seats"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    hall_id: Mapped[int] = mapped_column(ForeignKey("halls.id"), index=True)
    row: Mapped[int] = mapped_column(Integer)
    col: Mapped[int] = mapped_column(Integer)
    label: Mapped[str] = mapped_column(String(20), index=True)

    hall: Mapped[Hall] = relationship(back_populates="seats")

    __table_args__ = (UniqueConstraint("hall_id", "row", "col", name="uq_seat_pos"),)


class Showtime(Base):
    __tablename__ = "showtimes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    movie_id: Mapped[int] = mapped_column(ForeignKey("movies.id"), index=True)
    hall_id: Mapped[int] = mapped_column(ForeignKey("halls.id"), index=True)
    start_time: Mapped[datetime] = mapped_column(DateTime, index=True)  # naive UTC
    price_cents: Mapped[int] = mapped_column(Integer, default=4500)

    movie: Mapped[Movie] = relationship(back_populates="showtimes")
    hall: Mapped[Hall] = relationship(back_populates="showtimes")


class HoldGroup(Base):
    __tablename__ = "hold_groups"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)  # token
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    showtime_id: Mapped[int] = mapped_column(ForeignKey("showtimes.id"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, index=True)  # naive UTC
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)  # naive UTC


class SeatHold(Base):
    __tablename__ = "seat_holds"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    hold_group_id: Mapped[str] = mapped_column(ForeignKey("hold_groups.id"), index=True)
    showtime_id: Mapped[int] = mapped_column(ForeignKey("showtimes.id"), index=True)
    seat_id: Mapped[int] = mapped_column(ForeignKey("seats.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, index=True)  # naive UTC

    __table_args__ = (UniqueConstraint("showtime_id", "seat_id", name="uq_hold_seat_once"),)


class Order(Base):
    __tablename__ = "orders"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)  # UUID
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    showtime_id: Mapped[int] = mapped_column(ForeignKey("showtimes.id"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="CREATED")  # CREATED/PAID/CANCELED
    total_cents: Mapped[int] = mapped_column(Integer, default=0)
    ticket_code: Mapped[str] = mapped_column(String(64), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)  # naive UTC

    user: Mapped[User] = relationship(back_populates="orders")
    seats: Mapped[List["OrderSeat"]] = relationship(back_populates="order", cascade="all, delete-orphan")


class OrderSeat(Base):
    __tablename__ = "order_seats"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[str] = mapped_column(ForeignKey("orders.id"), index=True)
    showtime_id: Mapped[int] = mapped_column(ForeignKey("showtimes.id"), index=True)
    seat_id: Mapped[int] = mapped_column(ForeignKey("seats.id"), index=True)

    order: Mapped[Order] = relationship(back_populates="seats")

    __table_args__ = (UniqueConstraint("showtime_id", "seat_id", name="uq_sold_seat_once"),)


# =========================
# Schemas
# =========================
class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    email: str
    name: str
    is_admin: bool


class RegisterIn(BaseModel):
    email: str
    name: str = "用户"
    password: str = Field(min_length=6)


class LoginIn(BaseModel):
    email: str
    password: str


class MovieOut(BaseModel):
    id: int
    title: str
    description: str
    duration_min: int
    rating: str
    poster_url: str
    status: str


class ShowtimeOut(BaseModel):
    id: int
    movie_id: int
    hall_id: int
    start_time: str
    price_cents: int
    hall_name: str
    cinema_name: str


class SeatState(BaseModel):
    seat_id: int
    label: str
    row: int
    col: int
    state: str  # AVAILABLE/HELD/HELD_BY_ME/SOLD


class HoldIn(BaseModel):
    seat_ids: List[int]


class HoldOut(BaseModel):
    hold_token: str
    expires_at: str
    seat_ids: List[int]


class CheckoutIn(BaseModel):
    hold_token: str


class OrderOut(BaseModel):
    id: str
    status: str
    total_cents: int
    created_at: str
    movie_title: str
    start_time: str
    hall_name: str
    cinema_name: str
    seats: List[str]
    ticket_code: str = ""


class AdminMovieIn(BaseModel):
    title: str
    description: str = ""
    duration_min: int = 120
    rating: str = "PG-13"
    poster_url: str = ""
    status: str = "ON"


class AdminCinemaIn(BaseModel):
    name: str
    address: str = ""
    city: str = ""


class AdminHallIn(BaseModel):
    cinema_id: int
    name: str = "1号厅"
    rows: int = 8
    cols: int = 12


class AdminShowtimeIn(BaseModel):
    movie_id: int
    hall_id: int
    start_time: str  # ISO string
    price_cents: int = 4500


# =========================
# DB deps
# =========================
def db() -> Session:
    s = SessionLocal()
    try:
        yield s
    finally:
        s.close()


# =========================
# Auth helpers
# =========================
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


def seat_label(r: int, c: int) -> str:
    return f"{chr(ord('A') + r)}{c + 1}"


def cleanup_expired_holds(sess: Session, showtime_id: int | None = None):
    q = delete(SeatHold).where(SeatHold.expires_at < now_utc())
    if showtime_id is not None:
        q = q.where(SeatHold.showtime_id == showtime_id)
    sess.execute(q)

    qg = delete(HoldGroup).where(HoldGroup.expires_at < now_utc())
    if showtime_id is not None:
        qg = qg.where(HoldGroup.showtime_id == showtime_id)
    sess.execute(qg)


# =========================
# Lifespan (startup seed)
# =========================
@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)

    with SessionLocal() as sess:
        if not sess.scalar(select(func.count(User.id))):
            admin = User(email="admin@example.com", name="管理员", hashed_password=hash_pw("admin123"), is_admin=True)
            u = User(email="user@example.com", name="小明", hashed_password=hash_pw("user1234"), is_admin=False)
            sess.add_all([admin, u])

        if not sess.scalar(select(func.count(Cinema.id))):
            c1 = Cinema(name="OpenAI 影城（新宿）", address="东京新宿xx路", city="Tokyo")
            sess.add(c1)
            sess.flush()

            h1 = Hall(cinema_id=c1.id, name="IMAX 1号厅", rows=8, cols=12)
            h2 = Hall(cinema_id=c1.id, name="杜比 2号厅", rows=10, cols=14)
            sess.add_all([h1, h2])
            sess.flush()

            for hall in [h1, h2]:
                for r in range(hall.rows):
                    for c in range(hall.cols):
                        sess.add(Seat(hall_id=hall.id, row=r, col=c, label=seat_label(r, c)))

        if not sess.scalar(select(func.count(Movie.id))):
            m1 = Movie(
                title="星际摆烂：重启",
                description="一部关于在宇宙里摸鱼的史诗。",
                duration_min=128,
                rating="PG-13",
                poster_url="https://picsum.photos/seed/movie1/400/600",
                status="ON",
            )
            m2 = Movie(
                title="代码与月光",
                description="Debug 到凌晨，月光照进终端。",
                duration_min=108,
                rating="PG",
                poster_url="https://picsum.photos/seed/movie2/400/600",
                status="ON",
            )
            sess.add_all([m1, m2])
            sess.flush()

            halls = sess.scalars(select(Hall)).all()
            base = now_utc().replace(minute=0, second=0, microsecond=0)

            for d in range(3):
                for hour in [10, 13, 16, 19, 21]:
                    sess.add(
                        Showtime(
                            movie_id=m1.id,
                            hall_id=halls[0].id,
                            start_time=base + timedelta(days=d, hours=hour),
                            price_cents=4800,
                        )
                    )
                    sess.add(
                        Showtime(
                            movie_id=m2.id,
                            hall_id=halls[1].id,
                            start_time=base + timedelta(days=d, hours=hour),
                            price_cents=4200,
                        )
                    )

        sess.commit()

    yield


# =========================
# App init
# =========================
app = FastAPI(title="Movie Ticketing API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================
# Auth
# =========================
@app.post("/auth/register", response_model=UserOut)
def register(body: RegisterIn, sess: Session = Depends(db)):
    if sess.scalar(select(User).where(User.email == body.email)):
        raise HTTPException(409, "邮箱已注册")
    u = User(email=body.email, name=body.name, hashed_password=hash_pw(body.password), is_admin=False)
    sess.add(u)
    sess.commit()
    sess.refresh(u)
    return UserOut(id=u.id, email=u.email, name=u.name, is_admin=u.is_admin)


@app.post("/auth/login", response_model=TokenOut)
def login(body: LoginIn, sess: Session = Depends(db)):
    u = sess.scalar(select(User).where(User.email == body.email))
    if not u or not verify_pw(body.password, u.hashed_password):
        raise HTTPException(401, "邮箱或密码错误")
    return TokenOut(access_token=make_jwt(u))


@app.get("/me", response_model=UserOut)
def me(u: User = Depends(current_user)):
    return UserOut(id=u.id, email=u.email, name=u.name, is_admin=u.is_admin)


# =========================
# Movies & showtimes
# =========================
@app.get("/movies", response_model=List[MovieOut])
def list_movies(q: str = "", sess: Session = Depends(db)):
    stmt = select(Movie).where(Movie.status == "ON")
    if q.strip():
        stmt = stmt.where(Movie.title.contains(q.strip()))
    items = sess.scalars(stmt.order_by(Movie.id.desc())).all()
    return [MovieOut(**m.__dict__) for m in items]


@app.get("/movies/{movie_id}", response_model=MovieOut)
def get_movie(movie_id: int, sess: Session = Depends(db)):
    m = sess.get(Movie, movie_id)
    if not m or m.status != "ON":
        raise HTTPException(404, "电影不存在")
    return MovieOut(**m.__dict__)


@app.get("/movies/{movie_id}/showtimes", response_model=List[ShowtimeOut])
def movie_showtimes(movie_id: int, sess: Session = Depends(db)):
    stmt = (
        select(Showtime, Hall, Cinema)
        .join(Hall, Showtime.hall_id == Hall.id)
        .join(Cinema, Hall.cinema_id == Cinema.id)
        .where(Showtime.movie_id == movie_id)
        .order_by(Showtime.start_time.asc())
    )
    rows = sess.execute(stmt).all()
    out = []
    for st, hall, cinema in rows:
        out.append(
            ShowtimeOut(
                id=st.id,
                movie_id=st.movie_id,
                hall_id=st.hall_id,
                start_time=iso_utc_z(st.start_time),
                price_cents=st.price_cents,
                hall_name=hall.name,
                cinema_name=cinema.name,
            )
        )
    return out


# =========================
# Seats
# =========================
@app.get("/showtimes/{showtime_id}/seats", response_model=List[SeatState])
def showtime_seats(showtime_id: int, sess: Session = Depends(db)):
    show = sess.get(Showtime, showtime_id)
    if not show:
        raise HTTPException(404, "场次不存在")

    cleanup_expired_holds(sess, showtime_id=showtime_id)
    sess.commit()

    hall = sess.get(Hall, show.hall_id)
    seats = sess.scalars(select(Seat).where(Seat.hall_id == hall.id)).all()

    sold = set(
        sess.scalars(
            select(OrderSeat.seat_id)
            .join(Order, OrderSeat.order_id == Order.id)
            .where(and_(OrderSeat.showtime_id == showtime_id, Order.status == "PAID"))
        ).all()
    )

    holds = sess.execute(
        select(SeatHold.seat_id, SeatHold.user_id).where(
            and_(SeatHold.showtime_id == showtime_id, SeatHold.expires_at >= now_utc())
        )
    ).all()
    hold_map: Dict[int, int] = {sid: uid for sid, uid in holds}

    out = []
    for s in seats:
        if s.id in sold:
            state = "SOLD"
        elif s.id in hold_map:
            state = "HELD"
        else:
            state = "AVAILABLE"
        out.append(SeatState(seat_id=s.id, label=s.label, row=s.row, col=s.col, state=state))
    return out


@app.get("/showtimes/{showtime_id}/seats/me", response_model=List[SeatState])
def showtime_seats_me(showtime_id: int, sess: Session = Depends(db), u: User = Depends(current_user)):
    show = sess.get(Showtime, showtime_id)
    if not show:
        raise HTTPException(404, "场次不存在")

    cleanup_expired_holds(sess, showtime_id=showtime_id)
    sess.commit()

    hall = sess.get(Hall, show.hall_id)
    seats = sess.scalars(select(Seat).where(Seat.hall_id == hall.id)).all()

    sold = set(
        sess.scalars(
            select(OrderSeat.seat_id)
            .join(Order, OrderSeat.order_id == Order.id)
            .where(and_(OrderSeat.showtime_id == showtime_id, Order.status == "PAID"))
        ).all()
    )

    holds = sess.execute(
        select(SeatHold.seat_id, SeatHold.user_id).where(
            and_(SeatHold.showtime_id == showtime_id, SeatHold.expires_at >= now_utc())
        )
    ).all()
    hold_map: Dict[int, int] = {sid: uid for sid, uid in holds}

    out = []
    for s in seats:
        if s.id in sold:
            state = "SOLD"
        elif s.id in hold_map:
            state = "HELD_BY_ME" if hold_map[s.id] == u.id else "HELD"
        else:
            state = "AVAILABLE"
        out.append(SeatState(seat_id=s.id, label=s.label, row=s.row, col=s.col, state=state))
    return out


# =========================
# Hold seats
# =========================
@app.post("/showtimes/{showtime_id}/hold", response_model=HoldOut)
def hold_seats(showtime_id: int, body: HoldIn, sess: Session = Depends(db), u: User = Depends(current_user)):
    show = sess.get(Showtime, showtime_id)
    if not show:
        raise HTTPException(404, "场次不存在")
    if not body.seat_ids:
        raise HTTPException(400, "请选择座位")

    cleanup_expired_holds(sess, showtime_id=showtime_id)
    sess.flush()

    hall = sess.get(Hall, show.hall_id)
    valid_seat_ids = set(sess.scalars(select(Seat.id).where(Seat.hall_id == hall.id)).all())
    for sid in body.seat_ids:
        if sid not in valid_seat_ids:
            raise HTTPException(400, f"非法座位: {sid}")

    sold = set(
        sess.scalars(
            select(OrderSeat.seat_id)
            .join(Order, OrderSeat.order_id == Order.id)
            .where(and_(OrderSeat.showtime_id == showtime_id, Order.status == "PAID"))
        ).all()
    )
    if any(sid in sold for sid in body.seat_ids):
        raise HTTPException(409, "包含已售座位，请刷新")

    hold_token = uuid.uuid4().hex
    expires_at = now_utc() + timedelta(minutes=HOLD_MINUTES)

    hg = HoldGroup(id=hold_token, user_id=u.id, showtime_id=showtime_id, expires_at=expires_at)
    sess.add(hg)
    sess.flush()

    try:
        for sid in body.seat_ids:
            sess.add(
                SeatHold(
                    hold_group_id=hold_token,
                    showtime_id=showtime_id,
                    seat_id=sid,
                    user_id=u.id,
                    expires_at=expires_at,
                )
            )
        sess.commit()
    except IntegrityError:
        sess.rollback()
        raise HTTPException(409, "座位已被他人锁定，请换座或刷新")

    return HoldOut(hold_token=hold_token, expires_at=iso_utc_z(expires_at), seat_ids=body.seat_ids)


@app.post("/holds/{hold_token}/release")
def release_hold(hold_token: str, sess: Session = Depends(db), u: User = Depends(current_user)):
    hg = sess.get(HoldGroup, hold_token)
    if not hg or hg.user_id != u.id:
        raise HTTPException(404, "锁座不存在")
    sess.execute(delete(SeatHold).where(SeatHold.hold_group_id == hold_token))
    sess.execute(delete(HoldGroup).where(HoldGroup.id == hold_token))
    sess.commit()
    return {"ok": True}


# =========================
# Checkout & Payment
# =========================
@app.post("/orders/checkout", response_model=OrderOut)
def checkout(body: CheckoutIn, sess: Session = Depends(db), u: User = Depends(current_user)):
    hg = sess.get(HoldGroup, body.hold_token)
    if not hg or hg.user_id != u.id:
        raise HTTPException(404, "锁座不存在")

    # 这里是你之前崩溃的点：hg.expires_at 与 now_utc() 必须同类（现在都 naive UTC）
    if hg.expires_at < now_utc():
        raise HTTPException(409, "锁座已过期，请重新选座")

    cleanup_expired_holds(sess, showtime_id=hg.showtime_id)
    sess.flush()

    holds = sess.scalars(select(SeatHold).where(SeatHold.hold_group_id == body.hold_token)).all()
    if not holds:
        raise HTTPException(409, "锁座已失效，请重新选座")

    show = sess.get(Showtime, hg.showtime_id)
    hall = sess.get(Hall, show.hall_id)
    cinema = sess.get(Cinema, hall.cinema_id)
    movie = sess.get(Movie, show.movie_id)

    seat_ids = [h.seat_id for h in holds]
    seats = sess.scalars(select(Seat).where(Seat.id.in_(seat_ids))).all()
    seat_labels = [s.label for s in sorted(seats, key=lambda x: (x.row, x.col))]

    order_id = uuid.uuid4().hex
    total = show.price_cents * len(seat_ids)

    order = Order(
        id=order_id,
        user_id=u.id,
        showtime_id=show.id,
        status="CREATED",
        total_cents=total,
        ticket_code="",
    )
    sess.add(order)
    sess.flush()

    try:
        for sid in seat_ids:
            sess.add(OrderSeat(order_id=order_id, showtime_id=show.id, seat_id=sid))

        sess.execute(delete(SeatHold).where(SeatHold.hold_group_id == body.hold_token))
        sess.execute(delete(HoldGroup).where(HoldGroup.id == body.hold_token))
        sess.commit()
    except IntegrityError:
        sess.rollback()
        raise HTTPException(409, "座位已被抢，请重新选座")

    return OrderOut(
        id=order.id,
        status=order.status,
        total_cents=order.total_cents,
        created_at=iso_utc_z(order.created_at),
        movie_title=movie.title,
        start_time=iso_utc_z(show.start_time),
        hall_name=hall.name,
        cinema_name=cinema.name,
        seats=seat_labels,
        ticket_code=order.ticket_code,
    )


@app.post("/orders/{order_id}/mock_pay", response_model=OrderOut)
def mock_pay(order_id: str, sess: Session = Depends(db), u: User = Depends(current_user)):
    order = sess.get(Order, order_id)
    if not order or order.user_id != u.id:
        raise HTTPException(404, "订单不存在")

    if order.status == "PAID":
        pass
    elif order.status != "CREATED":
        raise HTTPException(409, f"订单状态不可支付：{order.status}")

    order.status = "PAID"
    order.ticket_code = f"TKT-{uuid.uuid4().hex[:10].upper()}"
    sess.commit()

    show = sess.get(Showtime, order.showtime_id)
    hall = sess.get(Hall, show.hall_id)
    cinema = sess.get(Cinema, hall.cinema_id)
    movie = sess.get(Movie, show.movie_id)

    seat_ids = [x.seat_id for x in order.seats]
    seats = sess.scalars(select(Seat).where(Seat.id.in_(seat_ids))).all()
    seat_labels = [s.label for s in sorted(seats, key=lambda x: (x.row, x.col))]

    return OrderOut(
        id=order.id,
        status=order.status,
        total_cents=order.total_cents,
        created_at=iso_utc_z(order.created_at),
        movie_title=movie.title,
        start_time=iso_utc_z(show.start_time),
        hall_name=hall.name,
        cinema_name=cinema.name,
        seats=seat_labels,
        ticket_code=order.ticket_code,
    )


@app.post("/orders/{order_id}/cancel")
def cancel_order(order_id: str, sess: Session = Depends(db), u: User = Depends(current_user)):
    order = sess.get(Order, order_id)
    if not order or order.user_id != u.id:
        raise HTTPException(404, "订单不存在")
    if order.status == "PAID":
        raise HTTPException(409, "已支付订单请走退款流程（此MVP未实现自动退款）")
    if order.status != "CREATED":
        return {"ok": True}

    sess.execute(delete(OrderSeat).where(OrderSeat.order_id == order_id))
    order.status = "CANCELED"
    sess.commit()
    return {"ok": True}


@app.get("/orders", response_model=List[OrderOut])
def list_orders(sess: Session = Depends(db), u: User = Depends(current_user)):
    stmt = (
        select(Order, Showtime, Hall, Cinema, Movie)
        .join(Showtime, Order.showtime_id == Showtime.id)
        .join(Hall, Showtime.hall_id == Hall.id)
        .join(Cinema, Hall.cinema_id == Cinema.id)
        .join(Movie, Showtime.movie_id == Movie.id)
        .where(Order.user_id == u.id)
        .order_by(Order.created_at.desc())
    )
    rows = sess.execute(stmt).all()

    out = []
    for order, show, hall, cinema, movie in rows:
        seat_ids = sess.scalars(select(OrderSeat.seat_id).where(OrderSeat.order_id == order.id)).all()
        seats = sess.scalars(select(Seat).where(Seat.id.in_(seat_ids))).all()
        seat_labels = [s.label for s in sorted(seats, key=lambda x: (x.row, x.col))]

        out.append(
            OrderOut(
                id=order.id,
                status=order.status,
                total_cents=order.total_cents,
                created_at=iso_utc_z(order.created_at),
                movie_title=movie.title,
                start_time=iso_utc_z(show.start_time),
                hall_name=hall.name,
                cinema_name=cinema.name,
                seats=seat_labels,
                ticket_code=order.ticket_code,
            )
        )
    return out


# =========================
# Admin
# =========================
@app.post("/admin/movies", response_model=MovieOut)
def admin_create_movie(body: AdminMovieIn, sess: Session = Depends(db), _: User = Depends(admin_user)):
    m = Movie(**body.model_dump())
    sess.add(m)
    sess.commit()
    sess.refresh(m)
    return MovieOut(**m.__dict__)


@app.post("/admin/cinemas")
def admin_create_cinema(body: AdminCinemaIn, sess: Session = Depends(db), _: User = Depends(admin_user)):
    c = Cinema(**body.model_dump())
    sess.add(c)
    sess.commit()
    return {"id": c.id}


@app.post("/admin/halls")
def admin_create_hall(body: AdminHallIn, sess: Session = Depends(db), _: User = Depends(admin_user)):
    hall = Hall(**body.model_dump())
    sess.add(hall)
    sess.flush()
    for r in range(hall.rows):
        for c in range(hall.cols):
            sess.add(Seat(hall_id=hall.id, row=r, col=c, label=seat_label(r, c)))
    sess.commit()
    return {"id": hall.id}


@app.post("/admin/showtimes")
def admin_create_showtime(body: AdminShowtimeIn, sess: Session = Depends(db), _: User = Depends(admin_user)):
    # 允许前端传 Z 或 +09:00 等，统一落库为 naive UTC
    start = parse_iso_to_utc_naive(body.start_time)
    st = Showtime(movie_id=body.movie_id, hall_id=body.hall_id, start_time=start, price_cents=body.price_cents)
    sess.add(st)
    sess.commit()
    return {"id": st.id}
