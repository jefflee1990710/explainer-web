import type { ReactNode } from "react";

// Docs-style Academy frame: table of contents on the left, lesson/catalog on the right.
export function AcademyShell({
  aside,
  children,
}: {
  aside: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(15.5rem,17.5rem)_minmax(0,1fr)] lg:items-start lg:gap-12">
      <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto">
        {aside}
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
