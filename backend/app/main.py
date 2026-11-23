from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import Base, SessionLocal, engine
from app.models import maritime  # noqa: F401
from app.services.seed_demo import seed_demo_maritime_data
from app.api.v1.health import router as health_router
from app.api.v1.corridor import router as corridor_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            seed_demo_maritime_data(db)
        finally:
            db.close()
    except Exception:
        # Allow API startup even if DB is temporarily unreachable
        pass
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="AI-Powered Maritime Freight Intelligence for East Coast India Bulk Importers",
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix=settings.API_V1_PREFIX)
app.include_router(corridor_router, prefix=settings.API_V1_PREFIX)


@app.get("/")
def root():
    return {
        "platform": "KALYSTRAL",
        "tagline": "Intelligence Beyond the Horizon.",
        "team": "Rizzalytics",
        "event": "PRASUNEX INNOVATHON 2026",
        "docs": "/docs",
    }