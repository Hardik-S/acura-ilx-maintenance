"use client";

import Link from "next/link";
import { CalendarDays, Gauge, Pencil } from "lucide-react";
import type { ServiceEventWithItems } from "@/lib/domain/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatOdometer } from "@/lib/utils";

interface EventCardProps {
  event: ServiceEventWithItems;
  selected?: boolean;
  onSelect?: () => void;
}

export function EventCard({ event, selected, onSelect }: EventCardProps) {
  return (
    <Card className={selected ? "border-primary ring-2 ring-primary/20" : ""}>
      <CardContent className="p-4">
        <button type="button" className="w-full text-left" onClick={onSelect}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold">{event.summary}</h3>
              <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  {formatDate(event.serviceDate)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Gauge className="h-4 w-4" aria-hidden="true" />
                  {formatOdometer(event.odometer)}
                </span>
              </div>
            </div>
            <Badge>{event.items.length} item{event.items.length === 1 ? "" : "s"}</Badge>
          </div>

          <ul className="mt-4 space-y-2">
            {event.items.slice(0, 3).map((item) => (
              <li key={item.id} className="rounded-md bg-muted/60 px-3 py-2 text-sm">
                <span className="font-medium">{item.description}</span>
                {item.notes ? <span className="text-muted-foreground"> - {item.notes}</span> : null}
              </li>
            ))}
          </ul>
          {event.items.length > 3 ? (
            <p className="mt-2 text-sm text-muted-foreground">+ {event.items.length - 3} more service items</p>
          ) : null}
        </button>

        <div className="mt-4 flex justify-end">
          <Button asChild variant="outline" size="sm">
            <Link href={`/history/edit/?id=${encodeURIComponent(event.id)}`}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
