"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";

// Header nav link with pending feedback while the server page loads.
export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="hover:text-foreground">
      {children}
      <NavLinkPending />
    </Link>
  );
}

function NavLinkPending() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={`ml-1 inline-block h-1.5 w-1.5 rounded-full bg-accent transition-opacity ${
        pending ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}
