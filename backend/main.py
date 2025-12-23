from app.main import app
from app.routers import auth
app.include_router(auth.router, prefix="/auth", tags=["auth"])

__all__ = ["app"]
