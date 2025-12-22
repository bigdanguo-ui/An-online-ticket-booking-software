import os

DB_URL = os.getenv("DB_URL", "sqlite:///./app.db")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALG = "HS256"
HOLD_MINUTES = int(os.getenv("HOLD_MINUTES", "15"))
