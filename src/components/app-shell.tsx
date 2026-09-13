import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export function AppShell({
  credits,
  children,
}: {
  credits: number;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full bg-background">
      <header className="flex items-center justify-between border-b border-line bg-card px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/app" className="text-sm font-semibold">
            Explainer
          </Link>
          <nav className="flex gap-4 text-sm text-muted">
            <Link href="/app" className="hover:text-foreground">
              專案
            </Link>
            <Link href="/app/skills" className="hover:text-foreground">
              技能
            </Link>
            <Link href="/app/billing" className="hover:text-foreground">
              訂閱
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="rounded-full border border-line px-3 py-1">
            {credits} credits
          </span>
          <UserButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
