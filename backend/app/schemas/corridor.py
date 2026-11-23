from typing import List
from pydantic import BaseModel


class DischargePortOut(BaseModel):
    code: str
    name: str
    state: str
    max_draft_m: float
    max_loa_m: float
    berth_congestion_index: float
    avg_waiting_days: float
    weather_risk_level: str
    primary_commodities: str
    is_demo_data: bool

    class Config:
        from_attributes = True


class VesselProfileOut(BaseModel):
    vessel_code: str
    vessel_name: str
    segment: str
    dwt_mt: int
    laden_draft_m: float
    loa_m: float
    daily_hire_usd: float
    fuel_consumption_tpd: float
    is_demo_data: bool

    class Config:
        from_attributes = True


class CorridorRouteOut(BaseModel):
    route_code: str
    origin_port: str
    origin_country: str
    destination_port_code: str
    commodity: str
    distance_nm: int
    typical_parcel_mt: int
    current_demo_rate_usd_mt: float
    rate_7d_delta_pct: float
    recommended_vessel_segment: str
    is_demo_data: bool

    class Config:
        from_attributes = True


class CorridorOverviewResponse(BaseModel):
    data_disclaimer: str
    operator_email: str | None
    ports: List[DischargePortOut]
    vessels: List[VesselProfileOut]
    routes: List[CorridorRouteOut]