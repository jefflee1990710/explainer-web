"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicLifeCharacter } from "@/service/character/life";

// Top-left character picker. The closed control shows the selected face; the list shows every face.
export function LifeCharacterMenu({
  characters,
  selectedId,
  onSelect,
}: {
  characters: PublicLifeCharacter[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const { t } = useI18n();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const current = characters.find((item) => item.id === selectedId) || characters[0];

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!current) return null;

  function pick(id: string) {
    setOpen(false);
    if (id !== current?.id) onSelect(id);
  }

  return (
    <div ref={rootRef} className={`relative min-w-0 ${open ? "z-30" : ""}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={t("life.character")}
        onClick={() => setOpen((value) => !value)}
        className="flex h-11 max-w-[min(18rem,calc(100vw-9rem))] cursor-pointer items-center gap-2.5 rounded-xl border border-accent-ink/15 bg-paper pr-3 pl-1.5 text-left transition hover:border-accent-ink/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <CharacterThumb src={current.previewUrl} />
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
            {t("life.character")}
          </span>
          <span className="block truncate text-sm font-bold">{current.name}</span>
        </span>
        <svg
          viewBox="0 0 16 16"
          className={`h-3.5 w-3.5 shrink-0 text-muted transition ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden
        >
          <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={t("life.character")}
          className="absolute left-0 z-30 mt-2 max-h-96 w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-accent-ink/15 bg-paper p-1 shadow-[4px_4px_0_0_rgba(18,20,28,0.08)]"
        >
          {characters.map((item) => {
            const active = item.id === current.id;
            const city = item.persona?.city;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => pick(item.id)}
                  className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg p-1.5 text-left ${
                    active ? "bg-accent-ink text-paper" : "hover:bg-accent-ink/5"
                  }`}
                >
                  <CharacterThumb src={item.previewUrl} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{item.name}</span>
                    {city ? (
                      <span className={`block truncate text-[11px] ${active ? "text-paper/75" : "text-muted"}`}>
                        {city}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function CharacterThumb({ src }: { src?: string | null }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className="h-8 w-8 shrink-0 rounded-lg border border-accent-ink/10 bg-white object-cover object-top"
    />
  ) : (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-zinc-200 text-xs text-muted">—</span>
  );
}
