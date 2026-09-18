"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { PublicCharacter } from "@/lib/serialize";

// Multi-select of characters with a completed default blueprint. When a video
// `styleId` is given, characters drawn in another style are shown but disabled.
export function CharacterPicker({
  characters,
  styleId,
  value,
  onChange,
  disabled,
  max = 4,
}: {
  characters: PublicCharacter[];
  styleId?: string;
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  max?: number;
}) {
  const ready = characters.filter((character) => character.previewUrl);

  // True when the character's style differs from the video's chosen style.
  function mismatched(character: PublicCharacter) {
    return Boolean(styleId) && character.styleId !== styleId;
  }

  if (ready.length === 0) {
    return (
      <p className="text-sm text-muted">
        還沒有可用的角色。
        <Link href="/app/characters" className="ml-1 font-semibold underline underline-offset-4">
          先到角色庫建立 →
        </Link>
      </p>
    );
  }

  function toggle(id: string) {
    const character = ready.find((item) => item.id === id);
    if (!character || mismatched(character)) return;
    if (value.includes(id)) {
      onChange(value.filter((item) => item !== id));
    } else if (value.length < max) {
      onChange([...value, id]);
    }
  }

  return (
    <div>
      <div role="group" aria-label="角色" className="grid gap-2 sm:grid-cols-2">
        {ready.map((character) => {
          const active = value.includes(character.id);
          const full = !active && value.length >= max;
          const wrongStyle = mismatched(character);
          return (
            <motion.button
              key={character.id}
              type="button"
              role="checkbox"
              aria-checked={active}
              disabled={disabled || full || wrongStyle}
              onClick={() => toggle(character.id)}
              whileTap={{ scale: 0.98 }}
              className={`flex min-h-[56px] cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 ${
                active
                  ? "border-accent-ink bg-accent-ink text-paper"
                  : "border-accent-ink/10 bg-paper/70 hover:border-accent-ink/30"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={character.previewUrl!}
                alt=""
                width={72}
                height={40}
                className="h-10 w-[72px] shrink-0 rounded-md bg-white object-cover"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{character.name}</span>
                <span className={`block text-xs ${active ? "text-paper/75" : "text-muted"}`}>
                  {character.styleName}
                </span>
              </span>
              {wrongStyle ? (
                <span className="ml-auto shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                  風格不同
                </span>
              ) : null}
            </motion.button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted">
        已選 {value.length} / {max}。
        <Link href="/app/characters" className="ml-1 underline underline-offset-4">
          管理角色
        </Link>
      </p>
    </div>
  );
}
