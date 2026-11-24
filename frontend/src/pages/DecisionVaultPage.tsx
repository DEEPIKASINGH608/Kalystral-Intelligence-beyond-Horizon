import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookmarkCheck, CheckCircle2, Archive, Trash2, Radio } from "lucide-react";
import {
  CharterDecisionItem,
  createDecision,
  deleteDecision,
  fetchDecisions,
  updateDecision,
} from "../lib/api";

const ROUTES = ["AUNCL-INDMR", "AUPHE-INKRI", "IDSRI-INVTZ", "ZARB-INPRT"];
const VESSELS = ["Kamsarmax", "Ultramax", "Capesize"];
const ACTIONS = ["FIX_CHARTER", "BOOK_SPOT", "HOLD_WAIT", "SPLIT_PARCEL"];
const STATUS_FILTERS = ["ALL", "OPEN", "EXECUTED", "ARCHIVED"];

export function DecisionVaultPage() {
  const [items, setItems] = useState<CharterDecisionItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [routeCode, setRouteCode] = useState<string>("AUNCL-INDMR");
  const [vesselClass, setVesselClass] = useState<string>("Kamsarmax");
  const [horizonDays, setHorizonDays] = useState<number>(30);
  const [parcelMt, setParcelMt] = useState<string>("");
  const [actionTaken, setActionTaken] = useState<string>("FIX_CHARTER");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function loadList(activeStatus = statusFilter) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchDecisions(undefined, activeStatus);
      setItems(res.items);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadList(statusFilter);
  }, [statusFilter]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const trimmed = parcelMt.trim();
      const parsed = Number(trimmed);
      const parcelArg =
        trimmed !== "" && Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;

      await createDecision({
        route_code: routeCode,
        horizon_days: horizonDays,
        parcel_mt: parcelArg,
        recommended_vessel_class: vesselClass,
        action_taken: actionTaken,
        rationale_notes: notes.trim() || undefined,
      });
      setNotes("");
      await loadList(statusFilter);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(id: number, nextStatus: string) {
    try {
      await updateDecision(id, { status: nextStatus });
      await loadList(statusFilter);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteDecision(id);
      await loadList(statusFilter);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      <header className="pb-5 border-b border-slate-800 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-mono mb-3">
            <Radio className="h-3.5 w-3.5 shrink-0" />
            <span>PHASE 5 VAULT - AUDITABLE CHARTER & CORRIDOR LOG</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Decision Vault
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Capture charter decisions with live rate projections, port fit scores, and execution status
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800 shrink-0">
          {STATUS_FILTERS.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                statusFilter === st
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-white border border-transparent"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </header>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-xl bg-slate-900/90 border border-slate-800 p-5 space-y-4"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <BookmarkCheck className="h-4 w-4 text-cyan-400" />
          <span>Log New Charter Decision</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <select
            value={routeCode}
            onChange={(e) => setRouteCode(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white"
          >
            {ROUTES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <select
            value={vesselClass}
            onChange={(e) => setVesselClass(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white"
          >
            {VESSELS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>

          <select
            value={actionTaken}
            onChange={(e) => setActionTaken(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white"
          >
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          <select
            value={horizonDays}
            onChange={(e) => setHorizonDays(Number(e.target.value))}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white"
          >
            {[7, 14, 30, 60].map((h) => (
              <option key={h} value={h}>
                Horizon: {h}d
              </option>
            ))}
          </select>

          <input
            type="number"
            min={1000}
            step={1000}
            placeholder="Parcel MT (optional)"
            value={parcelMt}
            onChange={(e) => setParcelMt(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Rationale / charter notes (e.g., Lock Kamsarmax ahead of monsoon berth congestion)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white"
          />
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 text-xs font-mono font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save to Vault"}
          </button>
        </div>
      </form>

      {loading ? (
        <div className="p-8 text-center text-sm font-mono text-slate-400">
          Loading decision vault...
        </div>
      ) : items.length === 0 ? (
        <div className="p-8 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-sm font-mono text-slate-400">
          No decisions logged yet for filter “{statusFilter}”.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((d) => (
            <div
              key={d.id}
              className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <span className="text-white font-bold">{d.route_code}</span>
                  <span className="text-slate-500">→</span>
                  <span className="text-cyan-300">{d.destination_port_code}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                    {d.recommended_vessel_class}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/30 text-teal-300">
                    {d.action_taken}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300">
                    {d.status}
                  </span>
                </div>

                <div className="flex flex-wrap gap-4 text-xs font-mono text-slate-400">
                  <span>
                    Landed:{" "}
                    <strong className="text-cyan-300">
                      {d.effective_landed_rate_usd_mt != null
                        ? `$${d.effective_landed_rate_usd_mt.toFixed(2)}/MT`
                        : "—"}
                    </strong>
                  </span>
                  <span>
                    P50:{" "}
                    <strong className="text-slate-200">
                      {d.projected_p50_rate_usd_mt != null
                        ? `$${d.projected_p50_rate_usd_mt.toFixed(2)}`
                        : "—"}
                    </strong>
                  </span>
                  <span>
                    Fit Score:{" "}
                    <strong className="text-teal-300">
                      {d.fit_score != null ? d.fit_score.toFixed(1) : "—"}
                    </strong>
                  </span>
                  <span>
                    Parcel:{" "}
                    <strong className="text-slate-200">
                      {d.parcel_mt.toLocaleString()} MT
                    </strong>
                  </span>
                </div>

                {d.rationale_notes && (
                  <p className="text-xs text-slate-300 font-mono">{d.rationale_notes}</p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {d.status !== "EXECUTED" && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange(d.id, "EXECUTED")}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-mono cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Execute
                  </button>
                )}
                {d.status !== "ARCHIVED" && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange(d.id, "ARCHIVED")}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono cursor-pointer"
                  >
                    <Archive className="h-3.5 w-3.5" /> Archive
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(d.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-mono cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}