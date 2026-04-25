"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ServiceEventForm } from "@/components/ServiceEventForm";
import { Button } from "@/components/ui/button";
import { saveServiceEvent } from "@/lib/data/repository";

export default function NewServiceEventPage() {
  const router = useRouter();

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      <Button asChild variant="ghost">
        <Link href="/history/">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to history
        </Link>
      </Button>
      <ServiceEventForm
        onSubmit={async (input) => {
          await saveServiceEvent(input);
          router.push("/history/");
        }}
      />
    </div>
  );
}
