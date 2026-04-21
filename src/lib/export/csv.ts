import type { MaintenanceSnapshot, ServiceEvent, ServiceItem, TorqueSpec } from "@/lib/domain/types";

export function snapshotToMaintenanceCsv(snapshot: MaintenanceSnapshot) {
  const itemsByEvent = groupItems(snapshot.serviceItems);
  const events = [...snapshot.serviceEvents].sort(compareEvents);
  const rows = [["Date", "Service Item", "Odometer", "Notes"]];

  for (const event of events) {
    const items = itemsByEvent.get(event.id) ?? [];
    items.forEach((item, index) => {
      rows.push([index === 0 ? event.serviceDate : "", item.description, String(event.odometer), item.notes]);
    });
  }

  return rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
}

export function snapshotToTorqueCsv(snapshot: MaintenanceSnapshot) {
  const rows = [["Component", "Spec", "Notes"]];
  const torqueSpecs = [...snapshot.torqueSpecs].sort(compareTorque);

  for (const torqueSpec of torqueSpecs) {
    rows.push([torqueSpec.component, torqueSpec.spec, torqueSpec.notes]);
  }

  return rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
}

function groupItems(items: ServiceItem[]) {
  const grouped = new Map<string, ServiceItem[]>();

  for (const item of items) {
    grouped.set(item.serviceEventId, [...(grouped.get(item.serviceEventId) ?? []), item]);
  }

  for (const [eventId, eventItems] of grouped.entries()) {
    grouped.set(eventId, eventItems.sort((a, b) => a.sortOrder - b.sortOrder));
  }

  return grouped;
}

function compareEvents(a: ServiceEvent, b: ServiceEvent) {
  return a.serviceDate.localeCompare(b.serviceDate) || a.odometer - b.odometer;
}

function compareTorque(a: TorqueSpec, b: TorqueSpec) {
  return a.component.localeCompare(b.component);
}

function escapeCsv(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}
