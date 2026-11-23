export interface HealthStatus {
  status: string;
  service: string;
  tagline: string;
  version: string;
  environment: string;
  data_mode: string;
  database: string;
  timestamp_utc: string;
}

export interface DischargePort {
  code: string;
  name: string;
  state: string;
  max_draft_m: number;
  max_loa_m: number;
  berth_congestion_index: number;
  avg_waiting_days: number;
  weather_risk_level: "LOW" | "MODERATE" | "ELEVATED";
  primary_commodities: string;
  is_demo_data: boolean;
}

export interface VesselProfile {
  vessel_code: string;
  vessel_name: string;
  segment: string;
  dwt_mt: number;
  laden_draft_m: number;
  loa_m: number;
  daily_hire_usd: number;
  fuel_consumption_tpd: number;
  is_demo_data: boolean;
}

export interface CorridorRoute {
  route_code: string;
  origin_port: string;
  origin_country: string;
  destination_port_code: string;
  commodity: string;
  distance_nm: number;
  typical_parcel_mt: number;
  current_demo_rate_usd_mt: number;
  rate_7d_delta_pct: number;
  recommended_vessel_segment: string;
  is_demo_data: boolean;
}

export interface CorridorOverview {
  data_disclaimer: string;
  operator_email: string | null;
  ports: DischargePort[];
  vessels: VesselProfile[];
  routes: CorridorRoute[];
}