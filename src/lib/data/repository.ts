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
import { DEFAULT_VEHICLE_ID, initialSeedData } from "@/lib/import/seedData";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { createId, normalizeText, nowIso } from "@/lib/utils";
import {
  mapImportBatch,
  mapServiceEvent,
  mapServiceItem,
  mapSourceRow,
  mapTorqueSpec,
  mapVehicle,
  toServiceEventRow,
  toServiceItemRow,
  toSnapshotRows,
  toTorqueSpecRow,
} from "@/lib/data/mappers";

const supabase = () => createSupabaseBrowserClient();

export async function loadSnapshot(): Promise<MaintenanceSnapshot> {
  const client = supabase();
  const [vehicles, serviceEvents, serviceItems, torqueSpecs, importBatches, sourceRows] = await Promise.all([
    client.from("vehicles").select("*").order("created_at"),
    client.from("service_events").select("*").order("service_date", { ascending: false }),
    client.from("service_items").select("*").order("sort_order"),
    client.from("torque_specs").select("*").order("component"),
    client.from("import_batches").select("*").order("imported_at", { ascending: false }),
    client.from("source_rows").select("*").order("row_number"),
  ]);

  for (const result of [vehicles, serviceEvents, serviceItems, torqueSpecs, importBatches, sourceRows]) {
    if (result.error) {
      throw result.error;
    }
  }

  return {
    vehicles: (vehicles.data ?? []).map(mapVehicle),
    serviceEvents: (serviceEvents.data ?? []).map(mapServiceEvent),
    serviceItems: (serviceItems.data ?? []).map(mapServiceItem),
    torqueSpecs: (torqueSpecs.data ?? []).map(mapTorqueSpec),
    importBatches: (importBatches.data ?? []).map(mapImportBatch),
    sourceRows: (sourceRows.data ?? []).map(mapSourceRow),
  };
}

export async function loadServiceEventsWithItems(): Promise<ServiceEventWithItems[]> {
  const snapshot = await loadSnapshot();
  return snapshot.serviceEvents.map((event) => ({
    ...event,
    items: snapshot.serviceItems
      .filter((item) => item.serviceEventId === event.id)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  }));
}

export async function loadServiceEvent(id: string): Promise<ServiceEventWithItems | undefined> {
  const client = supabase();
  const [eventResult, itemsResult] = await Promise.all([
    client.from("service_events").select("*").eq("id", id).maybeSingle(),
    client.from("service_items").select("*").eq("service_event_id", id).order("sort_order"),
  ]);

  if (eventResult.error) {
    throw eventResult.error;
  }
  if (itemsResult.error) {
    throw itemsResult.error;
  }
  if (!eventResult.data) {
    return undefined;
  }

  return {
    ...mapServiceEvent(eventResult.data),
    items: (itemsResult.data ?? []).map(mapServiceItem),
  };
}

export async function saveServiceEvent(input: EventFormInput) {
  const client = supabase();
  const now = nowIso();
  const id = input.id ?? createId("event");
  const existing = input.id ? await loadServiceEvent(input.id) : undefined;
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

  const eventResult = await client.from("service_events").upsert(toServiceEventRow(event));
  if (eventResult.error) {
    throw eventResult.error;
  }

  if (existing) {
    const nextIds = new Set(items.map((item) => item.id));
    const deleteIds = existing.items.filter((item) => !nextIds.has(item.id)).map((item) => item.id);
    if (deleteIds.length > 0) {
      const deleteResult = await client.from("service_items").delete().in("id", deleteIds);
      if (deleteResult.error) {
        throw deleteResult.error;
      }
    }
  }

  const itemResult = await client.from("service_items").upsert(items.map(toServiceItemRow));
  if (itemResult.error) {
    throw itemResult.error;
  }

  return id;
}

export async function saveTorqueSpec(input: TorqueSpecFormInput) {
  const now = nowIso();
  const id = input.id ?? createId("torque");
  const existing = input.id ? await supabase().from("torque_specs").select("*").eq("id", input.id).maybeSingle() : null;
  if (existing?.error) {
    throw existing.error;
  }
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
    sourceRowId: input.sourceRowId ?? existing?.data?.source_row_id ?? undefined,
    createdAt: existing?.data?.created_at ?? now,
    updatedAt: now,
  };

  const result = await supabase().from("torque_specs").upsert(toTorqueSpecRow(torqueSpec));
  if (result.error) {
    throw result.error;
  }
  return id;
}

export async function importParsedWorkbook(parsed: ParsedWorkbook) {
  const batch = parsed.importBatches[0];
  if (!batch) {
    throw new Error("Parsed workbook did not include an import batch.");
  }

  const client = supabase();
  const duplicate = await client
    .from("import_batches")
    .select("*")
    .eq("source_file_hash", batch.sourceFileHash)
    .maybeSingle();
  if (duplicate.error) {
    throw duplicate.error;
  }
  if (duplicate.data) {
    return {
      imported: false,
      duplicate: mapImportBatch(duplicate.data),
      warnings: [`${batch.sourceFilename} has already been imported.`],
    };
  }

  await writeSnapshot(parsed);

  return {
    imported: true,
    warnings: parsed.warnings,
  };
}

export async function resetToSeedData() {
  await replaceSnapshot(initialSeedData);
}

export async function writeSnapshot(snapshot: MaintenanceSnapshot) {
  const rows = toSnapshotRows(snapshot);
  const client = supabase();
  const results = await Promise.all([
    client.from("vehicles").upsert(rows.vehicles),
    client.from("import_batches").upsert(rows.importBatches),
    client.from("source_rows").upsert(rows.sourceRows),
    client.from("service_events").upsert(rows.serviceEvents),
    client.from("service_items").upsert(rows.serviceItems),
    client.from("torque_specs").upsert(rows.torqueSpecs),
  ]);

  for (const result of results) {
    if (result.error) {
      throw result.error;
    }
  }
}

async function replaceSnapshot(snapshot: MaintenanceSnapshot) {
  const client = supabase();
  const deleteResults = await Promise.all([
    client.from("service_items").delete().neq("id", ""),
    client.from("service_events").delete().neq("id", ""),
    client.from("torque_specs").delete().neq("id", ""),
    client.from("source_rows").delete().neq("id", ""),
    client.from("import_batches").delete().neq("id", ""),
    client.from("vehicles").delete().neq("id", ""),
  ]);

  for (const result of deleteResults) {
    if (result.error) {
      throw result.error;
    }
  }

  await writeSnapshot(snapshot);
}
