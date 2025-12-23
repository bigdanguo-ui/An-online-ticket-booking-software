from __future__ import annotations
from sqlalchemy import Column, Integer, String, Text, Enum
from .database import Base
from datetime import datetime
from typing import List

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


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
    category = Column(String(50), nullable=True)
    duration_min: Mapped[int] = mapped_column(Integer, default=120)
    rating: Mapped[str] = mapped_column(String(20), default="PG-13")
    poster_url: Mapped[str] = mapped_column(String(500), default="")
    status: Mapped[str] = mapped_column(String(20), default="ON")  # ON/OFF

    #showtimes: Mapped[List["Showtime"]] = relationship(back_populates="movie")


class EventCategory(Base):
    __tablename__ = "event_categories"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    kind: Mapped[str] = mapped_column(String(20), index=True)  # concert/expo
    name: Mapped[str] = mapped_column(String(200), index=True)
    description: Mapped[str] = mapped_column(String(2000), default="")
    status: Mapped[str] = mapped_column(String(20), default="ON")  # ON/OFF

    __table_args__ = (UniqueConstraint("kind", "name", name="uq_event_category_kind_name"),)


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
    target_id: Mapped[int] = mapped_column(Integer, index=True)
    event_kind: Mapped[str] = mapped_column(String(20), index=True)
    hall_id: Mapped[int] = mapped_column(ForeignKey("halls.id"), index=True)
    start_time: Mapped[datetime] = mapped_column(DateTime, index=True)  # naive UTC
    price_cents: Mapped[int] = mapped_column(Integer, default=4500)

    #movie: Mapped[Movie] = relationship(back_populates="showtimes")
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

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    # 核心字段：区分类型
    kind = Column(String(20), index=True)  # 'movie', 'concert', 'exhibition'

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=True)
    poster_url = Column(String(512), nullable=True)
    status = Column(String(20), default="ON")  # ON, OFF

    # --- 类型特有字段 (可以设为 nullable) ---
    # 电影特有
    duration_min = Column(Integer, nullable=True)
    rating = Column(String(20), nullable=True) # PG-13 等

    # 演唱会/漫展特有
    venue = Column(String(255), nullable=True) # 场馆
    price_info = Column(String(255), nullable=True) # 价格说明