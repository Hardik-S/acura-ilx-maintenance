export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          preferences: Json;
          force_password_change: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string; email: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      user_roles: {
        Row: {
          user_id: string;
          role: "admin" | "member";
          granted_by: string | null;
          granted_at: string;
        };
        Insert: {
          user_id: string;
          role: "admin" | "member";
          granted_by?: string | null;
          granted_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_roles"]["Row"]>;
      };
      vehicles: { Row: VehicleRow; Insert: VehicleRow; Update: Partial<VehicleRow> };
      service_events: { Row: ServiceEventRow; Insert: ServiceEventRow; Update: Partial<ServiceEventRow> };
      service_items: { Row: ServiceItemRow; Insert: ServiceItemRow; Update: Partial<ServiceItemRow> };
      torque_specs: { Row: TorqueSpecRow; Insert: TorqueSpecRow; Update: Partial<TorqueSpecRow> };
      import_batches: { Row: ImportBatchRow; Insert: ImportBatchRow; Update: Partial<ImportBatchRow> };
      source_rows: { Row: SourceRowRow; Insert: SourceRowRow; Update: Partial<SourceRowRow> };
      codex_issue_requests: {
        Row: {
          id: string;
          submitted_by: string;
          submitted_by_email: string;
          area: string;
          request: string;
          expected_outcome: string;
          context: string;
          urgency: "low" | "normal" | "high";
          status: "open" | "triaged" | "planned" | "closed";
          github_issue_number: number | null;
          admin_notes: string;
          created_at: string;
          updated_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          submitted_by: string;
          submitted_by_email: string;
          area: string;
          request: string;
          expected_outcome: string;
          context?: string;
          urgency?: "low" | "normal" | "high";
          status?: "open" | "triaged" | "planned" | "closed";
          github_issue_number?: number | null;
          admin_notes?: string;
          created_at?: string;
          updated_at?: string;
          resolved_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["codex_issue_requests"]["Row"]>;
      };
    };
  };
}

interface VehicleRow {
  id: string;
  year: number;
  make: string;
  model: string;
  nickname: string;
  odometer_unit: "UNKNOWN" | "MI" | "KM";
  created_at: string;
  updated_at: string;
}

interface ServiceEventRow {
  id: string;
  vehicle_id: string;
  service_date: string;
  odometer: number;
  summary: string;
  source_batch_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ServiceItemRow {
  id: string;
  service_event_id: string;
  description: string;
  notes: string;
  sort_order: number;
  source_row_id: string | null;
  created_at: string;
  updated_at: string;
}

interface TorqueSpecRow {
  id: string;
  vehicle_id: string;
  component: string;
  spec: string;
  notes: string;
  source_row_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ImportBatchRow {
  id: string;
  source_filename: string;
  source_file_hash: string;
  imported_at: string;
  status: "SUCCESS" | "WARNING" | "FAILED";
  summary: string;
}

interface SourceRowRow {
  id: string;
  import_batch_id: string;
  sheet_name: string;
  row_number: number;
  row_type: "MAINTENANCE_ITEM" | "TORQUE_SPEC";
  raw_date: string;
  raw_service_item: string;
  raw_odometer: string;
  raw_notes: string;
  raw_torque_component: string;
  raw_torque_spec: string;
  carried_forward_date: string;
  parsed_odometer: number | null;
  parse_warnings: string[];
}
