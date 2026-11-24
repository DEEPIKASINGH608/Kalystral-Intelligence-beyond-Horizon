import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Cpu, Radio, TrendingDown, TrendingUp } from "lucide-react";
import { fetchRateForecast, RateForecastResponse } from "../lib/api";

const ROUTES = ["AUNCL-INDMR", "AUPHE-INKRI", "IDSRI-INVTZ", "ZARB-INPRT"];
const HORIZONS = [7, 14, 30, 60];

export function RateForecastPage() {
  const [selectedRoute, setSelectedRoute] = useState<string>("AUNCL-INDMR");
  const [horizonDays, setHorizonDays] = useState<number>(30);
  const [data, setData] = useState<RateForecastResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchRateForecast(selectedRoute, horizonDays)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedRoute, horizonDays]);

  const chart = useMemo(() => {
    if (!data) return null;
    const width = 880;
    const height = 300;
    const padLeft = 52;
    const padRight = 24;
    const padTop = 20;
    const padBottom = 34;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    const histSlice = data.history.slice(-45);
    const totalPoints = histSlice.length + data.forecast.length;

    const allVals: number[] = [
      ...histSlice.map((h) => h.rate_usd_mt),
      ...data.forecast.flatMap((f) => [f.p10_usd_mt, f.p50_usd_mt, f.p90_usd_mt]),
    ];

    const rawMin = Math.min(...allVals);
    const rawMax = Math.max(...allVals);
    const margin = Math.max(0.5, (rawMax - rawMin) * 0.12);
    const minY = Math.floor((rawMin - margin) * 10) / 10;
    const maxY = Math.ceil((rawMax + margin) * 10) / 10;
    const spanY = Math.max(0.1, maxY - minY);

    const xAt = (idx: number) =>
      padLeft + (totalPoints <= 1 ? 0 : (idx / (totalPoints - 1)) * plotW);
    const yAt = (val: number) =>
      padTop + plotH - ((val - minY) / spanY) * plotH;

    const histPath = histSlice
      .map((pt, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(pt.rate_usd_mt).toFixed(1)}`)
      .join(" ");

    const forecastStartIdx = histSlice.length - 1;
    const anchorHist = histSlice[histSlice.length - 1];

    const p50Points = [
      ...(anchorHist
        ? [{ x: xAt(forecastStartIdx), y: yAt(anchorHist.rate_usd_mt) }]
        : []),
      ...data.forecast.map((pt, i) => ({
        x: xAt(histSlice.length + i),
        y: yAt(pt.p50_usd_mt),
      })),
    ];

    const p50Path = p50Points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ");

    const bandTop = [
      ...(anchorHist
        ? [{ x: xAt(forecastStartIdx), y: yAt(anchorHist.rate_usd_mt) }]
        : []),
      ...data.forecast.map((pt, i) => ({
        x: xAt(histSlice.length + i),
        y: yAt(pt.p90_usd_mt),
      })),
    ];

    const bandBottom = [
      ...data.forecast
        .map((pt, i) => ({
          x: xAt(histSlice.length + i),
          y: yAt(pt.p10_usd_mt),
        }))
        .reverse(),
      ...(anchorHist
        ? [{ x: xAt(forecastStartIdx), y: yAt(anchorHist.rate_usd_mt) }]
        : []),
    ];

    const fanPolygon = [...bandTop, ...bandBottom]
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ") + " Z";

    const splitX = anchorHist ? xAt(forecastStartIdx) : padLeft;

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
      const val = minY + spanY * ratio;
      return { val, y: yAt(val) };
    });

    return {
      width,
      height,
      padLeft,
      plotW,
      histPath,
      p50Path,
      fanPolygon,
      splitX,
      yTicks,
      startLabel: histSlice[0]?.date ?? "",
      endLabel: data.forecast[data.forecast.length - 1]?.date ?? "",
    };
  }, [data]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      <header className="pb-5 border-b border-slate-800 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono mb-3">
            <Radio className="h-3.5 w-3.5 shrink-0" />
            <span>SYNTHETIC DEMO FORECAST - QUANTILE SPOT RATES ($/MT)</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Spot Rate Quantile Forecast
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {data
              ? `${data.origin_port}, ${data.origin_country} -> ${data.destination_port_code} - ${data.commodity} (${data.vessel_segment})`
              : "Select an East Coast India bulk corridor and forecast horizon"}
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800 self-start">
          {HORIZONS.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setHorizonDays(h)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                horizonDays === h
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-white border border-transparent"
              }`}
            >
              {h}d
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {ROUTES.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setSelectedRoute(code)}
            className={`px-3.5 py-2 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
              selectedRoute === code
                ? "bg-teal-500/15 text-teal-300 border border-teal-500/40"
                : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            {code}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {data && (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4">
            <div className="text-xs font-mono text-slate-400 uppercase">Current Spot Rate</div>
            <div className="mt-2 text-2xl font-mono font-bold text-white">
              ${data.current_rate_usd_mt.toFixed(2)}
            </div>
            <div className="text-xs text-slate-400 mt-1">per MT (Demo Baseline)</div>
          </div>

          <div className="rounded-xl bg-slate-900/90 border border-cyan-500/25 p-4">
            <div className="text-xs font-mono text-slate-400 uppercase">
              Projected P50 ({horizonDays}d)
            </div>
            <div className="mt-2 text-2xl font-mono font-bold text-cyan-300">
              ${data.projected_p50_usd_mt.toFixed(2)}
            </div>
            <div className="flex items-center gap-1 text-xs font-mono mt-1">
              {data.expected_change_pct >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-emerald-400" />
              )}
              <span
                className={
                  data.expected_change_pct >= 0 ? "text-amber-400" : "text-emerald-400"
                }
              >
                {data.expected_change_pct >= 0 ? "+" : ""}
                {data.expected_change_pct.toFixed(1)}% vs spot
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-900/90 border border-teal-500/25 p-4">
            <div className="text-xs font-mono text-slate-400 uppercase">P10-P90 Dispersion</div>
            <div className="mt-2 text-2xl font-mono font-bold text-teal-300">
              {data.dispersion_pct.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-400 mt-1">Uncertainty band width at {horizonDays}d</div>
          </div>

          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4">
            <div className="text-xs font-mono text-slate-400 uppercase flex items-center justify-between">
              <span>Model Engine</span>
              <Cpu className="h-3.5 w-3.5 text-cyan-400" />
            </div>
            <div className="mt-2 text-sm font-mono font-semibold text-white truncate">
              {data.model_backend}
            </div>
            <div className="text-xs text-slate-400 mt-1">Monsoon + Congestion Lags</div>
          </div>
        </section>
      )}

      <section className="rounded-xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white">
              Quantile Fan Chart (History + P10/P50/P90 Forecast)
            </h3>
            <p className="text-xs text-slate-400">
              Shaded band shows 10th to 90th percentile spot rate range; solid cyan curve is P50 median
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="h-0.5 w-4 bg-slate-400 inline-block" /> History
            </span>
            <span className="flex items-center gap-1.5 text-cyan-300">
              <span className="h-0.5 w-4 bg-cyan-400 inline-block" /> P50
            </span>
            <span className="flex items-center gap-1.5 text-teal-300">
              <span className="h-3 w-4 rounded-sm bg-cyan-400/20 border border-cyan-400/40 inline-block" />{" "}
              P10-P90
            </span>
          </div>
        </div>

        {loading && !chart ? (
          <div className="h-64 flex items-center justify-center text-sm text-slate-400 font-mono">
            Computing quantile forecast...
          </div>
        ) : chart ? (
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${chart.width} ${chart.height}`}
              className="w-full min-w-[640px] h-auto select-none"
            >
              {chart.yTicks.map((tick, idx) => (
                <g key={idx}>
                  <line
                    x1={chart.padLeft}
                    y1={tick.y}
                    x2={chart.width - 24}
                    y2={tick.y}
                    stroke="#1e293b"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={chart.padLeft - 8}
                    y={tick.y + 4}
                    textAnchor="end"
                    fill="#94a3b8"
                    fontSize="11"
                    fontFamily="monospace"
                  >
                    ${tick.val.toFixed(1)}
                  </text>
                </g>
              ))}

              <line
                x1={chart.splitX}
                y1={20}
                x2={chart.splitX}
                y2={chart.height - 34}
                stroke="#475569"
                strokeDasharray="4 4"
              />
              <text
                x={chart.splitX + 6}
                y={32}
                fill="#94a3b8"
                fontSize="10"
                fontFamily="monospace"
              >
                FORECAST {"->"}
              </text>

              <path d={chart.fanPolygon} fill="rgba(34, 211, 238, 0.16)" />
              <path
                d={chart.histPath}
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="2"
              />
              <path
                d={chart.p50Path}
                fill="none"
                stroke="#22d3ee"
                strokeWidth="2.5"
              />

              <text
                x={chart.padLeft}
                y={chart.height - 10}
                fill="#94a3b8"
                fontSize="11"
                fontFamily="monospace"
              >
                {chart.startLabel}
              </text>
              <text
                x={chart.width - 24}
                y={chart.height - 10}
                textAnchor="end"
                fill="#22d3ee"
                fontSize="11"
                fontFamily="monospace"
              >
                {chart.endLabel}
              </text>
            </svg>
          </div>
        ) : null}
      </section>
    </motion.div>
  );
}