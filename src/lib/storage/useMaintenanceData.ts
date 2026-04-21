"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { MaintenanceSnapshot, ServiceEventWithItems } from "@/lib/domain/types";
import { bootstrapDatabase } from "@/lib/storage/bootstrap";
import { loadServiceEventsWithItems, loadSnapshot } from "@/lib/storage/repository";

export function useMaintenanceData() {
  const [snapshot, setSnapshot] = useState<MaintenanceSnapshot | null>(null);
  const [events, setEvents] = useState<ServiceEventWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      await bootstrapDatabase();
      const [nextSnapshot, nextEvents] = await Promise.all([loadSnapshot(), loadServiceEventsWithItems()]);
      setSnapshot(nextSnapshot);
      setEvents(nextEvents);
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : "Failed to load maintenance data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const vehicle = snapshot?.vehicles[0];
  const latestEvent = useMemo(
    () => [...events].sort((a, b) => b.odometer - a.odometer)[0],
    [events],
  );

  return {
    snapshot,
    events,
    vehicle,
    latestEvent,
    loading,
    error,
    refresh,
  };
}
