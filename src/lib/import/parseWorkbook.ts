import ExcelJS from "exceljs";
import type {
  ImportBatch,
  ParsedWorkbook,
  ServiceEvent,
  ServiceItem,
  SourceRow,
  TorqueSpec,
  Vehicle,
} from "@/lib/domain/types";
import { DEFAULT_VEHICLE_ID } from "@/lib/import/seedData";
import { createId, normalizeText, nowIso } from "@/lib/utils";

const expectedHeaders = ["Date", "Service Item", "Odometer", "Notes"];

export async function parseMaintenanceWorkbook(
  arrayBuffer: ArrayBuffer,
  filename: string,
): Promise<ParsedWorkbook> {
  const hash = await hashArrayBuffer(arrayBuffer);
  const batchId = `batch-${hash.slice(0, 16)}`;
  const importedAt = nowIso();
  const workbook = new ExcelJS.Workbook();

  await workbook.xlsx.load(arrayBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("Workbook does not contain any worksheets.");
  }

  validateHeaders(worksheet);

  const warnings: string[] = [];
  const sourceRows: SourceRow[] = [];
  const serviceEvents: ServiceEvent[] = [];
  const serviceItems: ServiceItem[] = [];
  const torqueSpecs: TorqueSpec[] = [];
  let currentEvent: ServiceEvent | undefined;
  let currentDate = "";
  let currentOdometer: number | undefined;
  let itemSortOrder = 0;

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const rawDate = cellToRawString(row.getCell(1));
    const rawServiceItem = cellToRawString(row.getCell(2));
    const rawOdometer = cellToRawString(row.getCell(3));
    const rawNotes = cellToRawString(row.getCell(4));
    const description = normalizeText(rawServiceItem);
    const notes = normalizeText(rawNotes);
    const rowHasMaintenance = [rawDate, rawServiceItem, rawOdometer, rawNotes].some(
      (value) => value.trim().length > 0,
    );

    if (!rowHasMaintenance) {
      continue;
    }

    const rowWarnings: string[] = [];
    const parsedDate = parseExcelDate(row.getCell(1).value);
    const parsedOdometer = parseOdometer(rawOdometer);

    if (rawDate.trim() && !parsedDate) {
      rowWarnings.push(`Row ${rowNumber}: date could not be parsed.`);
    }

    if (rawOdometer.trim() && parsedOdometer === undefined) {
      rowWarnings.push(`Row ${rowNumber}: odometer could not be parsed.`);
    }

    if (parsedDate) {
      currentDate = parsedDate;
      currentOdometer = parsedOdometer;
      itemSortOrder = 0;
      currentEvent = {
        id: createId(`event-${parsedDate}`),
        vehicleId: DEFAULT_VEHICLE_ID,
        serviceDate: parsedDate,
        odometer: parsedOdometer ?? 0,
        summary: description || "Maintenance event",
        sourceBatchId: batchId,
        createdAt: importedAt,
        updatedAt: importedAt,
      };
      serviceEvents.push(currentEvent);
    }

    if (!parsedDate && !currentEvent) {
      rowWarnings.push(`Row ${rowNumber}: blank date row has no dated event above it.`);
    }

    if (!description) {
      rowWarnings.push(`Row ${rowNumber}: service item is blank.`);
    }

    if (
      !parsedDate &&
      currentEvent &&
      parsedOdometer !== undefined &&
      currentOdometer !== undefined &&
      parsedOdometer !== currentOdometer
    ) {
      rowWarnings.push(
        `Row ${rowNumber}: grouped odometer ${parsedOdometer} differs from event odometer ${currentOdometer}.`,
      );
    }

    const sourceRowId = `source-${batchId}-row-${rowNumber}-maintenance`;
    sourceRows.push({
      id: sourceRowId,
      importBatchId: batchId,
      sheetName: worksheet.name,
      rowNumber,
      rowType: "MAINTENANCE_ITEM",
      rawDate,
      rawServiceItem,
      rawOdometer,
      rawNotes,
      rawTorqueComponent: "",
      rawTorqueSpec: "",
      carriedForwardDate: currentDate,
      parsedOdometer,
      parseWarnings: rowWarnings,
    });
    warnings.push(...rowWarnings);

    if (currentEvent && description) {
      serviceItems.push({
        id: createId(`item-row-${rowNumber}`),
        serviceEventId: currentEvent.id,
        description,
        notes,
        sortOrder: itemSortOrder,
        sourceRowId,
        createdAt: importedAt,
        updatedAt: importedAt,
      });
      itemSortOrder += 1;
    }
  }

  applyEventSummaries(serviceEvents, serviceItems);
  parseTorqueSpecs(worksheet, batchId, importedAt, sourceRows, torqueSpecs, warnings);

  const status = warnings.length > 0 ? "WARNING" : "SUCCESS";
  const importBatch: ImportBatch = {
    id: batchId,
    sourceFilename: filename,
    sourceFileHash: `sha256:${hash}`,
    importedAt,
    status,
    summary: `${serviceEvents.length} events, ${serviceItems.length} items, ${torqueSpecs.length} torque specs imported.`,
  };

  const vehicle: Vehicle = {
    id: DEFAULT_VEHICLE_ID,
    year: 2015,
    make: "Acura",
    model: "ILX",
    nickname: "2015 Acura ILX",
    odometerUnit: "UNKNOWN",
    createdAt: importedAt,
    updatedAt: importedAt,
  };

  return {
    vehicles: [vehicle],
    serviceEvents,
    serviceItems,
    torqueSpecs,
    importBatches: [importBatch],
    sourceRows,
    warnings,
  };
}

function applyEventSummaries(events: ServiceEvent[], items: ServiceItem[]) {
  const itemsByEvent = new Map<string, ServiceItem[]>();
  for (const item of items) {
    itemsByEvent.set(item.serviceEventId, [...(itemsByEvent.get(item.serviceEventId) ?? []), item]);
  }

  for (const event of events) {
    const eventItems = itemsByEvent.get(event.id) ?? [];
    if (eventItems.length > 1) {
      event.summary = `${eventItems[0].description} + ${eventItems.length - 1} more`;
    }
  }
}

function parseTorqueSpecs(
  worksheet: ExcelJS.Worksheet,
  batchId: string,
  importedAt: string,
  sourceRows: SourceRow[],
  torqueSpecs: TorqueSpec[],
  warnings: string[],
) {
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const rawTorqueComponent = cellToRawString(row.getCell(6));
    const rawTorqueSpec = cellToRawString(row.getCell(7));
    const component = normalizeText(rawTorqueComponent);
    const spec = normalizeText(rawTorqueSpec);

    if (!component && !spec) {
      continue;
    }

    const rowWarnings: string[] = [];
    if (!component || !spec) {
      rowWarnings.push(`Row ${rowNumber}: torque spec row is missing component or spec.`);
    }

    const sourceRowId = `source-${batchId}-row-${rowNumber}-torque`;
    sourceRows.push({
      id: sourceRowId,
      importBatchId: batchId,
      sheetName: worksheet.name,
      rowNumber,
      rowType: "TORQUE_SPEC",
      rawDate: "",
      rawServiceItem: "",
      rawOdometer: "",
      rawNotes: "",
      rawTorqueComponent,
      rawTorqueSpec,
      carriedForwardDate: "",
      parseWarnings: rowWarnings,
    });
    warnings.push(...rowWarnings);

    if (component && spec) {
      torqueSpecs.push({
        id: createId(`torque-${slugify(component)}`),
        vehicleId: DEFAULT_VEHICLE_ID,
        component,
        spec,
        notes: "",
        sourceRowId,
        createdAt: importedAt,
        updatedAt: importedAt,
      });
    }
  }
}

function validateHeaders(worksheet: ExcelJS.Worksheet) {
  const actual = expectedHeaders.map((_, index) => cellToRawString(worksheet.getRow(1).getCell(index + 1)));
  const missing = expectedHeaders.filter((header, index) => actual[index].trim() !== header);

  if (missing.length > 0) {
    throw new Error(
      `Workbook headers do not match expected maintenance table. Expected ${expectedHeaders.join(", ")} in A1:D1.`,
    );
  }
}

function cellToRawString(cell: ExcelJS.Cell) {
  const value = cell.value;

  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return formatDateOnly(value);
  }

  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") {
      return value.text;
    }

    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text ?? "").join("");
    }

    if ("result" in value) {
      return String(value.result ?? "");
    }
  }

  return String(value);
}

function parseExcelDate(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (value instanceof Date) {
    return formatDateOnly(value);
  }

  if (typeof value === "number") {
    const epoch = Date.UTC(1899, 11, 30);
    const millis = epoch + Math.round(value * 24 * 60 * 60 * 1000);
    return new Date(millis).toISOString().slice(0, 10);
  }

  if (typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return formatDateOnly(date);
    }
  }

  return "";
}

function parseOdometer(value: string) {
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return Math.round(parsed);
}

function formatDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function hashArrayBuffer(arrayBuffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", arrayBuffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
