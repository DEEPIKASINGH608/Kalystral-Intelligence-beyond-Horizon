from __future__ import annotations

from datetime import date, timedelta
import math
from typing import Any, Dict, List

from app.ml.synthetic_history import (
    DEFAULT_CORRIDORS,
    CorridorSeriesConfig,
    generate_historical_series,
)

try:
    import numpy as np
    from sklearn.ensemble import HistGradientBoostingRegressor

    _HAS_SKLEARN = True
except Exception:  # pragma: no cover
    np = None  # type: ignore
    HistGradientBoostingRegressor = None  # type: ignore
    _HAS_SKLEARN = False


def _build_lag_dataset(rates: List[float], lookback: int = 14):
    X, y = [], []
    for t in range(lookback, len(rates) - 1):
        window = rates[t - lookback : t]
        mean_7 = sum(rates[t - 7 : t]) / 7.0
        mean_14 = sum(window) / float(lookback)
        trend_7 = rates[t - 1] - rates[max(0, t - 8)]
        X.append(window + [mean_7, mean_14, trend_7])
        y.append(rates[t])
    return X, y


def forecast_corridor_rates(
    cfg: CorridorSeriesConfig,
    horizon_days: int = 30,
    history_days: int = 365,
) -> Dict[str, Any]:
    horizon_days = max(7, min(90, int(horizon_days)))
    history = generate_historical_series(cfg, history_days=history_days)
    rates = [row["rate_usd_mt"] for row in history]
    last_congestion = history[-1]["congestion_index"]
    last_weather = history[-1]["weather_risk_score"]
    last_date = date.fromisoformat(history[-1]["date"])

    lookback = 14
    models: Dict[str, Any] = {}

    if _HAS_SKLEARN and len(rates) > lookback + 20:
        X_train, y_train = _build_lag_dataset(rates, lookback=lookback)
        X_arr = np.asarray(X_train, dtype=float)
        y_arr = np.asarray(y_train, dtype=float)

        for q_name, q_val in [("p10", 0.10), ("p50", 0.50), ("p90", 0.90)]:
            reg = HistGradientBoostingRegressor(
                loss="quantile",
                quantile=q_val,
                max_iter=120,
                max_depth=4,
                learning_rate=0.06,
                min_samples_leaf=12,
                random_state=42,
            )
            reg.fit(X_arr, y_arr)
            models[q_name] = reg

    rolling_rates = list(rates)
    forecasts: List[Dict[str, Any]] = []

    base_vol = max(0.015, 0.025 + 0.04 * last_congestion + 0.03 * last_weather)

    for step in range(1, horizon_days + 1):
        target_dt = last_date + timedelta(days=step)
        doy = target_dt.timetuple().tm_yday
        monsoon_drift = 0.0012 * math.exp(-((doy - 210.0) / 48.0) ** 2)

        if models:
            window = rolling_rates[-lookback:]
            mean_7 = sum(rolling_rates[-7:]) / 7.0
            mean_14 = sum(window) / float(lookback)
            trend_7 = rolling_rates[-1] - rolling_rates[max(0, len(rolling_rates) - 8)]
            feat = np.asarray([window + [mean_7, mean_14, trend_7]], dtype=float)

            p10_raw = float(models["p10"].predict(feat)[0])
            p50_raw = float(models["p50"].predict(feat)[0])
            p90_raw = float(models["p90"].predict(feat)[0])

            # Ensure fan width expands smoothly with forecast horizon & stays ordered
            horizon_scale = math.sqrt(step / 7.0)
            p50 = max(4.0, p50_raw * (1.0 + monsoon_drift * step))
            spread_low = max(abs(p50 - p10_raw), p50 * base_vol * horizon_scale * 0.85)
            spread_high = max(abs(p90_raw - p50), p50 * base_vol * horizon_scale * 1.05)

            p10 = max(3.5, p50 - spread_low)
            p90 = max(p50 + 0.25, p50 + spread_high)
        else:
            horizon_scale = math.sqrt(step / 7.0)
            drift_rate = (cfg.delta_7d_pct / 100.0) / 7.0 + monsoon_drift
            p50 = max(4.0, rolling_rates[-1] * (1.0 + drift_rate))
            p10 = max(3.5, p50 * (1.0 - base_vol * horizon_scale))
            p90 = p50 * (1.0 + base_vol * horizon_scale * 1.15)

        forecasts.append(
            {
                "date": target_dt.isoformat(),
                "horizon_day": step,
                "p10_usd_mt": round(p10, 2),
                "p50_usd_mt": round(p50, 2),
                "p90_usd_mt": round(p90, 2),
            }
        )
        rolling_rates.append(p50)

    final_p50 = forecasts[-1]["p50_usd_mt"]
    final_p10 = forecasts[-1]["p10_usd_mt"]
    final_p90 = forecasts[-1]["p90_usd_mt"]
    expected_change_pct = ((final_p50 - cfg.current_rate) / max(cfg.current_rate, 0.01)) * 100.0
    spread_pct = ((final_p90 - final_p10) / max(final_p50, 0.01)) * 100.0

    return {
        "route_code": cfg.route_code,
        "origin_port": cfg.origin_port,
        "origin_country": cfg.origin_country,
        "destination_port_code": cfg.destination_port_code,
        "commodity": cfg.commodity,
        "vessel_segment": cfg.vessel_segment,
        "horizon_days": horizon_days,
        "current_rate_usd_mt": round(cfg.current_rate, 2),
        "projected_p50_usd_mt": round(final_p50, 2),
        "expected_change_pct": round(expected_change_pct, 2),
        "dispersion_pct": round(spread_pct, 2),
        "model_backend": "HistGradientBoostingQuantile" if models else "StochasticDriftBaseline",
        "is_synthetic": True,
        "history": history[-90:],
        "forecast": forecasts,
    }


def compute_corridor_risk_scores(
    corridors: List[CorridorSeriesConfig],
    horizon_days: int = 30,
) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []
    for cfg in corridors:
        fc = forecast_corridor_rates(cfg, horizon_days=horizon_days)
        cong_score = min(100.0, max(0.0, cfg.congestion_index * 100.0))
        wait_score = min(100.0, max(0.0, (cfg.avg_waiting_days / 6.0) * 100.0))
        weather_score = {"LOW": 20.0, "MODERATE": 52.0, "HIGH": 82.0}.get(
            cfg.weather_risk_level.upper(), 50.0
        )
        vol_score = min(100.0, max(0.0, fc["dispersion_pct"] * 3.5))

        composite = round(
            0.35 * cong_score + 0.25 * wait_score + 0.20 * weather_score + 0.20 * vol_score,
            1,
        )

        if composite >= 65.0:
            tier = "ELEVATED"
        elif composite >= 42.0:
            tier = "MODERATE"
        else:
            tier = "LOW"

        results.append(
            {
                "route_code": cfg.route_code,
                "destination_port_code": cfg.destination_port_code,
                "vessel_segment": cfg.vessel_segment,
                "risk_score": composite,
                "risk_tier": tier,
                "congestion_index": round(cfg.congestion_index, 2),
                "avg_waiting_days": round(cfg.avg_waiting_days, 1),
                "weather_risk_level": cfg.weather_risk_level.upper(),
                "rate_dispersion_pct": fc["dispersion_pct"],
                "projected_p50_usd_mt": fc["projected_p50_usd_mt"],
                "is_synthetic": True,
            }
        )

    results.sort(key=lambda item: item["risk_score"], reverse=True)
    return results