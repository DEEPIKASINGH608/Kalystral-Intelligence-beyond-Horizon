from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
import math
from typing import Any, Dict, List


@dataclass
class CorridorSeriesConfig:
    route_code: str
    origin_port: str
    origin_country: str
    destination_port_code: str
    commodity: str
    vessel_segment: str
    distance_nm: float
    typical_parcel_mt: float
    current_rate: float
    delta_7d_pct: float
    congestion_index: float = 0.45
    avg_waiting_days: float = 2.5
    weather_risk_level: str = "MODERATE"


DEFAULT_CORRIDORS: Dict[str, CorridorSeriesConfig] = {
    "AUNCL-INDMR": CorridorSeriesConfig(
        route_code="AUNCL-INDMR",
        origin_port="Newcastle",
        origin_country="Australia",
        destination_port_code="INDMR",
        commodity="Coking Coal",
        vessel_segment="Kamsarmax",
        distance_nm=5410.0,
        typical_parcel_mt=78000.0,
        current_rate=18.40,
        delta_7d_pct=-1.2,
        congestion_index=0.42,
        avg_waiting_days=2.4,
        weather_risk_level="MODERATE",
    ),
    "AUPHE-INKRI": CorridorSeriesConfig(
        route_code="AUPHE-INKRI",
        origin_port="Port Hedland",
        origin_country="Australia",
        destination_port_code="INKRI",
        commodity="Iron Ore / Limestone",
        vessel_segment="Capesize",
        distance_nm=3690.0,
        typical_parcel_mt=160000.0,
        current_rate=12.90,
        delta_7d_pct=0.8,
        congestion_index=0.51,
        avg_waiting_days=3.1,
        weather_risk_level="MODERATE",
    ),
    "IDSRI-INVTZ": CorridorSeriesConfig(
        route_code="IDSRI-INVTZ",
        origin_port="Samarinda",
        origin_country="Indonesia",
        destination_port_code="INVTZ",
        commodity="Steam Coal",
        vessel_segment="Ultramax",
        distance_nm=2380.0,
        typical_parcel_mt=60000.0,
        current_rate=10.65,
        delta_7d_pct=2.1,
        congestion_index=0.58,
        avg_waiting_days=3.6,
        weather_risk_level="HIGH",
    ),
    "ZARB-INPRT": CorridorSeriesConfig(
        route_code="ZARB-INPRT",
        origin_port="Richards Bay",
        origin_country="South Africa",
        destination_port_code="INPRT",
        commodity="Thermal Coal",
        vessel_segment="Capesize",
        distance_nm=4520.0,
        typical_parcel_mt=150000.0,
        current_rate=14.85,
        delta_7d_pct=3.4,
        congestion_index=0.64,
        avg_waiting_days=4.2,
        weather_risk_level="HIGH",
    ),
}


def _seeded_noise(seed: int, step: int) -> float:
    x = math.sin(seed * 12.9898 + step * 78.233) * 43758.5453
    return (x - math.floor(x)) * 2.0 - 1.0


def generate_historical_series(
    cfg: CorridorSeriesConfig,
    history_days: int = 365,
    end_date: date | None = None,
) -> List[Dict[str, Any]]:
    """Generates daily synthetic historical freight rates and operational drivers."""
    anchor_date = end_date or date.today()
    route_seed = sum((idx + 1) * ord(ch) for idx, ch in enumerate(cfg.route_code))

    weather_base = {"LOW": 0.22, "MODERATE": 0.48, "HIGH": 0.76}.get(
        cfg.weather_risk_level.upper(), 0.45
    )

    raw_rates: List[float] = []
    rows: List[Dict[str, Any]] = []

    for i in range(history_days):
        day_offset = history_days - 1 - i
        dt = anchor_date - timedelta(days=day_offset)
        day_of_year = dt.timetuple().tm_yday

        # Bay of Bengal / ECI monsoon peak roughly June-September (days ~150-270)
        monsoon_wave = math.exp(-((day_of_year - 210.0) / 48.0) ** 2)
        annual_cycle = math.sin(2.0 * math.pi * day_of_year / 365.25)
        weekly_cycle = math.cos(2.0 * math.pi * i / 7.0) * 0.015

        noise = _seeded_noise(route_seed, i)
        prev_rate = raw_rates[-1] if raw_rates else cfg.current_rate * 0.94

        seasonal_mult = 1.0 + 0.09 * monsoon_wave + 0.04 * annual_cycle + weekly_cycle
        target_level = cfg.current_rate * seasonal_mult
        shock = noise * 0.018 * target_level
        rate = max(4.0, prev_rate + 0.14 * (target_level - prev_rate) + shock)
        raw_rates.append(rate)

        congestion = min(
            0.95,
            max(
                0.15,
                cfg.congestion_index
                + 0.14 * monsoon_wave
                + 0.05 * noise
                + 0.02 * annual_cycle,
            ),
        )
        waiting_days = round(
            max(0.5, cfg.avg_waiting_days * (0.75 + 0.55 * congestion + 0.08 * noise)),
            2,
        )
        weather_score = min(
            1.0,
            max(0.05, weather_base + 0.22 * monsoon_wave + 0.08 * _seeded_noise(route_seed + 9, i)),
        )

        rows.append(
            {
                "date": dt.isoformat(),
                "rate_usd_mt": round(rate, 2),
                "congestion_index": round(congestion, 3),
                "waiting_days": waiting_days,
                "weather_risk_score": round(weather_score, 3),
            }
        )

    
    if rows:
        scale_factor = cfg.current_rate / max(rows[-1]["rate_usd_mt"], 0.01)
        for idx, r in enumerate(rows):

            blend = min(1.0, max(0.0, (idx - (len(rows) - 30)) / 30.0))
            adj_factor = 1.0 + blend * (scale_factor - 1.0)
            r["rate_usd_mt"] = round(max(4.0, r["rate_usd_mt"] * adj_factor), 2)
        rows[-1]["rate_usd_mt"] = round(cfg.current_rate, 2)

    return rows