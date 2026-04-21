import type { MaintenanceSnapshot } from "@/lib/domain/types";

export function snapshotToJson(snapshot: MaintenanceSnapshot) {
  return JSON.stringify(snapshot, null, 2);
}
