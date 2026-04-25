"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { EventCard } from "@/components/EventCard";
import { LoadingState } from "@/components/LoadingState";
import { ServiceEventDetail } from "@/components/ServiceEventDetail";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMaintenanceData } from "@/lib/data/useMaintenanceData";

export default function HistoryPage() {
  const { events, loading, error } = useMaintenanceData();
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minOdometer, setMinOdometer] = useState("");
  const [maxOdometer, setMaxOdometer] = useState("");
  const [selectedId, setSelectedId] = useState("");

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return events.filter((event) => {
      const matchesQuery =
        !normalizedQuery ||
        event.summary.toLowerCase().includes(normalizedQuery) ||
        event.items.some(
          (item) =>
            item.description.toLowerCase().includes(normalizedQuery) ||
            item.notes.toLowerCase().includes(normalizedQuery),
        );
      const matchesStart = !startDate || event.serviceDate >= startDate;
      const matchesEnd = !endDate || event.serviceDate <= endDate;
      const matchesMin = !minOdometer || event.odometer >= Number(minOdometer);
      const matchesMax = !maxOdometer || event.odometer <= Number(maxOdometer);
      return matchesQuery && matchesStart && matchesEnd && matchesMin && matchesMax;
    });
  }, [endDate, events, maxOdometer, minOdometer, query, startDate]);

  useEffect(() => {
    if (!selectedId && filteredEvents[0]) {
      setSelectedId(filteredEvents[0].id);
    }
    if (selectedId && !filteredEvents.some((event) => event.id === selectedId)) {
      setSelectedId(filteredEvents[0]?.id ?? "");
    }
  }, [filteredEvents, selectedId]);

  const selectedEvent = filteredEvents.find((event) => event.id === selectedId);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <p className="rounded-lg border bg-card p-4 text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Maintenance history</h1>
          <p className="mt-1 text-sm text-muted-foreground">Search grouped service sessions without losing row-level notes.</p>
        </div>
        <Button asChild>
          <Link href="/history/new/">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add event
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1.3fr_0.9fr_0.9fr_0.7fr_0.7fr]">
          <div className="space-y-2">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search"
                className="pl-9"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Service item or note"
              />
            </div>
          </div>
          <FilterInput id="startDate" label="From" type="date" value={startDate} onChange={setStartDate} />
          <FilterInput id="endDate" label="To" type="date" value={endDate} onChange={setEndDate} />
          <FilterInput
            id="minOdometer"
            label="Min odo"
            type="number"
            value={minOdometer}
            onChange={setMinOdometer}
          />
          <FilterInput
            id="maxOdometer"
            label="Max odo"
            type="number"
            value={maxOdometer}
            onChange={setMaxOdometer}
          />
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-3">
          {filteredEvents.length > 0 ? (
            filteredEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                selected={event.id === selectedId}
                onSelect={() => setSelectedId(event.id)}
              />
            ))
          ) : (
            <Card>
              <CardContent className="p-5 text-sm text-muted-foreground">No maintenance records match these filters.</CardContent>
            </Card>
          )}
        </div>
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ServiceEventDetail event={selectedEvent} />
        </div>
      </div>
    </div>
  );
}

function FilterInput({
  id,
  label,
  type,
  value,
  onChange,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
