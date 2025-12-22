from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import db
from ..models import Cinema, Hall, Movie, Seat, Showtime, User
from ..schemas import AdminCinemaIn, AdminHallIn, AdminMovieIn, AdminShowtimeIn, MovieOut
from ..security import admin_user
from ..time_utils import parse_iso_to_utc_naive
from ..utils import seat_label

router = APIRouter()


@router.post("/admin/movies", response_model=MovieOut)
def admin_create_movie(body: AdminMovieIn, sess: Session = Depends(db), _: User = Depends(admin_user)):
    m = Movie(**body.model_dump())
    sess.add(m)
    sess.commit()
    sess.refresh(m)
    return MovieOut(**m.__dict__)


@router.post("/admin/cinemas")
def admin_create_cinema(body: AdminCinemaIn, sess: Session = Depends(db), _: User = Depends(admin_user)):
    c = Cinema(**body.model_dump())
    sess.add(c)
    sess.commit()
    return {"id": c.id}


@router.post("/admin/halls")
def admin_create_hall(body: AdminHallIn, sess: Session = Depends(db), _: User = Depends(admin_user)):
    hall = Hall(**body.model_dump())
    sess.add(hall)
    sess.flush()
    for r in range(hall.rows):
        for c in range(hall.cols):
            sess.add(Seat(hall_id=hall.id, row=r, col=c, label=seat_label(r, c)))
    sess.commit()
    return {"id": hall.id}


@router.post("/admin/showtimes")
def admin_create_showtime(body: AdminShowtimeIn, sess: Session = Depends(db), _: User = Depends(admin_user)):
    # 允许前端传 Z 或 +09:00 等，统一落库为 naive UTC
    start = parse_iso_to_utc_naive(body.start_time)
    st = Showtime(movie_id=body.movie_id, hall_id=body.hall_id, start_time=start, price_cents=body.price_cents)
    sess.add(st)
    sess.commit()
    return {"id": st.id}
