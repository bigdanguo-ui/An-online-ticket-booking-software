from __future__ import annotations

from typing import List, Literal

from pydantic import BaseModel, Field


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


class EventCategoryOut(BaseModel):
    id: int
    kind: str
    name: str
    description: str
    status: str


class EventCategoryUpsertItem(BaseModel):
    id: int | None = None
    name: str = Field(min_length=1, max_length=200)
    description: str = ""
    status: str = "ON"


class EventCategoryUpsertIn(BaseModel):
    kind: Literal["concert", "expo"]
    items: List[EventCategoryUpsertItem]


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
