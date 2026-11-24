from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.security import verify_firebase_token
from app.db.session import get_db
from app.ml.vessel_port_fit import evaluate_vessel_port_fit

router = APIRouter(prefix="/optimize", tags=["optimize"])


@router.get("/vessel-port-fit")
def get_vessel_port_fit(
    route_code: str = Query("AUNCL-INDMR", min_length=3),
    horizon_days: int = Query(30, ge=7, le=90),
    parcel_mt: float | None = Query(None, gt=0),
    db: Session = Depends(get_db),
    _user: dict = Depends(verify_firebase_token),
):
    try:
        return evaluate_vessel_port_fit(
            db=db,
            route_code=route_code,
            horizon_days=horizon_days,
            parcel_mt=parcel_mt,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc