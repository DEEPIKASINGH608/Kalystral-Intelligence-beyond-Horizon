from datetime import datetime, timezone
from fastapi import APIRouter
from pydantic import BaseModel
from app.core.config import settings
from app.db.session import check_database_connection

router = APIRouter(tags=["System Health"])


class HealthResponse(BaseModel):
    status: str
    service: str
    tagline: str
    version: str
    environment: str
    data_mode: str
    database: str
    timestamp_utc: str


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    db_status = check_database_connection()
    return HealthResponse(
        status="operational",
        service=settings.APP_NAME,
        tagline="Intelligence Beyond the Horizon.",
        version=settings.APP_VERSION,
        environment=settings.APP_ENV,
        data_mode="SYNTHETIC_DEMO_DATA",
        database=db_status,
        timestamp_utc=datetime.now(timezone.utc).isoformat(),
    )