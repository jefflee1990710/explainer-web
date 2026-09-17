"use client";

import { Spinner } from "@/components/spinner";
import type { PublicCharacter, PublicCharacterVersion } from "@/lib/serialize";

const STATUS_LABEL: Record<PublicCharacterVersion["status"], string> = {
  queued: "排隊中",
  in_progress: "生成中",
  completed: "完成",
  failed: "失敗",
};

// Left pane: every version newest first; the default is badged.
export function VersionList({
  character,
  selectedId,
  onSelect,
}: {
  character: PublicCharacter;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-3 shadow-[4px_4px_0_0_rgba(18,20,28,0.06)]">
      <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        版本
      </p>
      <ul className="space-y-1">
        {character.versions.map((version) => {
          const selected = version.id === selectedId;
          const isDefault = version.id === character.defaultVersionId;
          const busy = version.status === "queued" || version.status === "in_progress";
          return (
            <li key={version.id}>
              <button
                type="button"
                onClick={() => onSelect(version.id)}
                aria-current={selected ? "true" : undefined}
                className={`flex min-h-[44px] w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-left transition ${
                  selected ? "bg-accent-ink/5" : "hover:bg-accent-ink/5"
                }`}
              >
                {version.blueprintUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={version.blueprintUrl}
                    alt=""
                    width={72}
                    height={40}
                    className="h-10 w-[72px] shrink-0 rounded-md border border-accent-ink/10 bg-white object-cover"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="grid h-10 w-[72px] shrink-0 place-items-center rounded-md border border-dashed border-accent-ink/20 bg-accent-ink/5"
                  >
                    {busy ? <Spinner className="h-4 w-4" /> : <span className="h-4 w-7 rounded-sm border border-accent-ink/25" />}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    v{version.number}
                    {isDefault ? (
                      <span className="rounded-full bg-lime px-2 py-0.5 text-[10px] font-bold">
                        預設
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={`block text-xs ${
                      version.status === "failed" ? "text-accent" : "text-muted"
                    }`}
                  >
                    {STATUS_LABEL[version.status]}
                    {version.parentNumber ? ` · 由 v${version.parentNumber} 編輯` : ""}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
