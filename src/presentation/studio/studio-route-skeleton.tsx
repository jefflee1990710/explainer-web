// Shared instant skeleton shown while an /app route streams its server data.
export function StudioRouteSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2.5">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-accent-ink/10" />
          <div className="h-4 w-72 max-w-full animate-pulse rounded bg-accent-ink/10" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded-full bg-accent-ink/10" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <div className="aspect-[4/3] animate-pulse rounded-[1.5rem] bg-accent-ink/10" />
        <div className="aspect-[4/3] animate-pulse rounded-[1.5rem] bg-accent-ink/10" />
        <div className="aspect-[4/3] animate-pulse rounded-[1.5rem] bg-accent-ink/10" />
        <div className="aspect-[4/3] animate-pulse rounded-[1.5rem] bg-accent-ink/10" />
      </div>
    </div>
  );
}
