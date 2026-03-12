from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from redis import asyncio as aioredis
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
import os

from app.core.config import settings
from app.database import engine, SessionLocal
from app.models import models
from app.core.security import hash_password

# Import Routers
from app.api import auth, users, dashboard, data, jobs, profiles

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    try:
        redis = aioredis.from_url(settings.REDIS_URL, encoding="utf8", decode_responses=True)
        FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache")
        print(f">>> Redis cache initialized at {settings.REDIS_URL}")
    except Exception as e:
        print(f"!!! Failed to initialize Redis cache: {str(e)}")

# Registration helper
def seed_initial_data():
    db = SessionLocal()
    try:
        admin = db.query(models.User).filter(models.User.email == "admin@growqr.ai").first()
        if not admin:
            admin_user = models.User(
                first_name="Admin",
                email="admin@growqr.ai",
                password_hash=hash_password("Admin@123"),
                user_type="admin",
                status="active"
            )
            db.add(admin_user)
            db.commit()
            print(">>> Seeded initial admin user: admin@growqr.ai / Admin@123")
    finally:
        db.close()

seed_initial_data()

# Include Routers
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(users.router)
app.include_router(data.router)
app.include_router(jobs.router)
app.include_router(profiles.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to GrowQR Admin API (Modular)"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
