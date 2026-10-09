// Shown the moment the character URL opens, before the workspace data arrives.
export function CharacterPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-3">
          <div className="h-4 w-24 animate-pulse rounded bg-accent-ink/10" />
          <div className="h-9 w-56 animate-pulse rounded-lg bg-accent-ink/10" />
        </div>
        <div className="h-10 w-28 animate-pulse rounded-full bg-accent-ink/10" />
      </div>
      <div className="grid min-h-[28rem] gap-6 md:grid-cols-[11rem_17.5rem_minmax(0,1fr)]">
        <div className="animate-pulse rounded-[1.5rem] bg-accent-ink/10" />
        <div className="animate-pulse rounded-[1.5rem] bg-accent-ink/10" />
        <div className="animate-pulse rounded-[1.5rem] bg-accent-ink/10" />
      </div>
      <div className="h-40 animate-pulse rounded-[1.5rem] bg-accent-ink/10" />
    </div>
  );
}
