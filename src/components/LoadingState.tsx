export function LoadingState({ label = "Loading maintenance data" }: { label?: string }) {
  return (
    <div className="grid min-h-72 place-items-center rounded-lg border bg-white">
      <div className="text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
