from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles

from .lifespan import lifespan
from .routers import admin, auth, categories, events, holds, orders, seats, uploading

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"
UPLOAD_DIR = STATIC_DIR / "uploads"

ALLOWED_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]

ROUTERS = (
    auth.router,
    categories.router,
    seats.router,
    holds.router,
    orders.router,
    admin.router,
    events.router,
    uploading.router,
)


def create_app() -> FastAPI:
    app = FastAPI(title="Movie Ticketing API", version="0.1.0", lifespan=lifespan)

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    for router in ROUTERS:
        app.include_router(router)

    return app


app = create_app()
