// White content surface used by list pages and the create brief.
export function StudioPanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`min-h-0 bg-[var(--studio-panel)] text-[var(--studio-ink)] ${className}`}
    >
      {children}
    </div>
  );
}
