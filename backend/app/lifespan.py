from contextlib import asynccontextmanager
from datetime import timedelta

from fastapi import FastAPI
from sqlalchemy import func, select

from .database import Base, SessionLocal, engine
from .models import Cinema, Hall, Movie, Seat, Showtime, User
from .security import hash_pw
from .time_utils import now_utc
from .utils import seat_label


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
