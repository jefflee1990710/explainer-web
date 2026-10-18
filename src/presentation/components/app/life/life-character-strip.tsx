"use client";

import type { PublicLifeCharacter } from "@/service/character/life";

// Vertical character rail for the single-screen Life studio (also works horizontally on mobile).
export function LifeCharacterStrip({
  characters,
  selectedId,
  onSelect,
}: {
  characters: PublicLifeCharacter[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:pb-0">
      {characters.map((character) => {
        const active = character.id === selectedId;
        const city = character.persona?.city;
        return (
          <button
            key={character.id}
            type="button"
            onClick={() => onSelect(character.id)}
            className={`flex shrink-0 cursor-pointer items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition ${
              active
                ? "border-accent bg-accent/8 shadow-[2px_2px_0_0_#12141c]"
                : "border-accent-ink/10 bg-paper hover:border-accent-ink/30"
            }`}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-accent-ink/5">
              {character.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={character.previewUrl}
                  alt=""
                  className="h-full w-full object-cover object-top"
                />
              ) : null}
            </span>
            <span className="min-w-0 flex-1 pr-1">
              <span className="block truncate text-xs font-bold leading-tight text-foreground">
                {character.name}
              </span>
              {city ? (
                <span className="mt-0.5 block truncate text-[11px] font-medium text-muted">
                  {city}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
