"use client";

import type { MaintenanceSnapshot } from "@/lib/domain/types";
import { initialSeedData } from "@/lib/import/seedData";
import { db } from "@/lib/storage/db";

export async function bootstrapDatabase() {
  const existingVehicles = await db.vehicles.count();
  if (existingVehicles > 0) {
    return;
  }

  await writeSnapshot(initialSeedData);
}

export async function resetToSeedData() {
  await db.transaction(
    "rw",
    [db.vehicles, db.serviceEvents, db.serviceItems, db.torqueSpecs, db.importBatches, db.sourceRows],
    async () => {
      await clearAllTables();
      await putSnapshot(initialSeedData);
    },
  );
}

export async function writeSnapshot(snapshot: MaintenanceSnapshot) {
  await db.transaction(
    "rw",
    [db.vehicles, db.serviceEvents, db.serviceItems, db.torqueSpecs, db.importBatches, db.sourceRows],
    async () => {
      await putSnapshot(snapshot);
    },
  );
}

async function putSnapshot(snapshot: MaintenanceSnapshot) {
  await db.vehicles.bulkPut(snapshot.vehicles);
  await db.importBatches.bulkPut(snapshot.importBatches);
  await db.sourceRows.bulkPut(snapshot.sourceRows);
  await db.serviceEvents.bulkPut(snapshot.serviceEvents);
  await db.serviceItems.bulkPut(snapshot.serviceItems);
  await db.torqueSpecs.bulkPut(snapshot.torqueSpecs);
}

async function clearAllTables() {
  await Promise.all([
    db.vehicles.clear(),
    db.serviceEvents.clear(),
    db.serviceItems.clear(),
    db.torqueSpecs.clear(),
    db.importBatches.clear(),
    db.sourceRows.clear(),
  ]);
}
