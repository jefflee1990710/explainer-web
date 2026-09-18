// Instant feedback while server pages fetch Mongo data (see app/*/page.tsx).
export default function AppLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" aria-busy="true" aria-live="polite">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-accent-ink/15 border-t-accent-ink" />
    </div>
  );
}
