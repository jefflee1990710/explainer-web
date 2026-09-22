"use client";

import {
  clipEndScene,
  clipEndVo,
  clipStartScene,
  clipStartVo,
} from "@/service/director/dual-beat";
import { LANGUAGE_PRESETS } from "@/service/director/languages";
import type { ClipStoryboardInput, VoLanguage } from "@/model/project";

const fieldClass =
  "mt-1 w-full resize-y rounded-xl border border-accent-ink/15 bg-paper px-3 py-2 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60";

export function StoryboardClipRow({
  clipNumber,
  timeRange,
  draft,
  language,
  dualBeat,
  disabled,
  onChange,
}: {
  clipNumber: number;
  timeRange: string;
  draft: ClipStoryboardInput;
  language: VoLanguage;
  // 白板概念解說: start/end stills + two VO beats.
  dualBeat?: boolean;
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
        {dualBeat ? (
          <>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                起始畫面
              </span>
              <textarea
                value={draft.startScene ?? clipStartScene(draft)}
                rows={3}
                disabled={disabled}
                onChange={(event) => update("startScene", event.target.value)}
                placeholder="t=0 靜態畫面：姿勢、道具、環境。"
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                結尾畫面
              </span>
              <textarea
                value={draft.endScene ?? clipEndScene(draft)}
                rows={3}
                disabled={disabled}
                onChange={(event) => update("endScene", event.target.value)}
                placeholder="t=N 靜態畫面：同一鏡頭的後一個 beat。"
                className={fieldClass}
              />
            </label>
          </>
        ) : (
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
        )}
        <label className="block">
          <span className={dualBeat ? "text-[10px] font-semibold uppercase tracking-[0.14em] text-muted" : "sr-only"}>
            動態與鏡頭
          </span>
          <textarea
            value={draft.motionCamera}
            rows={2}
            disabled={disabled}
            onChange={(event) => update("motionCamera", event.target.value)}
            placeholder="兩張圖之間的鏡頭與動作。"
            className={`${fieldClass} text-xs text-muted`}
          />
        </label>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted md:hidden">
          旁白（{voLabel}）
        </p>
        {dualBeat ? (
          <>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                旁白（起）
              </span>
              <textarea
                value={draft.startVo ?? clipStartVo(draft)}
                rows={3}
                disabled={disabled}
                onChange={(event) => update("startVo", event.target.value)}
                placeholder={`${voLabel} 前半句，起始字幕。`}
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                旁白（終）
              </span>
              <textarea
                value={draft.endVo ?? clipEndVo(draft)}
                rows={3}
                disabled={disabled}
                onChange={(event) => update("endVo", event.target.value)}
                placeholder={`${voLabel} 後半句，結尾字幕。`}
                className={fieldClass}
              />
            </label>
          </>
        ) : (
          <label className="block">
            <span className="sr-only">旁白（{voLabel}）</span>
            <textarea
              value={draft.englishVo}
              rows={6}
              disabled={disabled}
              onChange={(event) => update("englishVo", event.target.value)}
              placeholder={`${voLabel} 旁白逐字稿。`}
              className={fieldClass}
            />
          </label>
        )}
      </div>
    </li>
  );
}
