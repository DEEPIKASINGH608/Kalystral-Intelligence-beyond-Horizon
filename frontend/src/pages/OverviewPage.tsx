import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Anchor,
  Database,
  Navigation,
  Radio,
  Ship,
} from "lucide-react";
import {
  CorridorOverview,
  fetchCorridorOverview,
  fetchSystemHealth,
  HealthStatus,
} from "../lib/api";

export function OverviewPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [corridor, setCorridor] = useState<CorridorOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchSystemHealth(), fetchCorridorOverview()])
      .then(([healthData, corridorData]) => {
        setHealth(healthData);
        setCorridor(corridorData);
      })
      .catch((err: Error) => setError(err.message));
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <header className="pb-6 border-b border-slate-800">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono mb-3">
          <Radio className="h-3.5 w-3.5 shrink-0" />
          <span>SYNTHETIC DEMO DATA - NO LIVE MARITIME FEEDS CONNECTED</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          East Coast India Bulk Freight Command Center
        </h2>
        <p className="text-slate-400 text-sm mt-1.5">
          Phase 2 Active - Authenticated Operator Telemetry & Synthetic ECI Corridor Baseline
        </p>
      </header>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="rounded-xl bg-slate-900/90 border border-cyan-500/20 p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase">
            <span>FastAPI Engine</span>
            <Activity className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-3 text-xl font-semibold text-white">
            {health ? "OPERATIONAL" : "CONNECTING..."}
          </div>
          <p className="mt-1 text-xs font-mono text-cyan-400">
            {health ? `v${health.version} - JWT Verified` : "Checking backend..."}
          </p>
        </div>

        <div className="rounded-xl bg-slate-900/90 border border-teal-500/20 p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase">
            <span>PostgreSQL Store</span>
            <Database className="h-4 w-4 text-teal-400" />
          </div>
          <div className="mt-3 text-xl font-semibold text-white uppercase">
            {health ? health.database : "PENDING"}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {corridor
              ? `${corridor.ports.length} ECI Ports - ${corridor.vessels.length} Vessel Classes Seeded`
              : "Loading seeded tables..."}
          </p>
        </div>

        <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase">
            <span>Next Module</span>
            <Navigation className="h-4 w-4 text-cyan-300" />
          </div>
          <div className="mt-3 text-xl font-semibold text-white">
            Phase 3: ML Forecasting
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Quantile Spot Rate Fan Charts & Risk Scoring
          </p>
        </div>
      </section>

      {corridor && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Ship className="h-5 w-5 text-cyan-400" />
              <span>Overseas {"→"} East Coast India Bulk Corridors (Demo Baseline)</span>
            </h3>
            <span className="text-xs font-mono text-amber-300">
              DEMO RATES ($/MT)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {corridor.routes.map((route) => (
              <div
                key={route.route_code}
                className="rounded-xl bg-slate-900/85 border border-slate-800 hover:border-cyan-500/35 p-5 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    {route.route_code}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    {route.distance_nm.toLocaleString()} NM - {route.recommended_vessel_segment}
                  </span>
                </div>

                <div className="mt-3 flex items-baseline justify-between gap-4">
                  <div>
                    <div className="font-semibold text-white">
                      {route.origin_port}, {route.origin_country} {"→"} {route.destination_port_code}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {route.commodity} - Typical Parcel: {route.typical_parcel_mt.toLocaleString()} MT
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono text-lg font-bold text-teal-300">
                      ${route.current_demo_rate_usd_mt.toFixed(2)}
                    </div>
                    <div
                      className={`font-mono text-xs ${
                        route.rate_7d_delta_pct >= 0 ? "text-amber-400" : "text-emerald-400"
                      }`}
                    >
                      {route.rate_7d_delta_pct >= 0 ? "+" : ""}
                      {route.rate_7d_delta_pct.toFixed(1)}% (7d demo)
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {corridor && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Anchor className="h-5 w-5 text-teal-400" />
            <span>East Coast India Discharge Port Constraints (Demo Parameters)</span>
          </h3>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/85">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950 text-xs font-mono uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Port</th>
                  <th className="px-4 py-3">Max Draft</th>
                  <th className="px-4 py-3">Max LOA</th>
                  <th className="px-4 py-3">Congestion Index</th>
                  <th className="px-4 py-3">Est. Wait</th>
                  <th className="px-4 py-3">Weather Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {corridor.ports.map((port) => (
                  <tr key={port.code} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{port.name}</div>
                      <div className="text-xs text-slate-400 font-mono">
                        {port.code} - {port.state}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-cyan-300">
                      {port.max_draft_m.toFixed(1)} m
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-300">
                      {port.max_loa_m.toFixed(0)} m
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-200">
                      {(port.berth_congestion_index * 100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-300">
                      {port.avg_waiting_days.toFixed(1)} d
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-mono text-xs px-2 py-0.5 rounded border ${
                          port.weather_risk_level === "LOW"
                            ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                            : port.weather_risk_level === "MODERATE"
                            ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                            : "bg-rose-500/10 text-rose-300 border-rose-500/30"
                        }`}
                      >
                        {port.weather_risk_level}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </motion.div>
  );
}