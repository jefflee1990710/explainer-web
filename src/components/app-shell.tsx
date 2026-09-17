"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { BrandMark } from "@/components/brand-mark";
import { StudioBackdrop } from "@/components/studio-backdrop";

export function AppShell({
  credits,
  children,
}: {
  credits: number;
  children: React.ReactNode;
}) {
  return (
    <div className="studio-canvas relative flex flex-1 flex-col">
      <StudioBackdrop />
      <div className="relative z-10 flex flex-1 flex-col">
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex items-center justify-between border-b border-accent-ink/10 bg-paper/70 px-6 py-4 backdrop-blur-md"
        >
          <div className="flex items-center gap-6">
            <BrandMark href="/app" />
            <nav className="flex gap-4 text-sm font-medium text-muted">
              <Link href="/app" className="hover:text-foreground">
                專案
              </Link>
              <Link href="/app/skills" className="hover:text-foreground">
                風格
              </Link>
              <Link href="/app/billing" className="hover:text-foreground">
                訂閱
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="rounded-full border border-accent-ink/10 bg-lime/70 px-3 py-1 font-semibold text-accent-ink">
              {credits} credits
            </span>
            <UserButton />
          </div>
        </motion.header>
        <motion.main
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="mx-auto w-full max-w-5xl px-6 py-10"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
