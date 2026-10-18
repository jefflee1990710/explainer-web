"use client";

import type { PublicLifeCharacter } from "@/service/character/life";

// Horizontal character picker for the life page.
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
    <div className="flex gap-2 overflow-x-auto pb-1">
      {characters.map((character) => {
        const active = character.id === selectedId;
        return (
          <button
            key={character.id}
            type="button"
            onClick={() => onSelect(character.id)}
            className={`flex w-24 shrink-0 cursor-pointer flex-col items-center gap-1 rounded-2xl border p-2 text-center transition ${
              active ? "border-accent-ink bg-paper" : "border-accent-ink/10 bg-paper/70 hover:border-accent-ink/30"
            }`}
          >
            <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-accent-ink/5">
              {character.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={character.previewUrl} alt="" className="h-full w-full object-cover" />
              ) : null}
            </span>
            <span className="line-clamp-2 text-[11px] font-bold leading-tight">{character.name}</span>
          </button>
        );
      })}
    </div>
  );
}
