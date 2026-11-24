from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import verify_firebase_token
from app.ml.forecast_service import (
    compute_corridor_risk_scores,
    forecast_corridor_rates,
)
from app.ml.synthetic_history import DEFAULT_CORRIDORS, CorridorSeriesConfig

router = APIRouter(prefix="/forecast", tags=["forecast"])


def _load_corridor_configs(db: Session) -> List[CorridorSeriesConfig]:
    configs: List[CorridorSeriesConfig] = []
    try:
        from app.models import Port, Route, Vessel  # type: ignore

        routes = db.query(Route).all()
        if routes:
            ports_by_code = {p.code: p for p in db.query(Port).all()}
            vessels_by_id = {v.id: v for v in db.query(Vessel).all()}
            for r in routes:
                dest_port = ports_by_code.get(getattr(r, "destination_port_code", ""))
                vessel = vessels_by_id.get(getattr(r, "recommended_vessel_id", None))
                fallback = DEFAULT_CORRIDORS.get(r.route_code)
                configs.append(
                    CorridorSeriesConfig(
                        route_code=r.route_code,
                        origin_port=getattr(r, "origin_port", fallback.origin_port if fallback else "Origin"),
                        origin_country=getattr(
                            r, "origin_country", fallback.origin_country if fallback else "Overseas"
                        ),
                        destination_port_code=getattr(
                            r,
                            "destination_port_code",
                            fallback.destination_port_code if fallback else "INVTZ",
                        ),
                        commodity=getattr(r, "commodity", fallback.commodity if fallback else "Bulk Cargo"),
                        vessel_segment=getattr(
                            vessel,
                            "vessel_class",
                            getattr(
                                r,
                                "recommended_vessel_segment",
                                fallback.vessel_segment if fallback else "Panamax",
                            ),
                        ),
                        distance_nm=float(getattr(r, "distance_nm", fallback.distance_nm if fallback else 3000.0)),
                        typical_parcel_mt=float(
                            getattr(
                                r,
                                "typical_parcel_mt",
                                fallback.typical_parcel_mt if fallback else 65000.0,
                            )
                        ),
                        current_rate=float(
                            getattr(
                                r,
                                "current_demo_rate_usd_mt",
                                fallback.current_rate if fallback else 15.0,
                            )
                        ),
                        delta_7d_pct=float(
                            getattr(r, "rate_7d_delta_pct", fallback.delta_7d_pct if fallback else 0.0)
                        ),
                        congestion_index=float(
                            getattr(
                                dest_port,
                                "berth_congestion_index",
                                fallback.congestion_index if fallback else 0.48,
                            )
                        ),
                        avg_waiting_days=float(
                            getattr(
                                dest_port,
                                "avg_waiting_days",
                                fallback.avg_waiting_days if fallback else 3.0,
                            )
                        ),
                        weather_risk_level=str(
                            getattr(
                                dest_port,
                                "weather_risk_level",
                                fallback.weather_risk_level if fallback else "MODERATE",
                            )
                        ),
                    )
                )
    except Exception:
        pass

    return configs if configs else list(DEFAULT_CORRIDORS.values())


@router.get("/rates")
def get_rate_forecast(
    route_code: str = Query("AUNCL-INDMR"),
    horizon_days: int = Query(30, ge=7, le=90),
    db: Session = Depends(get_db),
    _user: dict = Depends(verify_firebase_token),
):
    configs = {c.route_code: c for c in _load_corridor_configs(db)}
    cfg = configs.get(route_code.upper())
    if not cfg:
        raise HTTPException(status_code=404, detail=f"Unknown route_code: {route_code}")
    return forecast_corridor_rates(cfg, horizon_days=horizon_days)


@router.get("/risk")
def get_corridor_risk(
    horizon_days: int = Query(30, ge=7, le=90),
    db: Session = Depends(get_db),
    _user: dict = Depends(verify_firebase_token),
):
    configs = _load_corridor_configs(db)
    scores = compute_corridor_risk_scores(configs, horizon_days=horizon_days)
    return {
        "horizon_days": horizon_days,
        "is_synthetic": True,
        "corridors": scores,
    }