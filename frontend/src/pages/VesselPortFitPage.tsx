import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Anchor, CheckCircle2, Radio, Scale, AlertTriangle } from "lucide-react";
import { fetchVesselPortFit, VesselPortFitResponse } from "../lib/api";

const ROUTES = ["AUNCL-INDMR", "AUPHE-INKRI", "IDSRI-INVTZ", "ZARB-INPRT"];
const HORIZONS = [7, 14, 30, 60];

export function VesselPortFitPage() {
  const [selectedRoute, setSelectedRoute] = useState<string>("AUNCL-INDMR");
  const [horizonDays, setHorizonDays] = useState<number>(30);
  const [parcelInput, setParcelInput] = useState<string>("");
  const [data, setData] = useState<VesselPortFitResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const parsedParcel = Number(parcelInput);
    const parcelArg = parcelInput.trim() !== "" && Number.isFinite(parsedParcel) && parsedParcel > 0
      ? parsedParcel
      : undefined;

    fetchVesselPortFit(selectedRoute, horizonDays, parcelArg)
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
  }, [selectedRoute, horizonDays, parcelInput]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      <header className="pb-5 border-b border-slate-800 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono mb-3">
            <Radio className="h-3.5 w-3.5 shrink-0" />
            <span>PHASE 4 OPTIMIZER - DRAFT, LOA & LANDED COST FIT</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Vessel & Port Fit Optimization
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {data
              ? `${data.destination_port_name} (${data.destination_port_code}) limits: Max Draft ${data.port_max_draft_m.toFixed(1)}m · Max LOA ${data.port_max_loa_m.toFixed(0)}m`
              : "Evaluate vessel suitability, draft/LOA constraints, and landed freight economics"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300">
            <Scale className="h-3.5 w-3.5 text-cyan-400" />
            <span>Parcel (MT):</span>
            <input
              type="number"
              min={1000}
              step={1000}
              placeholder={data ? String(data.target_parcel_mt) : "Default"}
              value={parcelInput}
              onChange={(e) => setParcelInput(e.target.value)}
              className="w-28 bg-transparent text-white focus:outline-none font-mono"
            />
          </label>

          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
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

      {loading && !data ? (
        <div className="p-8 text-center text-sm font-mono text-slate-400">
          Scoring vessel-port combinations...
        </div>
      ) : data ? (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {data.candidates.map((c) => (
            <div
              key={c.vessel_class}
              className={`rounded-xl bg-slate-900/90 border p-5 flex flex-col justify-between space-y-4 ${
                c.recommended
                  ? "border-cyan-500/50 shadow-lg shadow-cyan-950/20"
                  : "border-slate-800"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Anchor className="h-4 w-4 text-cyan-400" />
                      <h3 className="text-lg font-bold text-white">{c.vessel_class}</h3>
                    </div>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">
                      {c.dwt_mt.toLocaleString()} DWT · Draft {c.draft_m.toFixed(1)}m · LOA {c.loa_m.toFixed(0)}m
                    </p>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-md text-xs font-mono border ${
                      c.recommended
                        ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/40"
                        : "bg-slate-950 text-slate-300 border-slate-700"
                    }`}
                  >
                    Fit {c.fit_score.toFixed(1)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                  {c.port_compatible ? (
                    <span className="inline-flex items-center gap-1 text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Port Fit OK
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                      <AlertTriangle className="h-3.5 w-3.5" /> Draft/LOA Constraint
                    </span>
                  )}
                  {c.recommended && (
                    <span className="text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded">
                      TOP PICK
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2 text-xs">
                  <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2.5">
                    <div className="text-slate-400 font-mono">Landed Rate</div>
                    <div className="text-sm font-mono font-bold text-cyan-300 mt-0.5">
                      ${c.effective_landed_rate_usd_mt.toFixed(2)}/MT
                    </div>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2.5">
                    <div className="text-slate-400 font-mono">Voyage + Wait</div>
                    <div className="text-sm font-mono font-bold text-white mt-0.5">
                      {c.estimated_voyage_days.toFixed(1)}d
                    </div>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2.5">
                    <div className="text-slate-400 font-mono">Carried Parcel</div>
                    <div className="text-sm font-mono text-slate-200 mt-0.5">
                      {c.carried_parcel_mt.toLocaleString()} MT
                    </div>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2.5">
                    <div className="text-slate-400 font-mono">Est. Total Cost</div>
                    <div className="text-sm font-mono text-teal-300 mt-0.5">
                      ${(c.estimated_total_cost_usd / 1_000_000).toFixed(2)}M
                    </div>
                  </div>
                </div>
              </div>

              <ul className="space-y-1.5 pt-3 border-t border-slate-800/80 text-xs text-slate-300">
                {c.rationale.map((line, i) => (
                  <li key={i} className="font-mono text-[11px] text-slate-400">
                    • {line}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}
    </motion.div>
  );
}