"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { ArrowRight, CalendarClock, Gauge, Plus, Wrench } from "lucide-react";
import { LoadingState } from "@/components/LoadingState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMaintenanceData } from "@/lib/storage/useMaintenanceData";
import { formatDate, formatOdometer } from "@/lib/utils";

export default function DashboardPage() {
  const { events, latestEvent, loading, error, snapshot, vehicle } = useMaintenanceData();
  const totalItems = events.reduce((count, event) => count + event.items.length, 0);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <p className="rounded-lg border bg-white p-4 text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-lg border bg-white p-5 shadow-subtle sm:p-6">
          <p className="text-sm font-medium text-muted-foreground">Personal maintenance app</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">
            {vehicle?.nickname ?? "2015 Acura ILX"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Browse grouped service sessions, keep row-level notes intact, and manage torque specs from one local-first
            dashboard.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/history/new/">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add service
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/history/">
                View history
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Latest odometer</CardTitle>
            <CardDescription>Based on the highest recorded service entry.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold">{formatOdometer(latestEvent?.odometer)}</p>
            {latestEvent ? (
              <p className="mt-2 text-sm text-muted-foreground">{formatDate(latestEvent.serviceDate)}</p>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard icon={CalendarClock} label="Service events" value={events.length} />
        <MetricCard icon={Wrench} label="Service line items" value={totalItems} />
        <MetricCard icon={Gauge} label="Torque specs" value={snapshot?.torqueSpecs.length ?? 0} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent maintenance</CardTitle>
            <CardDescription>Grouped by service date, with blank-date spreadsheet rows preserved as line items.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {events.slice(0, 4).map((event) => (
              <Link
                key={event.id}
                href="/history/"
                className="block rounded-lg border bg-white p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{event.summary}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDate(event.serviceDate)} at {formatOdometer(event.odometer)}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">{event.items.length} items</span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reference</CardTitle>
            <CardDescription>Torque specs stay separate from maintenance history.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(snapshot?.torqueSpecs ?? []).slice(0, 3).map((spec) => (
              <div key={spec.id} className="rounded-lg border bg-white p-3">
                <p className="font-medium">{spec.component}</p>
                <p className="mt-1 text-sm text-muted-foreground">{spec.spec}</p>
              </div>
            ))}
            <Button asChild variant="outline" className="w-full">
              <Link href="/torque/">Open torque specs</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          <Icon className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-2xl font-semibold">{value}</span>
          <span className="block text-sm text-muted-foreground">{label}</span>
        </span>
      </CardContent>
    </Card>
  );
}
