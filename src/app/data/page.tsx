"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import { Download, FileSpreadsheet, RotateCcw, Upload } from "lucide-react";
import { LoadingState } from "@/components/LoadingState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { snapshotToMaintenanceCsv, snapshotToTorqueCsv } from "@/lib/export/csv";
import { snapshotToJson } from "@/lib/export/json";
import { importParsedWorkbook, resetToSeedData } from "@/lib/data/repository";
import { useMaintenanceData } from "@/lib/data/useMaintenanceData";
import { downloadText } from "@/lib/utils";

export default function DataPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { snapshot, loading, error, refresh } = useMaintenanceData();
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);

  const rowWarnings = useMemo(
    () =>
      (snapshot?.sourceRows ?? [])
        .flatMap((row) => row.parseWarnings.map((warning) => ({ row: row.rowNumber, warning })))
        .slice(0, 20),
    [snapshot?.sourceRows],
  );

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setImporting(true);
    setMessage("");
    setWarnings([]);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const { parseMaintenanceWorkbook } = await import("@/lib/import/parseWorkbook");
      const parsed = await parseMaintenanceWorkbook(arrayBuffer, file.name);
      const result = await importParsedWorkbook(parsed);
      setWarnings(result.warnings);
      setMessage(
        result.imported
          ? `Imported ${parsed.serviceEvents.length} events, ${parsed.serviceItems.length} items, and ${parsed.torqueSpecs.length} torque specs.`
          : result.warnings[0],
      );
      await refresh();
    } catch (unknownError) {
      setMessage(unknownError instanceof Error ? unknownError.message : "Import failed.");
    } finally {
      setImporting(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  if (loading) {
    return <LoadingState />;
  }

  if (error || !snapshot) {
    return <p className="rounded-lg border bg-card p-4 text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Data</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Data is stored in Supabase. Exports include the shared admin-managed maintenance dataset.
        </p>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Import spreadsheet</CardTitle>
            <CardDescription>Reads Date, Service Item, Odometer, Notes, and torque specs from F:G.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={handleImport}
              aria-label="Import xlsx spreadsheet"
            />
            <Button onClick={() => inputRef.current?.click()} disabled={importing}>
              <Upload className="h-4 w-4" aria-hidden="true" />
              {importing ? "Importing" : "Import .xlsx"}
            </Button>
            {message ? <p className="rounded-md bg-muted px-3 py-2 text-sm">{message}</p> : null}
            {warnings.length > 0 ? (
              <div className="rounded-md border bg-card p-3">
                <p className="text-sm font-medium">Import warnings</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Export and reset</CardTitle>
            <CardDescription>Exports include grouped service events, line items, torque specs, and source rows.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Button
              variant="outline"
              onClick={() => downloadText("acura-ilx-maintenance.json", snapshotToJson(snapshot), "application/json")}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Export JSON
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                downloadText("acura-ilx-maintenance.csv", snapshotToMaintenanceCsv(snapshot), "text/csv")
              }
            >
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              Export history CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => downloadText("acura-ilx-torque-specs.csv", snapshotToTorqueCsv(snapshot), "text/csv")}
            >
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              Export torque CSV
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await resetToSeedData();
                await refresh();
                setMessage("Remote data reset to the inspected spreadsheet seed.");
              }}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reset to seed
            </Button>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Import batches</CardTitle>
          <CardDescription>Duplicate imports are blocked by source file hash.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {snapshot.importBatches.map((batch) => (
            <div key={batch.id} className="rounded-lg border bg-card p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{batch.sourceFilename}</p>
                <Badge>{batch.status}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{batch.summary}</p>
              <p className="mt-1 break-all text-xs text-muted-foreground">{batch.sourceFileHash}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {rowWarnings.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Source row warnings</CardTitle>
            <CardDescription>Warnings are retained with source row metadata for auditability.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {rowWarnings.map((warning) => (
                <li key={`${warning.row}-${warning.warning}`} className="rounded-md border bg-card p-2">
                  Row {warning.row}: {warning.warning}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
