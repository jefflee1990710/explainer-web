"use client";

import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { BrandMark } from "@/components/brand-mark";

export function SiteHeader() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative z-20 flex items-center justify-between px-6 py-5"
    >
      <BrandMark />
      <nav className="flex items-center gap-4 text-sm">
        <Link
          href="/#pricing"
          className="font-medium text-muted transition-colors hover:text-foreground"
        >
          方案
        </Link>
        <Show when="signed-out">
          <SignInButton mode="modal">
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              className="rounded-full bg-accent-ink px-4 py-2 font-semibold text-lime"
            >
              登入
            </motion.button>
          </SignInButton>
        </Show>
        <Show when="signed-in">
          <Link
            href="/app"
            className="font-medium text-muted transition-colors hover:text-foreground"
          >
            工作台
          </Link>
          <UserButton />
        </Show>
      </nav>
    </motion.header>
  );
}
