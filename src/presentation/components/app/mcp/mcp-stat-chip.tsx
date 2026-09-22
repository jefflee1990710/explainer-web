// Small lime stat chip used on the MCP usage dashboard.
export function McpStatChip({ label }: { label: string }) {
  return (
    <div className="rounded-[1rem] border border-accent-ink/10 bg-lime/40 px-4 py-3 text-sm font-semibold">
      {label}
    </div>
  );
}
