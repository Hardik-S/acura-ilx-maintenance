"use client";

import { FormEvent, useMemo, useState } from "react";
import { Pencil, Plus, Save, Search } from "lucide-react";
import type { TorqueSpec } from "@/lib/domain/types";
import { LoadingState } from "@/components/LoadingState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveTorqueSpec } from "@/lib/storage/repository";
import { useMaintenanceData } from "@/lib/storage/useMaintenanceData";

const emptyForm = { component: "", spec: "", notes: "" };

export default function TorquePage() {
  const { snapshot, loading, error, refresh } = useMaintenanceData();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<TorqueSpec | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const specs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return [...(snapshot?.torqueSpecs ?? [])]
      .sort((a, b) => a.component.localeCompare(b.component))
      .filter(
        (spec) =>
          !normalizedQuery ||
          spec.component.toLowerCase().includes(normalizedQuery) ||
          spec.spec.toLowerCase().includes(normalizedQuery) ||
          spec.notes.toLowerCase().includes(normalizedQuery),
      );
  }, [query, snapshot?.torqueSpecs]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError("");

    try {
      await saveTorqueSpec({
        id: editing?.id,
        component: form.component,
        spec: form.spec,
        notes: form.notes,
        sourceRowId: editing?.sourceRowId,
      });
      setEditing(null);
      setForm(emptyForm);
      await refresh();
    } catch (unknownError) {
      setFormError(unknownError instanceof Error ? unknownError.message : "Failed to save torque spec.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <p className="rounded-lg border bg-white p-4 text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="grid gap-5 pb-20 md:pb-0 lg:grid-cols-[1fr_0.8fr]">
      <section className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Torque specs</h1>
          <p className="mt-1 text-sm text-muted-foreground">Reference values are separate from service history.</p>
        </div>

        <Card>
          <CardContent className="p-4">
            <Label htmlFor="torqueSearch">Search specs</Label>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="torqueSearch"
                className="pl-9"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Component or torque value"
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {specs.map((spec) => (
            <Card key={spec.id}>
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{spec.component}</h2>
                    {spec.sourceRowId ? <Badge>Imported</Badge> : <Badge>Manual</Badge>}
                  </div>
                  <p className="mt-1 text-lg font-semibold text-primary">{spec.spec}</p>
                  {spec.notes ? <p className="mt-1 text-sm text-muted-foreground">{spec.notes}</p> : null}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(spec);
                    setForm({ component: spec.component, spec: spec.spec, notes: spec.notes });
                  }}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  Edit
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Card className="h-fit lg:sticky lg:top-24">
        <CardHeader>
          <CardTitle>{editing ? "Edit torque spec" : "Add torque spec"}</CardTitle>
          <CardDescription>Use concise component names and exact torque values.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="component">Component</Label>
              <Input
                id="component"
                value={form.component}
                onChange={(event) => setForm((current) => ({ ...current, component: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spec">Spec</Label>
              <Input
                id="spec"
                value={form.spec}
                onChange={(event) => setForm((current) => ({ ...current, spec: event.target.value }))}
                placeholder="Example: 18 ft-lbs"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </div>
            {formError ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p> : null}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="submit" disabled={saving}>
                {editing ? <Save className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                {saving ? "Saving" : editing ? "Save changes" : "Add spec"}
              </Button>
              {editing ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditing(null);
                    setForm(emptyForm);
                  }}
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
