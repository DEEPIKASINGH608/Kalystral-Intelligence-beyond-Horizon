from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text
from app.db.session import Base


class DischargePort(Base):
    __tablename__ = "discharge_ports"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(16), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    state = Column(String(64), nullable=False)
    max_draft_m = Column(Float, nullable=False)
    max_loa_m = Column(Float, nullable=False)
    berth_congestion_index = Column(Float, nullable=False)  # 0.0 - 1.0 synthetic index
    avg_waiting_days = Column(Float, nullable=False)
    weather_risk_level = Column(String(24), nullable=False)  # LOW, MODERATE, ELEVATED
    primary_commodities = Column(String(200), nullable=False)
    is_demo_data = Column(Boolean, default=True, nullable=False)


class VesselProfile(Base):
    __tablename__ = "vessel_profiles"

    id = Column(Integer, primary_key=True, index=True)
    vessel_code = Column(String(32), unique=True, nullable=False, index=True)
    vessel_name = Column(String(100), nullable=False)
    segment = Column(String(40), nullable=False)  # Capesize, Kamsarmax, Ultramax, Supramax
    dwt_mt = Column(Integer, nullable=False)
    laden_draft_m = Column(Float, nullable=False)
    loa_m = Column(Float, nullable=False)
    daily_hire_usd = Column(Float, nullable=False)
    fuel_consumption_tpd = Column(Float, nullable=False)
    is_demo_data = Column(Boolean, default=True, nullable=False)


class CorridorRouteDemo(Base):
    __tablename__ = "corridor_routes_demo"

    id = Column(Integer, primary_key=True, index=True)
    route_code = Column(String(32), unique=True, nullable=False, index=True)
    origin_port = Column(String(100), nullable=False)
    origin_country = Column(String(64), nullable=False)
    destination_port_code = Column(String(16), nullable=False)
    commodity = Column(String(64), nullable=False)
    distance_nm = Column(Integer, nullable=False)
    typical_parcel_mt = Column(Integer, nullable=False)
    current_demo_rate_usd_mt = Column(Float, nullable=False)
    rate_7d_delta_pct = Column(Float, nullable=False)
    recommended_vessel_segment = Column(String(40), nullable=False)
    is_demo_data = Column(Boolean, default=True, nullable=False)


class SavedDecision(Base):
    __tablename__ = "saved_decisions"

    id = Column(Integer, primary_key=True, index=True)
    user_uid = Column(String(128), nullable=False, index=True)
    user_email = Column(String(200), nullable=True)
    title = Column(String(160), nullable=False)
    route_code = Column(String(32), nullable=False)
    action_verdict = Column(String(24), nullable=False)  # CHARTER_NOW, WATCH, WAIT
    payload_json = Column(Text, nullable=False)
    is_demo_data = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)