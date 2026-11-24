from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.security import verify_firebase_token
from app.db.session import get_db
from app.ml.vessel_port_fit import evaluate_vessel_port_fit
from app.models.decision import CharterDecision

router = APIRouter(prefix="/decisions", tags=["decisions"])


class DecisionCreateRequest(BaseModel):
    route_code: str = Field(..., min_length=3, max_length=32)
    horizon_days: int = Field(30, ge=7, le=90)
    parcel_mt: float | None = Field(None, gt=0)
    recommended_vessel_class: str | None = Field(None, max_length=64)
    action_taken: str = Field("FIX_CHARTER", max_length=32)
    rationale_notes: str | None = Field(None, max_length=2000)


class DecisionUpdateRequest(BaseModel):
    status: str | None = Field(None, max_length=24)
    action_taken: str | None = Field(None, max_length=32)
    rationale_notes: str | None = Field(None, max_length=2000)


def _extract_uid(user: dict[str, Any]) -> str:
    return str(user.get("uid") or user.get("user_id") or user.get("sub") or "anonymous")


def _serialize(row: CharterDecision) -> dict[str, Any]:
    return {
        "id": row.id,
        "user_uid": row.user_uid,
        "route_code": row.route_code,
        "destination_port_code": row.destination_port_code,
        "recommended_vessel_class": row.recommended_vessel_class,
        "horizon_days": row.horizon_days,
        "parcel_mt": row.parcel_mt,
        "projected_p50_rate_usd_mt": row.projected_p50_rate_usd_mt,
        "projected_p90_rate_usd_mt": row.projected_p90_rate_usd_mt,
        "effective_landed_rate_usd_mt": row.effective_landed_rate_usd_mt,
        "estimated_total_cost_usd": row.estimated_total_cost_usd,
        "corridor_risk_score": row.corridor_risk_score,
        "fit_score": row.fit_score,
        "action_taken": row.action_taken,
        "status": row.status,
        "rationale_notes": row.rationale_notes,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


@router.get("")
def list_decisions(
    route_code: str | None = Query(None),
    status: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: dict = Depends(verify_firebase_token),
):
    uid = _extract_uid(user)
    q = db.query(CharterDecision).filter(CharterDecision.user_uid == uid)
    if route_code:
        q = q.filter(CharterDecision.route_code == route_code.upper().strip())
    if status:
        q = q.filter(CharterDecision.status == status.upper().strip())
    rows = q.order_by(CharterDecision.created_at.desc()).limit(limit).all()
    return {"items": [_serialize(r) for r in rows], "count": len(rows)}


@router.post("", status_code=201)
def create_decision(
    payload: DecisionCreateRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(verify_firebase_token),
):
    uid = _extract_uid(user)
    code = payload.route_code.upper().strip()

    try:
        fit = evaluate_vessel_port_fit(
            db=db,
            route_code=code,
            horizon_days=payload.horizon_days,
            parcel_mt=payload.parcel_mt,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    candidates = fit.get("candidates") or []
    chosen = None
    if payload.recommended_vessel_class:
        chosen = next(
            (
                c
                for c in candidates
                if str(c["vessel_class"]).lower() == payload.recommended_vessel_class.strip().lower()
            ),
            None,
        )
    if chosen is None and candidates:
        chosen = candidates[0]

    row = CharterDecision(
        user_uid=uid,
        route_code=code,
        destination_port_code=str(fit["destination_port_code"]),
        recommended_vessel_class=str(
            chosen["vessel_class"] if chosen else fit["baseline_vessel_segment"]
        ),
        horizon_days=payload.horizon_days,
        parcel_mt=float(
            chosen["carried_parcel_mt"] if chosen else fit["target_parcel_mt"]
        ),
        projected_p50_rate_usd_mt=chosen["projected_p50_rate_usd_mt"] if chosen else None,
        projected_p90_rate_usd_mt=chosen["projected_p90_rate_usd_mt"] if chosen else None,
        effective_landed_rate_usd_mt=chosen["effective_landed_rate_usd_mt"] if chosen else None,
        estimated_total_cost_usd=chosen["estimated_total_cost_usd"] if chosen else None,
        corridor_risk_score=fit.get("corridor_risk_score"),
        fit_score=chosen["fit_score"] if chosen else None,
        action_taken=payload.action_taken.upper().strip(),
        status="OPEN",
        rationale_notes=(payload.rationale_notes or "").strip() or None,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize(row)


@router.patch("/{decision_id}")
def update_decision(
    decision_id: int,
    payload: DecisionUpdateRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(verify_firebase_token),
):
    uid = _extract_uid(user)
    row = (
        db.query(CharterDecision)
        .filter(CharterDecision.id == decision_id, CharterDecision.user_uid == uid)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Decision not found")

    if payload.status:
        row.status = payload.status.upper().strip()
    if payload.action_taken:
        row.action_taken = payload.action_taken.upper().strip()
    if payload.rationale_notes is not None:
        row.rationale_notes = payload.rationale_notes.strip() or None
    row.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(row)
    return _serialize(row)


@router.delete("/{decision_id}")
def delete_decision(
    decision_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(verify_firebase_token),
):
    uid = _extract_uid(user)
    row = (
        db.query(CharterDecision)
        .filter(CharterDecision.id == decision_id, CharterDecision.user_uid == uid)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Decision not found")
    db.delete(row)
    db.commit()
    return {"deleted": True, "id": decision_id}