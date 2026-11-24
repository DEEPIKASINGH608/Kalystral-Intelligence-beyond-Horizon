import { auth } from "./firebase";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

async function getAuthHeaders(): Promise<HeadersInit> {
  const currentUser = auth.currentUser;
  const token = currentUser ? await currentUser.getIdToken() : "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface HealthStatus {
  status: string;
  database?: string;
  version?: string;
  [key: string]: unknown;
}

export interface VesselItem {
  id?: number | string;
  vessel_class?: string;
  name?: string;
  [key: string]: unknown;
}

export interface CorridorRouteItem {
  route_code: string;
  origin_port: string;
  origin_country: string;
  destination_port_code: string;
  commodity: string;
  vessel_segment?: string;
  recommended_vessel_segment?: string;
  distance_nm: number;
  typical_parcel_mt: number;
  current_demo_rate_usd_mt: number;
  rate_7d_delta_pct: number;
}

export interface DischargePortItem {
  code: string;
  name: string;
  state: string;
  max_draft_m: number;
  max_loa_m: number;
  berth_congestion_index: number;
  avg_waiting_days: number;
  weather_risk_level?: string;
  [key: string]: unknown;
}

export interface CorridorOverview {
  is_synthetic?: boolean;
  ports_count?: number;
  vessels_count?: number;
  vessels: VesselItem[];
  routes: CorridorRouteItem[];
  ports: DischargePortItem[];
}

export interface HistoryPoint {
  date: string;
  rate_usd_mt: number;
  congestion_index: number;
  waiting_days: number;
  weather_risk_score: number;
}

export interface ForecastPoint {
  date: string;
  horizon_day: number;
  p10_usd_mt: number;
  p50_usd_mt: number;
  p90_usd_mt: number;
}

export interface RateForecastResponse {
  route_code: string;
  origin_port: string;
  origin_country: string;
  destination_port_code: string;
  commodity: string;
  vessel_segment: string;
  horizon_days: number;
  current_rate_usd_mt: number;
  projected_p50_usd_mt: number;
  expected_change_pct: number;
  dispersion_pct: number;
  model_backend: string;
  is_synthetic: boolean;
  history: HistoryPoint[];
  forecast: ForecastPoint[];
}

export interface CorridorRiskItem {
  route_code: string;
  destination_port_code: string;
  vessel_segment: string;
  risk_score: number;
  risk_tier: "LOW" | "MODERATE" | "ELEVATED";
  congestion_index: number;
  avg_waiting_days: number;
  weather_risk_level: "LOW" | "MODERATE" | "HIGH";
  rate_dispersion_pct: number;
  projected_p50_usd_mt: number;
  is_synthetic: boolean;
}

export interface CorridorRiskResponse {
  horizon_days: number;
  is_synthetic: boolean;
  corridors: CorridorRiskItem[];
}

export interface VesselFitCandidate {
  vessel_class: string;
  dwt_mt: number;
  draft_m: number;
  loa_m: number;
  draft_compatible: boolean;
  loa_compatible: boolean;
  port_compatible: boolean;
  fit_score: number;
  recommended: boolean;
  carried_parcel_mt: number;
  estimated_voyage_days: number;
  effective_wait_days: number;
  projected_p50_rate_usd_mt: number;
  projected_p90_rate_usd_mt: number;
  effective_landed_rate_usd_mt: number;
  estimated_total_cost_usd: number;
  rationale: string[];
}

export interface VesselPortFitResponse {
  route_code: string;
  origin_port: string;
  origin_country: string;
  destination_port_code: string;
  destination_port_name: string;
  port_max_draft_m: number;
  port_max_loa_m: number;
  commodity: string;
  baseline_vessel_segment: string;
  horizon_days: number;
  target_parcel_mt: number;
  corridor_risk_score: number;
  corridor_risk_tier: string;
  weather_risk_level: string;
  is_synthetic: boolean;
  candidates: VesselFitCandidate[];
}


export interface CharterDecisionItem {
  id: number;
  user_uid: string;
  route_code: string;
  destination_port_code: string;
  recommended_vessel_class: string;
  horizon_days: number;
  parcel_mt: number;
  projected_p50_rate_usd_mt: number | null;
  projected_p90_rate_usd_mt: number | null;
  effective_landed_rate_usd_mt: number | null;
  estimated_total_cost_usd: number | null;
  corridor_risk_score: number | null;
  fit_score: number | null;
  action_taken: string;
  status: "OPEN" | "EXECUTED" | "ARCHIVED" | string;
  rationale_notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateDecisionPayload {
  route_code: string;
  horizon_days: number;
  parcel_mt?: number;
  recommended_vessel_class?: string;
  action_taken: string;
  rationale_notes?: string;
}

export async function fetchDecisions(
  routeCode?: string,
  status?: string
): Promise<{ items: CharterDecisionItem[]; count: number }> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams();
  if (routeCode && routeCode !== "ALL") params.set("route_code", routeCode);
  if (status && status !== "ALL") params.set("status", status);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_BASE}/api/v1/decisions${qs}`, { headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Failed to load decisions (${res.status})`);
  }
  return res.json();
}

export async function createDecision(
  payload: CreateDecisionPayload
): Promise<CharterDecisionItem> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/v1/decisions`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Failed to save decision (${res.status})`);
  }
  return res.json();
}

export async function updateDecision(
  id: number,
  patch: { status?: string; action_taken?: string; rationale_notes?: string }
): Promise<CharterDecisionItem> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/v1/decisions/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Failed to update decision (${res.status})`);
  }
  return res.json();
}

export async function deleteDecision(id: number): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/v1/decisions/${id}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Failed to delete decision (${res.status})`);
  }
}

export async function fetchSystemHealth(): Promise<HealthStatus> {
  const res = await fetch(`${API_BASE}/api/v1/health`);
  if (!res.ok) {
    throw new Error(`Health check failed (${res.status})`);
  }
  return res.json();
}

export async function fetchCorridorOverview(): Promise<CorridorOverview> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/v1/corridor/overview`, { headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Failed to load corridor overview (${res.status})`);
  }
  return res.json();
}

export async function fetchRateForecast(
  routeCode: string,
  horizonDays: number
): Promise<RateForecastResponse> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams({
    route_code: routeCode,
    horizon_days: String(horizonDays),
  });
  const res = await fetch(`${API_BASE}/api/v1/forecast/rates?${params.toString()}`, {
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Failed to load rate forecast (${res.status})`);
  }
  return res.json();
}

export async function fetchCorridorRisk(horizonDays: number): Promise<CorridorRiskResponse> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams({ horizon_days: String(horizonDays) });
  const res = await fetch(`${API_BASE}/api/v1/forecast/risk?${params.toString()}`, {
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Failed to load corridor risk (${res.status})`);
  }
  return res.json();
}

export async function fetchVesselPortFit(
  routeCode: string,
  horizonDays: number,
  parcelMt?: number
): Promise<VesselPortFitResponse> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams({
    route_code: routeCode,
    horizon_days: String(horizonDays),
  });
  if (parcelMt && parcelMt > 0) {
    params.set("parcel_mt", String(parcelMt));
  }
  const res = await fetch(`${API_BASE}/api/v1/optimize/vessel-port-fit?${params.toString()}`, {
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Failed to evaluate vessel & port fit (${res.status})`);
  }
  return res.json();
}