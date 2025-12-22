from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import db
from ..models import Cinema, Hall, Movie, Showtime
from ..schemas import MovieOut, ShowtimeOut
from ..time_utils import iso_utc_z

router = APIRouter()


@router.get("/movies", response_model=List[MovieOut])
def list_movies(q: str = "", sess: Session = Depends(db)):
    stmt = select(Movie).where(Movie.status == "ON")
    if q.strip():
        stmt = stmt.where(Movie.title.contains(q.strip()))
    items = sess.scalars(stmt.order_by(Movie.id.desc())).all()
    return [MovieOut(**m.__dict__) for m in items]


@router.get("/movies/{movie_id}", response_model=MovieOut)
def get_movie(movie_id: int, sess: Session = Depends(db)):
    m = sess.get(Movie, movie_id)
    if not m or m.status != "ON":
        raise HTTPException(404, "电影不存在")
    return MovieOut(**m.__dict__)


@router.get("/movies/{movie_id}/showtimes", response_model=List[ShowtimeOut])
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
