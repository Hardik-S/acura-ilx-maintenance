"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { ServiceEventWithItems } from "@/lib/domain/types";
import { LoadingState } from "@/components/LoadingState";
import { ServiceEventForm } from "@/components/ServiceEventForm";
import { Button } from "@/components/ui/button";
import { bootstrapDatabase } from "@/lib/storage/bootstrap";
import { loadServiceEvent, saveServiceEvent } from "@/lib/storage/repository";

export function EditServiceEventClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id") ?? "";
  const [event, setEvent] = useState<ServiceEventWithItems | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        await bootstrapDatabase();
        const loadedEvent = id ? await loadServiceEvent(id) : undefined;
        setEvent(loadedEvent);
        if (!loadedEvent) {
          setError("Service event was not found.");
        }
      } catch (unknownError) {
        setError(unknownError instanceof Error ? unknownError.message : "Failed to load service event.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [id]);

  if (loading) {
    return <LoadingState label="Loading service event" />;
  }

  if (error || !event) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost">
          <Link href="/history/">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to history
          </Link>
        </Button>
        <p className="rounded-lg border bg-white p-4 text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      <Button asChild variant="ghost">
        <Link href="/history/">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to history
        </Link>
      </Button>
      <ServiceEventForm
        initialEvent={event}
        onSubmit={async (input) => {
          await saveServiceEvent(input);
          router.push("/history/");
        }}
      />
    </div>
  );
}
