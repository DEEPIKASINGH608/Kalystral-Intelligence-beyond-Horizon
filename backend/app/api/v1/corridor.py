from typing import Any, Dict, Generator
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.security import verify_firebase_token
from app.db.session import SessionLocal
from app.models.maritime import CorridorRouteDemo, DischargePort, VesselProfile
from app.schemas.corridor import CorridorOverviewResponse

router = APIRouter(prefix="/corridor", tags=["ECI Maritime Corridor (Demo)"])


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/overview", response_model=CorridorOverviewResponse)
def get_corridor_overview(
    current_user: Dict[str, Any] = Depends(verify_firebase_token),
    db: Session = Depends(get_db),
) -> CorridorOverviewResponse:
    ports = db.query(DischargePort).order_by(DischargePort.name.asc()).all()
    vessels = db.query(VesselProfile).order_by(VesselProfile.dwt_mt.desc()).all()
    routes = db.query(CorridorRouteDemo).order_by(CorridorRouteDemo.route_code.asc()).all()

    return CorridorOverviewResponse(
        data_disclaimer="SYNTHETIC DEMO DATASET — Illustrative East Coast India bulk freight parameters only; not live AIS or fixture feeds.",
        operator_email=current_user.get("email"),
        ports=ports,
        vessels=vessels,
        routes=routes,
    )