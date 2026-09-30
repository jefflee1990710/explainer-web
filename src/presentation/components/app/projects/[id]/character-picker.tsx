"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { castPickStatus } from "@/presentation/components/app/projects/[id]/cast-pick-status";
import type { PublicCharacter } from "@/presentation/serialize";

// Multi-select of characters with a completed default blueprint. When a video
// `styleId` is given, characters drawn in another style are hidden.
export function CharacterPicker({
  characters,
  styleId,
  value,
  onChange,
  disabled,
  max = 4,
  required = 0,
}: {
  characters: PublicCharacter[];
  styleId?: string;
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  max?: number;
  required?: number;
}) {
  const anyReady = characters.some((character) => character.previewUrl);
  const ready = characters.filter(
    (character) => character.previewUrl && (!styleId || character.styleId === styleId),
  );

  if (ready.length === 0 || (required > 0 && ready.length < required)) {
    return (
      <p className="text-sm font-medium text-accent">
        {required > 0
          ? `這個導演必須正好選 ${required} 個角色。這個風格目前只有 ${ready.length} 個可用。`
          : anyReady
            ? "這個風格還沒有角色。"
            : "還沒有可用的角色。"}
        <Link href="/app/characters" className="ml-1 font-semibold underline underline-offset-4">
          先到角色庫建立 →
        </Link>
      </p>
    );
  }

  function toggle(id: string) {
    const character = ready.find((item) => item.id === id);
    if (!character) return;
    if (value.includes(id)) {
      onChange(value.filter((item) => item !== id));
    } else if (value.length < max) {
      onChange([...value, id]);
    }
  }

  const pick = castPickStatus(value.length, required, max);

  return (
    <div>
      <div
        role="group"
        aria-label="角色"
        aria-required={required > 0}
        className="grid gap-2 sm:grid-cols-2"
      >
        {ready.map((character) => {
          const active = value.includes(character.id);
          const full = !active && value.length >= max;
          return (
            <motion.button
              key={character.id}
              type="button"
              role="checkbox"
              aria-checked={active}
              disabled={disabled || full}
              onClick={() => toggle(character.id)}
              whileTap={{ scale: 0.98 }}
              className={`flex min-h-[5.5rem] cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 ${
                active
                  ? "border-accent-ink bg-accent-ink text-paper"
                  : "border-accent-ink/10 bg-paper/70 hover:border-accent-ink/30"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={character.previewUrl!}
                alt=""
                width={128}
                height={80}
                className="h-20 w-32 shrink-0 rounded-lg border border-accent-ink/10 bg-white object-contain object-left"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{character.name}</span>
                <span className={`block text-xs ${active ? "text-paper/75" : "text-muted"}`}>
                  {character.styleName}
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>
      <p className={`mt-2 text-xs ${pick.ok ? "text-muted" : "font-medium text-accent"}`}>
        {pick.text}
        <Link href="/app/characters" className="ml-1 underline underline-offset-4">
          管理角色
        </Link>
      </p>
    </div>
  );
}
