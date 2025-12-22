import os
from fastapi import FastAPI
from starlette.staticfiles import StaticFiles

from .routers import events, categories, uploading  # ...其他路由
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .lifespan import lifespan
from .routers import admin, auth, categories, holds, movies, orders, seats

app = FastAPI(title="Movie Ticketing API", version="0.1.0", lifespan=lifespan)

UPLOAD_DIR = "static/uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

# 2. 挂载静态文件服务
# 这样访问 /static/uploads/abc.jpg 就能看到图片
app.mount("/static", StaticFiles(directory="static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
#app.include_router(movies.router)
app.include_router(categories.router)
app.include_router(seats.router)
app.include_router(holds.router)
app.include_router(orders.router)
app.include_router(admin.router)
app.include_router(events.router)
app.include_router(uploading.router)
