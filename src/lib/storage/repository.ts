"use client";

import type {
  EventFormInput,
  MaintenanceSnapshot,
  ParsedWorkbook,
  ServiceEvent,
  ServiceEventWithItems,
  ServiceItem,
  TorqueSpec,
  TorqueSpecFormInput,
} from "@/lib/domain/types";
import { DEFAULT_VEHICLE_ID } from "@/lib/import/seedData";
import { createId, normalizeText, nowIso } from "@/lib/utils";
import { db } from "@/lib/storage/db";

export async function loadSnapshot(): Promise<MaintenanceSnapshot> {
  const [vehicles, serviceEvents, serviceItems, torqueSpecs, importBatches, sourceRows] =
    await Promise.all([
      db.vehicles.toArray(),
      db.serviceEvents.toArray(),
      db.serviceItems.toArray(),
      db.torqueSpecs.toArray(),
      db.importBatches.reverse().sortBy("importedAt"),
      db.sourceRows.toArray(),
    ]);

  return {
    vehicles,
    serviceEvents,
    serviceItems,
    torqueSpecs,
    importBatches,
    sourceRows,
  };
}

export async function loadServiceEventsWithItems(): Promise<ServiceEventWithItems[]> {
  const [events, items] = await Promise.all([
    db.serviceEvents.orderBy("serviceDate").reverse().toArray(),
    db.serviceItems.orderBy("sortOrder").toArray(),
  ]);

  return events.map((event) => ({
    ...event,
    items: items
      .filter((item) => item.serviceEventId === event.id)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  }));
}

export async function loadServiceEvent(id: string): Promise<ServiceEventWithItems | undefined> {
  const event = await db.serviceEvents.get(id);
  if (!event) {
    return undefined;
  }

  const items = await db.serviceItems.where("serviceEventId").equals(id).sortBy("sortOrder");
  return {
    ...event,
    items,
  };
}

export async function saveServiceEvent(input: EventFormInput) {
  const now = nowIso();
  const id = input.id ?? createId("event");
  const existing = input.id ? await db.serviceEvents.get(input.id) : undefined;
  const cleanedItems = input.items
    .map((item) => ({
      ...item,
      description: normalizeText(item.description),
      notes: item.notes.trim(),
    }))
    .filter((item) => item.description.length > 0);

  if (!input.serviceDate || !Number.isFinite(input.odometer) || cleanedItems.length === 0) {
    throw new Error("Service date, odometer, and at least one service item are required.");
  }

  const event: ServiceEvent = {
    id,
    vehicleId: DEFAULT_VEHICLE_ID,
    serviceDate: input.serviceDate,
    odometer: Math.round(input.odometer),
    summary:
      normalizeText(input.summary) ||
      (cleanedItems.length > 1
        ? `${cleanedItems[0].description} + ${cleanedItems.length - 1} more`
        : cleanedItems[0].description),
    sourceBatchId: existing?.sourceBatchId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const items: ServiceItem[] = cleanedItems.map((item, index) => ({
    id: item.id ?? createId("item"),
    serviceEventId: id,
    description: item.description,
    notes: item.notes,
    sortOrder: index,
    sourceRowId: item.sourceRowId,
    createdAt: now,
    updatedAt: now,
  }));

  await db.transaction("rw", db.serviceEvents, db.serviceItems, async () => {
    await db.serviceEvents.put(event);
    const existingItems = input.id
      ? await db.serviceItems.where("serviceEventId").equals(id).toArray()
      : [];
    const nextIds = new Set(items.map((item) => item.id));
    await Promise.all(
      existingItems.filter((item) => !nextIds.has(item.id)).map((item) => db.serviceItems.delete(item.id)),
    );
    await db.serviceItems.bulkPut(items);
  });

  return id;
}

export async function saveTorqueSpec(input: TorqueSpecFormInput) {
  const now = nowIso();
  const id = input.id ?? createId("torque");
  const existing = input.id ? await db.torqueSpecs.get(input.id) : undefined;
  const component = normalizeText(input.component);
  const spec = normalizeText(input.spec);

  if (!component || !spec) {
    throw new Error("Component and torque spec are required.");
  }

  const torqueSpec: TorqueSpec = {
    id,
    vehicleId: DEFAULT_VEHICLE_ID,
    component,
    spec,
    notes: input.notes.trim(),
    sourceRowId: input.sourceRowId ?? existing?.sourceRowId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await db.torqueSpecs.put(torqueSpec);
  return id;
}

export async function importParsedWorkbook(parsed: ParsedWorkbook) {
  const batch = parsed.importBatches[0];
  if (!batch) {
    throw new Error("Parsed workbook did not include an import batch.");
  }

  const duplicate = await db.importBatches.where("sourceFileHash").equals(batch.sourceFileHash).first();
  if (duplicate) {
    return {
      imported: false,
      duplicate,
      warnings: [`${batch.sourceFilename} has already been imported.`],
    };
  }

  await db.transaction(
    "rw",
    [db.vehicles, db.serviceEvents, db.serviceItems, db.torqueSpecs, db.importBatches, db.sourceRows],
    async () => {
      await db.vehicles.bulkPut(parsed.vehicles);
      await db.importBatches.bulkAdd(parsed.importBatches);
      await db.sourceRows.bulkAdd(parsed.sourceRows);
      await db.serviceEvents.bulkAdd(parsed.serviceEvents);
      await db.serviceItems.bulkAdd(parsed.serviceItems);
      await db.torqueSpecs.bulkAdd(parsed.torqueSpecs);
    },
  );

  return {
    imported: true,
    warnings: parsed.warnings,
  };
}
