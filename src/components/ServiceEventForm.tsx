"use client";

import { FormEvent, useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import type { EventFormInput, ServiceEventWithItems } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ServiceEventFormProps {
  initialEvent?: ServiceEventWithItems;
  onSubmit: (input: EventFormInput) => Promise<void>;
}

type FormItem = EventFormInput["items"][number];

export function ServiceEventForm({ initialEvent, onSubmit }: ServiceEventFormProps) {
  const initialItems = useMemo(
    () =>
      initialEvent?.items.map((item) => ({
        id: item.id,
        description: item.description,
        notes: item.notes,
        sourceRowId: item.sourceRowId,
      })) ?? ([{ description: "", notes: "" }] satisfies FormItem[]),
    [initialEvent],
  );
  const [serviceDate, setServiceDate] = useState(initialEvent?.serviceDate ?? "");
  const [odometer, setOdometer] = useState(initialEvent ? String(initialEvent.odometer) : "");
  const [summary, setSummary] = useState(initialEvent?.summary ?? "");
  const [items, setItems] = useState<FormItem[]>(initialItems);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await onSubmit({
        id: initialEvent?.id,
        serviceDate,
        odometer: Number(odometer),
        summary,
        items,
      });
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : "Failed to save service event.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>{initialEvent ? "Edit service event" : "Add service event"}</CardTitle>
          <CardDescription>Group all work done during the same visit or driveway session.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="serviceDate">Date</Label>
              <Input
                id="serviceDate"
                type="date"
                value={serviceDate}
                onChange={(event) => setServiceDate(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="odometer">Odometer</Label>
              <Input
                id="odometer"
                type="number"
                min="0"
                inputMode="numeric"
                value={odometer}
                onChange={(event) => setOdometer(event.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="summary">Summary</Label>
            <Input
              id="summary"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="Example: Oil service and inspection"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Service items</CardTitle>
          <CardDescription>Each row is preserved as a separate service line item.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, index) => (
            <div key={item.id ?? index} className="rounded-lg border bg-card p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">Item {index + 1}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove service item"
                  disabled={items.length === 1}
                  onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1.25fr]">
                <div className="space-y-2">
                  <Label htmlFor={`description-${index}`}>Service item</Label>
                  <Input
                    id={`description-${index}`}
                    value={item.description}
                    onChange={(event) =>
                      setItems((current) =>
                        current.map((currentItem, itemIndex) =>
                          itemIndex === index ? { ...currentItem, description: event.target.value } : currentItem,
                        ),
                      )
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`notes-${index}`}>Notes</Label>
                  <Textarea
                    id={`notes-${index}`}
                    value={item.notes}
                    onChange={(event) =>
                      setItems((current) =>
                        current.map((currentItem, itemIndex) =>
                          itemIndex === index ? { ...currentItem, notes: event.target.value } : currentItem,
                        ),
                      )
                    }
                  />
                </div>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={() => setItems((current) => [...current, { description: "", notes: "" }])}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add line item
          </Button>
          {error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      <div className="sticky bottom-16 z-20 rounded-lg border bg-card p-3 shadow-subtle md:static md:border-0 md:bg-transparent md:p-0 md:shadow-none">
        <Button type="submit" className="w-full sm:w-auto" disabled={saving}>
          <Save className="h-4 w-4" aria-hidden="true" />
          {saving ? "Saving" : "Save service event"}
        </Button>
      </div>
    </form>
  );
}
