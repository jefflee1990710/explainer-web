// Project workspace loads several collections; show progress immediately.
export default function ProjectLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-accent-ink/10" />
      <div className="h-64 animate-pulse rounded-[1.5rem] bg-accent-ink/10" />
      <div className="h-40 animate-pulse rounded-[1.5rem] bg-accent-ink/10" />
    </div>
  );
}
