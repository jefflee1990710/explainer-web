"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { castPickStatus } from "@/presentation/components/app/projects/[id]/cast-pick-status";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicCharacter } from "@/presentation/serialize";
import { localizedStyleName } from "@/util/style-i18n";

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
  const { t } = useI18n();
  const anyReady = characters.some((character) => character.previewUrl);
  const ready = characters.filter(
    (character) => character.previewUrl && (!styleId || character.styleId === styleId),
  );

  if (ready.length === 0 || (required > 0 && ready.length < required)) {
    return (
      <p className="text-sm font-medium text-accent">
        {required > 0
          ? t("brief.castPicker.errorRequiredCount", { required, ready: ready.length })
          : anyReady
            ? t("brief.castPicker.errorNoStyleCharacters")
            : t("brief.castPicker.errorNone")}
        <Link href="/app/characters" className="ml-1 font-semibold underline underline-offset-4">
          {t("brief.castPicker.linkCreate")}
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

  const pick = castPickStatus(value.length, required, max, t);

  return (
    <div>
      <div
        role="group"
        aria-label={t("brief.castPicker.aria")}
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
                  {localizedStyleName(character.styleId)}
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>
      <p className={`mt-2 text-xs ${pick.ok ? "text-muted" : "font-medium text-accent"}`}>
        {pick.text}
        <Link href="/app/characters" className="ml-1 underline underline-offset-4">
          {t("brief.castPicker.linkManage")}
        </Link>
      </p>
    </div>
  );
}
