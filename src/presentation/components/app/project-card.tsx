"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { StatusBadge } from "@/presentation/components/project/status-badge";
import type { PublicFolder } from "@/presentation/serialize";

const ease = [0.22, 1, 0.36, 1] as const;

// Folder card: cover from child preview, roll-up badge, video count.
export function ProjectCard({ folder }: { folder: PublicFolder }) {
  const href = `/app/projects/${folder.id}`;
  const failed = folder.status === "failed";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.18 } }}
      transition={{ duration: 0.35, ease }}
      className={`studio-card group flex flex-col overflow-hidden border bg-white ${
        failed ? "border-[#f04444]" : "border-[var(--studio-line)]"
      }`}
    >
      <Link href={href} className="relative block aspect-video overflow-hidden bg-accent-ink/5">
        {folder.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={folder.previewUrl}
            alt={`${folder.name} 預覽`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <Placeholder />
        )}
        <StatusBadge status={folder.status} className="absolute left-3 top-3 shadow-sm" />
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <Link href={href} className="min-w-0">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug">
            {folder.name}
          </h3>
        </Link>
        <p className="mt-auto text-xs text-muted">{folder.videoCount} 支影片</p>
      </div>
    </motion.article>
  );
}

// Empty-folder art that hints at a 16:9 video frame.
function Placeholder() {
  return (
    <div className="studio-grid grid h-full w-full place-items-center">
      <span className="h-9 w-16 rounded-md border-2 border-dashed border-accent-ink/25" />
    </div>
  );
}
