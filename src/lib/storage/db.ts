"use client";

import Dexie, { type Table } from "dexie";
import type {
  ImportBatch,
  ServiceEvent,
  ServiceItem,
  SourceRow,
  TorqueSpec,
  Vehicle,
} from "@/lib/domain/types";

export class MaintenanceDatabase extends Dexie {
  vehicles!: Table<Vehicle, string>;
  serviceEvents!: Table<ServiceEvent, string>;
  serviceItems!: Table<ServiceItem, string>;
  torqueSpecs!: Table<TorqueSpec, string>;
  importBatches!: Table<ImportBatch, string>;
  sourceRows!: Table<SourceRow, string>;

  constructor() {
    super("acura-ilx-maintenance");
    this.version(1).stores({
      vehicles: "id",
      serviceEvents: "id, vehicleId, serviceDate, odometer, sourceBatchId",
      serviceItems: "id, serviceEventId, sourceRowId, sortOrder",
      torqueSpecs: "id, vehicleId, component, sourceRowId",
      importBatches: "id, sourceFileHash, importedAt, status",
      sourceRows: "id, importBatchId, rowNumber, rowType",
    });
  }
}

export const db = new MaintenanceDatabase();
