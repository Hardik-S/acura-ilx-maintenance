export type OdometerUnit = "UNKNOWN" | "MI" | "KM";
export type ImportStatus = "SUCCESS" | "WARNING" | "FAILED";
export type SourceRowType = "MAINTENANCE_ITEM" | "TORQUE_SPEC";

export interface Vehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  nickname: string;
  odometerUnit: OdometerUnit;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceEvent {
  id: string;
  vehicleId: string;
  serviceDate: string;
  odometer: number;
  summary: string;
  sourceBatchId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceItem {
  id: string;
  serviceEventId: string;
  description: string;
  notes: string;
  sortOrder: number;
  sourceRowId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TorqueSpec {
  id: string;
  vehicleId: string;
  component: string;
  spec: string;
  notes: string;
  sourceRowId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImportBatch {
  id: string;
  sourceFilename: string;
  sourceFileHash: string;
  importedAt: string;
  status: ImportStatus;
  summary: string;
}

export interface SourceRow {
  id: string;
  importBatchId: string;
  sheetName: string;
  rowNumber: number;
  rowType: SourceRowType;
  rawDate: string;
  rawServiceItem: string;
  rawOdometer: string;
  rawNotes: string;
  rawTorqueComponent: string;
  rawTorqueSpec: string;
  carriedForwardDate: string;
  parsedOdometer?: number;
  parseWarnings: string[];
}

export interface ServiceEventWithItems extends ServiceEvent {
  items: ServiceItem[];
}

export interface MaintenanceSnapshot {
  vehicles: Vehicle[];
  serviceEvents: ServiceEvent[];
  serviceItems: ServiceItem[];
  torqueSpecs: TorqueSpec[];
  importBatches: ImportBatch[];
  sourceRows: SourceRow[];
}

export interface ParsedWorkbook extends MaintenanceSnapshot {
  warnings: string[];
}

export interface EventFormInput {
  id?: string;
  serviceDate: string;
  odometer: number;
  summary: string;
  items: Array<{
    id?: string;
    description: string;
    notes: string;
    sourceRowId?: string;
  }>;
}

export interface TorqueSpecFormInput {
  id?: string;
  component: string;
  spec: string;
  notes: string;
  sourceRowId?: string;
}
