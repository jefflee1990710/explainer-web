"use client";

import { LANGUAGE_PRESETS } from "@/lib/director/languages";
import type { ClipStoryboardInput, VoLanguage } from "@/types/project";

const fieldClass =
  "mt-1 w-full resize-y rounded-xl border border-accent-ink/15 bg-paper px-3 py-2 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60";

export function StoryboardClipRow({
  clipNumber,
  timeRange,
  draft,
  language,
  disabled,
  onChange,
}: {
  clipNumber: number;
  timeRange: string;
  draft: ClipStoryboardInput;
  language: VoLanguage;
  disabled?: boolean;
  onChange: (next: ClipStoryboardInput) => void;
}) {
  const voLabel = LANGUAGE_PRESETS[language].label;

  function update<K extends keyof ClipStoryboardInput>(key: K, value: string) {
    onChange({ ...draft, [key]: value });
  }

  return (
    <li className="grid gap-3 rounded-2xl border border-accent-ink/10 bg-paper/85 p-4 md:grid-cols-[72px_1fr_1fr]">
      <div>
        <span className="inline-flex rounded-full bg-accent-ink px-2.5 py-1 font-display text-xs font-bold text-lime">
          #{clipNumber}
        </span>
        <p className="mt-2 text-xs text-muted">{timeRange}</p>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted md:hidden">
          場景描述
        </p>
        <label className="block">
          <span className="sr-only">畫面描述</span>
          <textarea
            value={draft.explainerScene}
            rows={4}
            disabled={disabled}
            onChange={(event) => update("explainerScene", event.target.value)}
            placeholder="這段畫面要出現什麼。"
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className="sr-only">動態與鏡頭</span>
          <textarea
            value={draft.motionCamera}
            rows={2}
            disabled={disabled}
            onChange={(event) => update("motionCamera", event.target.value)}
            placeholder="鏡頭與動作。"
            className={`${fieldClass} text-xs text-muted`}
          />
        </label>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted md:hidden">
          旁白（{voLabel}）
        </p>
        <label className="block">
          <span className="sr-only">旁白（{voLabel}）</span>
          <textarea
            value={draft.englishVo}
            rows={4}
            disabled={disabled}
            onChange={(event) => update("englishVo", event.target.value)}
            placeholder={`${voLabel} 旁白逐字稿。`}
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className="sr-only">參考翻譯</span>
          <textarea
            value={draft.referenceTranslation}
            rows={2}
            disabled={disabled}
            onChange={(event) => update("referenceTranslation", event.target.value)}
            placeholder="旁白參考翻譯。"
            className={`${fieldClass} text-xs text-muted`}
          />
        </label>
      </div>
    </li>
  );
}
