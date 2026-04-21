import { Suspense } from "react";
import { LoadingState } from "@/components/LoadingState";
import { EditServiceEventClient } from "@/components/EditServiceEventClient";

export default function EditServiceEventPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading service event" />}>
      <EditServiceEventClient />
    </Suspense>
  );
}
