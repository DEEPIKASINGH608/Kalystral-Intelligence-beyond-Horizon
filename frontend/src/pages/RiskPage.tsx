import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CloudRain, Gauge, Radio, ShieldAlert } from "lucide-react";
import { CorridorRiskItem, fetchCorridorRisk } from "../lib/api";

export function RiskPage() {
  const [horizonDays, setHorizonDays] = useState<number>(30);
  const [items, setItems] = useState<CorridorRiskItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchCorridorRisk(horizonDays)
      .then((res) => {
        if (!cancelled) setItems(res.corridors);
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
  }, [horizonDays]);

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
            <span>SYNTHETIC DEMO RISK TELEMETRY - ECI CORRIDORS</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Weather, Congestion & Corridor Risk
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Composite 0-100 risk score combining berth congestion, anchorage wait, weather exposure, and rate dispersion
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800 self-start">
          {[7, 14, 30, 60].map((h) => (
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

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-sm font-mono text-slate-400">
          Evaluating corridor risk scores...
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {items.map((item) => {
            const tierBadge =
              item.risk_tier === "ELEVATED"
                ? "bg-rose-500/15 text-rose-300 border-rose-500/40"
                : item.risk_tier === "MODERATE"
                ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                : "bg-emerald-500/15 text-emerald-300 border-emerald-500/40";

            const barColor =
              item.risk_tier === "ELEVATED"
                ? "bg-rose-400"
                : item.risk_tier === "MODERATE"
                ? "bg-amber-400"
                : "bg-emerald-400";

            return (
              <div
                key={item.route_code}
                className="rounded-xl bg-slate-900/90 border border-slate-800 p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-white">
                        {item.route_code}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        {"->"} {item.destination_port_code} ({item.vessel_segment})
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Projected P50: <span className="font-mono text-cyan-300">${item.projected_p50_usd_mt.toFixed(2)}/MT</span>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-md text-xs font-mono border ${tierBadge}`}
                  >
                    {item.risk_tier} ({item.risk_score.toFixed(1)})
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono text-slate-400 mb-1.5">
                    <span className="flex items-center gap-1">
                      <ShieldAlert className="h-3.5 w-3.5 text-cyan-400" /> Composite Risk Index
                    </span>
                    <span className="text-white">{item.risk_score.toFixed(1)} / 100</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-950 overflow-hidden">
                    <div
                      className={`h-full ${barColor} transition-all`}
                      style={{ width: `${Math.min(100, Math.max(4, item.risk_score))}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-800/80 text-xs">
                  <div className="bg-slate-950/70 rounded-lg p-2.5 border border-slate-800/70">
                    <div className="text-slate-400 font-mono flex items-center gap-1">
                      <Gauge className="h-3.5 w-3.5 text-cyan-400" /> Congestion
                    </div>
                    <div className="mt-1 font-mono text-sm font-semibold text-white">
                      {(item.congestion_index * 100).toFixed(0)}%
                    </div>
                  </div>

                  <div className="bg-slate-950/70 rounded-lg p-2.5 border border-slate-800/70">
                    <div className="text-slate-400 font-mono">Avg Wait</div>
                    <div className="mt-1 font-mono text-sm font-semibold text-teal-300">
                      {item.avg_waiting_days.toFixed(1)} d
                    </div>
                  </div>

                  <div className="bg-slate-950/70 rounded-lg p-2.5 border border-slate-800/70">
                    <div className="text-slate-400 font-mono flex items-center gap-1">
                      <CloudRain className="h-3.5 w-3.5 text-amber-400" /> Weather
                    </div>
                    <div className="mt-1 font-mono text-sm font-semibold text-amber-300">
                      {item.weather_risk_level}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </motion.div>
  );
}