from __future__ import annotations

from typing import Any
from sqlalchemy.orm import Session

from app.ml.forecast_service import compute_corridor_risk_scores, forecast_corridor_rates
from app.ml.synthetic_history import DEFAULT_CORRIDORS, CorridorSeriesConfig
from app.models import maritime as maritime_models


DEFAULT_VESSEL_PROFILES: list[dict[str, Any]] = [
    {
        "vessel_class": "Ultramax",
        "dwt_mt": 63000,
        "draft_m": 13.3,
        "loa_m": 200.0,
        "daily_hire_usd": 14500.0,
        "fuel_tpd": 26.0,
    },
    {
        "vessel_class": "Kamsarmax",
        "dwt_mt": 82000,
        "draft_m": 14.5,
        "loa_m": 229.0,
        "daily_hire_usd": 16800.0,
        "fuel_tpd": 31.0,
    },
    {
        "vessel_class": "Capesize",
        "dwt_mt": 180000,
        "draft_m": 18.2,
        "loa_m": 292.0,
        "daily_hire_usd": 24500.0,
        "fuel_tpd": 48.0,
    },
]

DEFAULT_PORT_SPECS: dict[str, dict[str, Any]] = {
    "INDMR": {
        "name": "Dhamra Port",
        "max_draft_m": 18.0,
        "max_loa_m": 295.0,
        "base_wait_days": 2.4,
        "congestion": 0.52,
    },
    "INKRI": {
        "name": "Krishnapatnam Port",
        "max_draft_m": 18.5,
        "max_loa_m": 300.0,
        "base_wait_days": 2.1,
        "congestion": 0.48,
    },
    "INVTZ": {
        "name": "Visakhapatnam Port",
        "max_draft_m": 14.8,
        "max_loa_m": 250.0,
        "base_wait_days": 3.2,
        "congestion": 0.66,
    },
    "INPRT": {
        "name": "Paradip Port",
        "max_draft_m": 16.5,
        "max_loa_m": 275.0,
        "base_wait_days": 2.9,
        "congestion": 0.61,
    },
}


def _find_corridor_cfg(route_code: str) -> CorridorSeriesConfig | None:
    target = route_code.upper().strip()
    if isinstance(DEFAULT_CORRIDORS, dict):
        if target in DEFAULT_CORRIDORS:
            return DEFAULT_CORRIDORS[target]
        for v in DEFAULT_CORRIDORS.values():
            if str(getattr(v, "route_code", "")).upper() == target:
                return v
        return None
    for item in DEFAULT_CORRIDORS:
        if str(getattr(item, "route_code", item)).upper() == target:
            return item  # type: ignore[return-value]
    return None


def _load_vessels_from_db(db: Session) -> list[dict[str, Any]]:
    vessel_model = getattr(maritime_models, "Vessel", None) or getattr(
        maritime_models, "VesselClass", None
    )
    if vessel_model is None:
        return DEFAULT_VESSEL_PROFILES
    rows = db.query(vessel_model).all()
    if not rows:
        return DEFAULT_VESSEL_PROFILES

    parsed: list[dict[str, Any]] = []
    for r in rows:
        v_class = (
            getattr(r, "vessel_class", None)
            or getattr(r, "segment", None)
            or getattr(r, "name", None)
            or "Kamsarmax"
        )
        draft = float(
            getattr(r, "draft_m", None) or getattr(r, "max_draft_m", None) or 14.5
        )
        loa = float(
            getattr(r, "loa_m", None) or getattr(r, "max_loa_m", None) or 229.0
        )
        dwt = float(
            getattr(r, "dwt_mt", None) or getattr(r, "capacity_mt", None) or 82000.0
        )
        hire = float(
            getattr(r, "daily_hire_usd", None)
            or getattr(r, "hire_rate_usd_day", None)
            or 16500.0
        )
        fuel = float(
            getattr(r, "fuel_tpd", None)
            or getattr(r, "fuel_consumption_tpd", None)
            or 31.0
        )
        parsed.append(
            {
                "vessel_class": str(v_class),
                "dwt_mt": dwt,
                "draft_m": draft,
                "loa_m": loa,
                "daily_hire_usd": hire,
                "fuel_tpd": fuel,
            }
        )
    return parsed


def _load_port_from_db(db: Session, port_code: str) -> dict[str, Any]:
    fallback = DEFAULT_PORT_SPECS.get(
        port_code,
        {
            "name": port_code,
            "max_draft_m": 15.0,
            "max_loa_m": 250.0,
            "base_wait_days": 2.5,
            "congestion": 0.55,
        },
    )
    port_model = getattr(maritime_models, "Port", None) or getattr(
        maritime_models, "DischargePort", None
    )
    if port_model is None:
        return fallback
    row = db.query(port_model).filter(getattr(port_model, "code") == port_code).first()
    if not row:
        return fallback

    return {
        "name": str(getattr(row, "name", None) or fallback["name"]),
        "max_draft_m": float(
            getattr(row, "max_draft_m", None) or fallback["max_draft_m"]
        ),
        "max_loa_m": float(
            getattr(row, "max_loa_m", None) or fallback["max_loa_m"]
        ),
        "base_wait_days": float(
            getattr(row, "avg_waiting_days", None) or fallback["base_wait_days"]
        ),
        "congestion": float(
            getattr(row, "berth_congestion_index", None) or fallback["congestion"]
        ),
    }


def evaluate_vessel_port_fit(
    db: Session,
    route_code: str,
    horizon_days: int = 30,
    parcel_mt: float | None = None,
) -> dict[str, Any]:
    cfg = _find_corridor_cfg(route_code)
    if cfg is None:
        raise ValueError(f"Unknown route_code '{route_code}'")

    code = str(cfg.route_code)
    rate_data = forecast_corridor_rates(cfg, horizon_days=horizon_days)
    all_cfgs = (
        list(DEFAULT_CORRIDORS.values())
        if isinstance(DEFAULT_CORRIDORS, dict)
        else list(DEFAULT_CORRIDORS)
    )
    risk_list = compute_corridor_risk_scores(all_cfgs, horizon_days=horizon_days)
    corridor_risk = next(
        (c for c in risk_list if c["route_code"] == code),
        {
            "risk_score": 50.0,
            "risk_tier": "MODERATE",
            "congestion_index": float(cfg.congestion_index),
            "avg_waiting_days": float(cfg.avg_waiting_days),
            "weather_risk_level": str(cfg.weather_risk_level).upper(),
            "rate_dispersion_pct": float(rate_data.get("dispersion_pct", 8.0)),
        },
    )

    port_code = str(cfg.destination_port_code)
    port_spec = _load_port_from_db(db, port_code)
    vessels = _load_vessels_from_db(db)

    target_parcel = (
        float(parcel_mt) if parcel_mt is not None else float(cfg.typical_parcel_mt)
    )
    distance_nm = float(cfg.distance_nm)
    p50_rate = float(rate_data["projected_p50_usd_mt"])
    p90_rate = float(rate_data["forecast"][-1]["p90_usd_mt"])

    avg_wait_days = float(corridor_risk["avg_waiting_days"])
    weather_level = str(corridor_risk["weather_risk_level"]).upper()
    weather_delay_factor = (
        1.25 if weather_level == "HIGH" else (1.10 if weather_level == "MODERATE" else 1.0)
    )
    effective_wait_days = round(avg_wait_days * weather_delay_factor, 2)

    candidates: list[dict[str, Any]] = []
    for v in vessels:
        draft_ok = v["draft_m"] <= port_spec["max_draft_m"]
        loa_ok = v["loa_m"] <= port_spec["max_loa_m"]
        compatible = draft_ok and loa_ok

        sailing_days = distance_nm / (13.5 * 24.0)
        port_ops_days = max(1.8, target_parcel / 26000.0)
        total_voyage_days = sailing_days + port_ops_days + effective_wait_days

        carried_mt = min(target_parcel, v["dwt_mt"] * 0.92)
        if not draft_ok and port_spec["max_draft_m"] > 0:
            draft_ratio = port_spec["max_draft_m"] / max(v["draft_m"], 0.1)
            carried_mt = min(carried_mt, v["dwt_mt"] * 0.92 * max(0.55, draft_ratio))
        carried_mt = max(1000.0, carried_mt)

        demurrage_usd = effective_wait_days * 15500.0
        base_freight_usd = carried_mt * p50_rate
        total_landed_usd = base_freight_usd + demurrage_usd
        effective_rate_usd_mt = total_landed_usd / carried_mt

        utilization = min(1.0, target_parcel / max(v["dwt_mt"] * 0.92, 1.0))
        score = 86.0
        if not draft_ok:
            score -= 32.0
        if not loa_ok:
            score -= 22.0
        score -= effective_wait_days * 2.4
        score -= float(corridor_risk["risk_score"]) * 0.18
        if v["vessel_class"].lower() == str(cfg.vessel_segment).lower():
            score += 6.0
        if utilization < 0.45:
            score -= 8.0
        fit_score = round(max(5.0, min(99.0, score)), 1)

        reasons: list[str] = []
        if compatible:
            reasons.append(
                f"Draft {v['draft_m']:.1f}m <= {port_spec['max_draft_m']:.1f}m & LOA {v['loa_m']:.0f}m <= {port_spec['max_loa_m']:.0f}m"
            )
        else:
            if not draft_ok:
                reasons.append(
                    f"Draft {v['draft_m']:.1f}m exceeds {port_spec['max_draft_m']:.1f}m limit"
                )
            if not loa_ok:
                reasons.append(
                    f"LOA {v['loa_m']:.0f}m exceeds {port_spec['max_loa_m']:.0f}m limit"
                )

        reasons.append(
            f"Est. voyage + wait: {total_voyage_days:.1f}d (wait {effective_wait_days:.1f}d)"
        )
        reasons.append(f"Effective landed rate: ${effective_rate_usd_mt:.2f}/MT")

        candidates.append(
            {
                "vessel_class": v["vessel_class"],
                "dwt_mt": int(v["dwt_mt"]),
                "draft_m": v["draft_m"],
                "loa_m": v["loa_m"],
                "draft_compatible": draft_ok,
                "loa_compatible": loa_ok,
                "port_compatible": compatible,
                "fit_score": fit_score,
                "recommended": False,
                "carried_parcel_mt": round(carried_mt, 0),
                "estimated_voyage_days": round(total_voyage_days, 1),
                "effective_wait_days": effective_wait_days,
                "projected_p50_rate_usd_mt": round(p50_rate, 2),
                "projected_p90_rate_usd_mt": round(p90_rate, 2),
                "effective_landed_rate_usd_mt": round(effective_rate_usd_mt, 2),
                "estimated_total_cost_usd": round(total_landed_usd, 0),
                "rationale": reasons,
            }
        )

    candidates.sort(key=lambda c: c["fit_score"], reverse=True)
    if candidates:
        candidates[0]["recommended"] = True

    return {
        "route_code": code,
        "origin_port": cfg.origin_port,
        "origin_country": cfg.origin_country,
        "destination_port_code": port_code,
        "destination_port_name": port_spec["name"],
        "port_max_draft_m": port_spec["max_draft_m"],
        "port_max_loa_m": port_spec["max_loa_m"],
        "commodity": cfg.commodity,
        "baseline_vessel_segment": cfg.vessel_segment,
        "horizon_days": horizon_days,
        "target_parcel_mt": round(target_parcel, 0),
        "corridor_risk_score": corridor_risk["risk_score"],
        "corridor_risk_tier": corridor_risk["risk_tier"],
        "weather_risk_level": weather_level,
        "is_synthetic": True,
        "candidates": candidates,
    }