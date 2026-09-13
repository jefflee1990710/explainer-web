import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between border-b border-line bg-card px-6 py-4">
      <Link href="/" className="text-sm font-semibold tracking-tight">
        Explainer
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        <Link href="/#pricing" className="text-muted hover:text-foreground">
          方案
        </Link>
        <Show when="signed-out">
          <SignInButton mode="modal">
            <button className="rounded-full bg-accent px-4 py-2 text-white">
              登入
            </button>
          </SignInButton>
        </Show>
        <Show when="signed-in">
          <Link href="/app" className="text-muted hover:text-foreground">
            工作台
          </Link>
          <UserButton />
        </Show>
      </nav>
    </header>
  );
}
