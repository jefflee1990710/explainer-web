"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Spinner } from "@/components/spinner";
import type { PublicCharacter } from "@/lib/serialize";

const ease = [0.22, 1, 0.36, 1] as const;

// Library card: default blueprint, name, style, version count, generation state.
export function CharacterCard({ character }: { character: PublicCharacter }) {
  const href = `/app/characters/${character.id}`;
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease }}
      whileHover={{ y: -3 }}
      className={`group flex flex-col overflow-hidden rounded-[1.25rem] border bg-paper/85 shadow-[4px_4px_0_0_rgba(18,20,28,0.06)] transition-shadow hover:shadow-[6px_6px_0_0_rgba(198,242,75,0.55)] ${
        character.failed ? "border-accent/40" : "border-accent-ink/10"
      }`}
    >
      <Link href={href} className="relative block aspect-video overflow-hidden bg-white">
        {character.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={character.previewUrl}
            alt={`${character.name} 藍圖`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="studio-grid grid h-full w-full place-items-center">
            <span className="h-9 w-16 rounded-md border-2 border-dashed border-accent-ink/25" />
          </div>
        )}
        {character.pending ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-sky/30 bg-sky/15 px-2.5 py-1 text-xs font-semibold text-[#1f4fb8]">
            <Spinner className="h-3 w-3" />
            生成中
          </span>
        ) : character.failed ? (
          <span className="absolute left-3 top-3 rounded-full border border-accent/30 bg-accent/12 px-2.5 py-1 text-xs font-semibold text-accent">
            失敗
          </span>
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link href={href} className="min-w-0">
          <h3 className="font-display line-clamp-1 text-base font-bold">{character.name}</h3>
        </Link>
        <p className="mt-auto text-xs text-muted">
          {character.styleName} · {character.versions.length} 個版本
        </p>
      </div>
    </motion.article>
  );
}
