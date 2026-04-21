"use client";

import Link from "next/link";
import { CalendarDays, Gauge, Pencil } from "lucide-react";
import type { ServiceEventWithItems } from "@/lib/domain/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatOdometer } from "@/lib/utils";

export function ServiceEventDetail({ event }: { event?: ServiceEventWithItems }) {
  if (!event) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Select a service event</CardTitle>
          <CardDescription>Choose an entry from the history list to see all grouped work.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{event.summary}</CardTitle>
            <CardDescription className="mt-2 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                {formatDate(event.serviceDate)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Gauge className="h-4 w-4" aria-hidden="true" />
                {formatOdometer(event.odometer)}
              </span>
            </CardDescription>
          </div>
          {event.sourceBatchId ? <Badge>Imported</Badge> : <Badge>Manual</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {event.items.map((item, index) => (
            <li key={item.id} className="rounded-lg border bg-white p-3">
              <div className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-sm font-semibold text-secondary-foreground">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-medium">{item.description}</p>
                  {item.notes ? <p className="mt-1 text-sm text-muted-foreground">{item.notes}</p> : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
        <Button asChild className="mt-5 w-full sm:w-auto" variant="outline">
          <Link href={`/history/edit/?id=${encodeURIComponent(event.id)}`}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Edit event
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
