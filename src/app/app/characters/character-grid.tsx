"use client";

import { MotionConfig, motion } from "framer-motion";
import type { PublicCharacter, PublicStyle } from "@/lib/serialize";
import { CharacterCard } from "./character-card";
import { CreateCharacterButton } from "./create-character-modal";

export function CharacterGrid({
  characters,
  credits,
  subscribed,
  styles,
}: {
  characters: PublicCharacter[];
  credits: number;
  subscribed: boolean;
  // Passed through to the empty-state create button's style picker.
  styles: PublicStyle[];
}) {
  if (characters.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-accent-ink/20 bg-paper/60 p-10 text-center">
        <p className="font-display text-lg font-bold">還沒有角色</p>
        <p className="mt-2 text-sm text-muted">
          先建立一個角色藍圖，之後每支影片都能重複使用同一個角色。
        </p>
        <CreateCharacterButton
          credits={credits}
          subscribed={subscribed}
          styles={styles}
          className="mt-5 inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5"
        />
      </div>
    );
  }
  return (
    <MotionConfig reducedMotion="user">
      <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {characters.map((character) => (
          <CharacterCard key={character.id} character={character} />
        ))}
      </motion.div>
    </MotionConfig>
  );
}
