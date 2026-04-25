import type {
  ImportBatch,
  MaintenanceSnapshot,
  ServiceEvent,
  ServiceItem,
  SourceRow,
  TorqueSpec,
  Vehicle,
} from "@/lib/domain/types";
import type { Database } from "@/lib/supabase/database.types";

type Tables = Database["public"]["Tables"];

export function mapVehicle(row: Tables["vehicles"]["Row"]): Vehicle {
  return {
    id: row.id,
    year: row.year,
    make: row.make,
    model: row.model,
    nickname: row.nickname,
    odometerUnit: row.odometer_unit,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toVehicleRow(vehicle: Vehicle): Tables["vehicles"]["Insert"] {
  return {
    id: vehicle.id,
    year: vehicle.year,
    make: vehicle.make,
    model: vehicle.model,
    nickname: vehicle.nickname,
    odometer_unit: vehicle.odometerUnit,
    created_at: vehicle.createdAt,
    updated_at: vehicle.updatedAt,
  };
}

export function mapServiceEvent(row: Tables["service_events"]["Row"]): ServiceEvent {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    serviceDate: row.service_date,
    odometer: row.odometer,
    summary: row.summary,
    sourceBatchId: row.source_batch_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toServiceEventRow(event: ServiceEvent): Tables["service_events"]["Insert"] {
  return {
    id: event.id,
    vehicle_id: event.vehicleId,
    service_date: event.serviceDate,
    odometer: event.odometer,
    summary: event.summary,
    source_batch_id: event.sourceBatchId ?? null,
    created_at: event.createdAt,
    updated_at: event.updatedAt,
  };
}

export function mapServiceItem(row: Tables["service_items"]["Row"]): ServiceItem {
  return {
    id: row.id,
    serviceEventId: row.service_event_id,
    description: row.description,
    notes: row.notes,
    sortOrder: row.sort_order,
    sourceRowId: row.source_row_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toServiceItemRow(item: ServiceItem): Tables["service_items"]["Insert"] {
  return {
    id: item.id,
    service_event_id: item.serviceEventId,
    description: item.description,
    notes: item.notes,
    sort_order: item.sortOrder,
    source_row_id: item.sourceRowId ?? null,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

export function mapTorqueSpec(row: Tables["torque_specs"]["Row"]): TorqueSpec {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    component: row.component,
    spec: row.spec,
    notes: row.notes,
    sourceRowId: row.source_row_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toTorqueSpecRow(spec: TorqueSpec): Tables["torque_specs"]["Insert"] {
  return {
    id: spec.id,
    vehicle_id: spec.vehicleId,
    component: spec.component,
    spec: spec.spec,
    notes: spec.notes,
    source_row_id: spec.sourceRowId ?? null,
    created_at: spec.createdAt,
    updated_at: spec.updatedAt,
  };
}

export function mapImportBatch(row: Tables["import_batches"]["Row"]): ImportBatch {
  return {
    id: row.id,
    sourceFilename: row.source_filename,
    sourceFileHash: row.source_file_hash,
    importedAt: row.imported_at,
    status: row.status,
    summary: row.summary,
  };
}

export function toImportBatchRow(batch: ImportBatch): Tables["import_batches"]["Insert"] {
  return {
    id: batch.id,
    source_filename: batch.sourceFilename,
    source_file_hash: batch.sourceFileHash,
    imported_at: batch.importedAt,
    status: batch.status,
    summary: batch.summary,
  };
}

export function mapSourceRow(row: Tables["source_rows"]["Row"]): SourceRow {
  return {
    id: row.id,
    importBatchId: row.import_batch_id,
    sheetName: row.sheet_name,
    rowNumber: row.row_number,
    rowType: row.row_type,
    rawDate: row.raw_date,
    rawServiceItem: row.raw_service_item,
    rawOdometer: row.raw_odometer,
    rawNotes: row.raw_notes,
    rawTorqueComponent: row.raw_torque_component,
    rawTorqueSpec: row.raw_torque_spec,
    carriedForwardDate: row.carried_forward_date,
    parsedOdometer: row.parsed_odometer ?? undefined,
    parseWarnings: row.parse_warnings,
  };
}

export function toSourceRowRow(row: SourceRow): Tables["source_rows"]["Insert"] {
  return {
    id: row.id,
    import_batch_id: row.importBatchId,
    sheet_name: row.sheetName,
    row_number: row.rowNumber,
    row_type: row.rowType,
    raw_date: row.rawDate,
    raw_service_item: row.rawServiceItem,
    raw_odometer: row.rawOdometer,
    raw_notes: row.rawNotes,
    raw_torque_component: row.rawTorqueComponent,
    raw_torque_spec: row.rawTorqueSpec,
    carried_forward_date: row.carriedForwardDate,
    parsed_odometer: row.parsedOdometer ?? null,
    parse_warnings: row.parseWarnings,
  };
}

export function toSnapshotRows(snapshot: MaintenanceSnapshot) {
  return {
    vehicles: snapshot.vehicles.map(toVehicleRow),
    serviceEvents: snapshot.serviceEvents.map(toServiceEventRow),
    serviceItems: snapshot.serviceItems.map(toServiceItemRow),
    torqueSpecs: snapshot.torqueSpecs.map(toTorqueSpecRow),
    importBatches: snapshot.importBatches.map(toImportBatchRow),
    sourceRows: snapshot.sourceRows.map(toSourceRowRow),
  };
}
