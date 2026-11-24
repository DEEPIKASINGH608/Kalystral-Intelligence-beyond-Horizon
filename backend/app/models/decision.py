from __future__ import annotations

from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Float, Integer, String, Text

from app.db.session import Base


class CharterDecision(Base):
    __tablename__ = "charter_decisions"

    id = Column(Integer, primary_key=True, index=True)
    user_uid = Column(String(128), index=True, nullable=False)
    route_code = Column(String(32), index=True, nullable=False)
    destination_port_code = Column(String(16), nullable=False)
    recommended_vessel_class = Column(String(64), nullable=False)
    horizon_days = Column(Integer, nullable=False, default=30)
    parcel_mt = Column(Float, nullable=False, default=80000.0)

    projected_p50_rate_usd_mt = Column(Float, nullable=True)
    projected_p90_rate_usd_mt = Column(Float, nullable=True)
    effective_landed_rate_usd_mt = Column(Float, nullable=True)
    estimated_total_cost_usd = Column(Float, nullable=True)
    corridor_risk_score = Column(Float, nullable=True)
    fit_score = Column(Float, nullable=True)

    action_taken = Column(String(32), nullable=False, default="FIX_CHARTER")
    status = Column(String(24), nullable=False, default="OPEN")
    rationale_notes = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )