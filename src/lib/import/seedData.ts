import type {
  ImportBatch,
  MaintenanceSnapshot,
  ServiceEvent,
  ServiceItem,
  SourceRow,
  TorqueSpec,
  Vehicle,
} from "@/lib/domain/types";

export const DEFAULT_VEHICLE_ID = "vehicle-2015-acura-ilx";
export const INITIAL_IMPORT_BATCH_ID = "batch-2015-acura-ilx-maintenance-history";
export const INITIAL_SOURCE_HASH =
  "sha256:inspected-2015-acura-ilx-maintenance-history-2026-04-21";

const createdAt = "2026-04-21T00:00:00.000Z";

const vehicle: Vehicle = {
  id: DEFAULT_VEHICLE_ID,
  year: 2015,
  make: "Acura",
  model: "ILX",
  nickname: "2015 Acura ILX",
  odometerUnit: "UNKNOWN",
  createdAt,
  updatedAt: createdAt,
};

const importBatch: ImportBatch = {
  id: INITIAL_IMPORT_BATCH_ID,
  sourceFilename: "2015 Acura ILX Maintenence History.xlsx",
  sourceFileHash: INITIAL_SOURCE_HASH,
  importedAt: createdAt,
  status: "SUCCESS",
  summary: "Initial seed imported from inspected workbook: 4 events, 8 items, 1 torque spec.",
};

const serviceEvents: ServiceEvent[] = [
  {
    id: "event-2026-02-02-93700",
    vehicleId: DEFAULT_VEHICLE_ID,
    serviceDate: "2026-02-02",
    odometer: 93700,
    summary: "Seller maintenance before purchase",
    sourceBatchId: INITIAL_IMPORT_BATCH_ID,
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: "event-2026-04-03-98154",
    vehicleId: DEFAULT_VEHICLE_ID,
    serviceDate: "2026-04-03",
    odometer: 98154,
    summary: "Back up camera replacement",
    sourceBatchId: INITIAL_IMPORT_BATCH_ID,
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: "event-2026-04-10-98993",
    vehicleId: DEFAULT_VEHICLE_ID,
    serviceDate: "2026-04-10",
    odometer: 98993,
    summary: "Air filters",
    sourceBatchId: INITIAL_IMPORT_BATCH_ID,
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: "event-2026-04-11-98995",
    vehicleId: DEFAULT_VEHICLE_ID,
    serviceDate: "2026-04-11",
    odometer: 98995,
    summary: "Spark plugs",
    sourceBatchId: INITIAL_IMPORT_BATCH_ID,
    createdAt,
    updatedAt: createdAt,
  },
];

const serviceItems: ServiceItem[] = [
  ["item-row-2", "event-2026-02-02-93700", "Rear shock absorbers", "Done by seller", 0, "source-row-2-maintenance"],
  ["item-row-3", "event-2026-02-02-93700", "Rear stabilizer end links", "Done by seller", 1, "source-row-3-maintenance"],
  ["item-row-4", "event-2026-02-02-93700", "Exhaust flange", "Done by seller, behind muffler", 2, "source-row-4-maintenance"],
  ["item-row-5", "event-2026-02-02-93700", "Brake service", "Done by seller", 3, "source-row-5-maintenance"],
  ["item-row-6", "event-2026-04-03-98154", "Back up camera", "OE went blurry, Amazon replacement", 0, "source-row-6-maintenance"],
  ["item-row-7", "event-2026-04-10-98993", "Engine air filter", "Fram", 0, "source-row-7-maintenance"],
  ["item-row-8", "event-2026-04-10-98993", "Cabin air filter", "Motomaster", 1, "source-row-8-maintenance"],
  ["item-row-9", "event-2026-04-11-98995", "Spark plugs", "NGK ILZKR7B11S", 0, "source-row-9-maintenance"],
].map(([id, serviceEventId, description, notes, sortOrder, sourceRowId]) => ({
  id: String(id),
  serviceEventId: String(serviceEventId),
  description: String(description),
  notes: String(notes),
  sortOrder: Number(sortOrder),
  sourceRowId: String(sourceRowId),
  createdAt,
  updatedAt: createdAt,
}));

const maintenanceSourceRows: SourceRow[] = [
  [2, "46055", "Rear shock absorbers", "93700", "Done by seller", "2026-02-02"],
  [3, "", "Rear stabilizer end links", "93700", "Done by seller", "2026-02-02"],
  [4, "", "Exhaust flange", "93700", "Done by seller, behind muffler", "2026-02-02"],
  [5, "", "Brake service", "93700", "Done by seller", "2026-02-02"],
  [6, "46115", "Back up camera", "98154", "OE went blurry, Amazon replacement ", "2026-04-03"],
  [7, "46122", "Engine air filter ", "98993", "Fram", "2026-04-10"],
  [8, "", "Cabin air filter", "98993", "Motomaster", "2026-04-10"],
  [9, "46123", "Spark plugs", "98995", "NGK ILZKR7B11S", "2026-04-11"],
].map(([rowNumber, rawDate, rawServiceItem, rawOdometer, rawNotes, carriedForwardDate]) => ({
  id: `source-row-${rowNumber}-maintenance`,
  importBatchId: INITIAL_IMPORT_BATCH_ID,
  sheetName: "Sheet1",
  rowNumber: Number(rowNumber),
  rowType: "MAINTENANCE_ITEM",
  rawDate: String(rawDate),
  rawServiceItem: String(rawServiceItem),
  rawOdometer: String(rawOdometer),
  rawNotes: String(rawNotes),
  rawTorqueComponent: "",
  rawTorqueSpec: "",
  carriedForwardDate: String(carriedForwardDate),
  parsedOdometer: Number(rawOdometer),
  parseWarnings: [],
})) satisfies SourceRow[];

const torqueSourceRow: SourceRow = {
  id: "source-row-2-torque",
  importBatchId: INITIAL_IMPORT_BATCH_ID,
  sheetName: "Sheet1",
  rowNumber: 2,
  rowType: "TORQUE_SPEC",
  rawDate: "",
  rawServiceItem: "",
  rawOdometer: "",
  rawNotes: "",
  rawTorqueComponent: "Spark Plugs",
  rawTorqueSpec: "18 ft-lbs",
  carriedForwardDate: "",
  parseWarnings: [],
};

const torqueSpecs: TorqueSpec[] = [
  {
    id: "torque-spark-plugs",
    vehicleId: DEFAULT_VEHICLE_ID,
    component: "Spark Plugs",
    spec: "18 ft-lbs",
    notes: "",
    sourceRowId: torqueSourceRow.id,
    createdAt,
    updatedAt: createdAt,
  },
];

export const initialSeedData: MaintenanceSnapshot = {
  vehicles: [vehicle],
  serviceEvents,
  serviceItems,
  torqueSpecs,
  importBatches: [importBatch],
  sourceRows: [...maintenanceSourceRows, torqueSourceRow],
};
