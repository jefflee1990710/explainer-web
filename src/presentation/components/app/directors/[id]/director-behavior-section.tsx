"use client";

import type { IDirectorBehavior } from "@/model/director";
import { useI18n } from "@/presentation/components/i18n-provider";
import {
  DEFAULT_CUSTOM_DIRECTOR_BEHAVIOR,
  normalizeDirectorBehavior,
} from "@/service/director/compile-director-prompts";
import { emptyPerformance } from "@/service/director/performance";
import type { PerformanceSlots } from "@/model/director-performance";

export function DirectorBehaviorSection({
  behavior,
  editable,
  onChangeBehavior,
}: {
  behavior?: IDirectorBehavior;
  editable: boolean;
  onChangeBehavior?: (
    next: IDirectorBehavior,
    defaultPerformance?: PerformanceSlots,
  ) => void;
}) {
  const { locale } = useI18n();
  const isZh = locale.startsWith("zh");
  const current = normalizeDirectorBehavior(behavior, DEFAULT_CUSTOM_DIRECTOR_BEHAVIOR);

  function update(patch: Partial<IDirectorBehavior>) {
    if (!editable || !onChangeBehavior) return;
    const next = normalizeDirectorBehavior({ ...current, ...patch }, current);
    const needsPerf =
      next.speechMode === "lip-sync" ? emptyPerformance() : undefined;
    onChangeBehavior(next, needsPerf);
  }

  return (
    <div className="mb-3 space-y-3 rounded-xl border border-accent-ink/12 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-foreground">
            {isZh ? "核心拍攝與 Pipeline 行為設定" : "Shooting & Pipeline Behavior"}
          </h2>
          <p className="mt-0.5 text-[11px] text-muted">
            {isZh
              ? "獨立儲存於此導演，修改系統內置導演不會影響你的設定"
              : "Stored independently on this director — isolated from built-in changes"}
          </p>
        </div>
        <span className="rounded-full bg-lime px-2 py-0.5 text-[10px] font-bold text-accent-ink">
          IDirector
        </span>
      </div>

      {/* 1. Speech Mode */}
      <div>
        <span className="mb-1 block text-[11px] font-semibold text-foreground">
          {isZh ? "發聲與表演模式 (speechMode)" : "Voice & Speech Mode"}
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              {
                id: "lip-sync",
                labelZh: "對嘴講話",
                labelEn: "On-Cam Lip-Sync",
              },
              {
                id: "narrator",
                labelZh: "畫外音旁白",
                labelEn: "Narrator VO",
              },
              {
                id: "silent",
                labelZh: "純視覺無對白",
                labelEn: "Silent / Foley",
              },
            ] as const
          ).map((opt) => {
            const active = current.speechMode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={!editable}
                onClick={() =>
                  update({
                    speechMode: opt.id,
                    ...(opt.id !== "lip-sync" ? { audioFirstLipSync: false } : {}),
                  })
                }
                className={`cursor-pointer rounded-lg border px-2 py-1.5 text-center text-[11px] font-semibold transition disabled:cursor-default ${
                  active
                    ? "border-accent-ink bg-accent-ink text-lime shadow-xs"
                    : "border-accent-ink/15 bg-paper text-foreground hover:bg-accent-ink/5"
                }`}
              >
                {isZh ? opt.labelZh : opt.labelEn}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Lip-Sync Engine (when speechMode === "lip-sync") */}
      {current.speechMode === "lip-sync" ? (
        <div>
          <span className="mb-1 block text-[11px] font-semibold text-foreground">
            {isZh ? "對嘴影片引擎 (Lip-Sync Engine)" : "Lip-Sync Engine"}
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              disabled={!editable}
              onClick={() =>
                update({
                  audioFirstLipSync: true,
                  requiresSpokenScript: true,
                  keyframeMode: "end-is-next-start",
                })
              }
              className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-left text-[11px] font-semibold transition disabled:cursor-default ${
                current.audioFirstLipSync
                  ? "border-accent-ink bg-accent-ink text-lime"
                  : "border-accent-ink/15 bg-paper text-foreground hover:bg-accent-ink/5"
              }`}
            >
              <div>{isZh ? "單一長鏡對嘴 (HeyGen 120s)" : "Single-Clip Avatar IV (120s)"}</div>
              <div className="mt-0.5 text-[10px] opacity-80">
                {isZh ? "適合對鏡讀稿／單鏡到底" : "Best for direct talking-head"}
              </div>
            </button>
            <button
              type="button"
              disabled={!editable}
              onClick={() => update({ audioFirstLipSync: false })}
              className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-left text-[11px] font-semibold transition disabled:cursor-default ${
                !current.audioFirstLipSync
                  ? "border-accent-ink bg-accent-ink text-lime"
                  : "border-accent-ink/15 bg-paper text-foreground hover:bg-accent-ink/5"
              }`}
            >
              <div>{isZh ? "多段分鏡／專訪穿插 B-Roll" : "Multi-Clip / A+B Roll"}</div>
              <div className="mt-0.5 text-[10px] opacity-80">
                {isZh ? "適合雜誌專訪、劇情與多鏡切換" : "Best for interviews & multi-shot"}
              </div>
            </button>
          </div>
        </div>
      ) : null}

      {/* 3. Cast Count & Keyframe Mode */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="mb-1 block text-[11px] font-semibold text-foreground">
            {isZh ? "所需角色人數" : "Required Cast"}
          </span>
          <div className="grid grid-cols-2 gap-1">
            {([1, 2] as const).map((n) => (
              <button
                key={n}
                type="button"
                disabled={!editable}
                onClick={() => update({ requiredCastCount: n })}
                className={`cursor-pointer rounded-lg border px-2 py-1 text-[11px] font-semibold transition disabled:cursor-default ${
                  current.requiredCastCount === n
                    ? "border-accent-ink bg-accent-ink text-lime"
                    : "border-accent-ink/15 bg-paper text-foreground"
                }`}
              >
                {isZh ? `${n} 位角色` : `${n} Cast`}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-1 block text-[11px] font-semibold text-foreground">
            {isZh ? "畫格模式 (Keyframes)" : "Keyframe Mode"}
          </span>
          <div className="grid grid-cols-2 gap-1">
            {(
              [
                { id: "start-only", labelZh: "只畫首幀", labelEn: "Start Only" },
                { id: "end-is-next-start", labelZh: "首尾連貫", labelEn: "Chained" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={!editable}
                onClick={() => update({ keyframeMode: opt.id })}
                className={`cursor-pointer rounded-lg border px-2 py-1 text-[11px] font-semibold transition disabled:cursor-default ${
                  current.keyframeMode === opt.id
                    ? "border-accent-ink bg-accent-ink text-lime"
                    : "border-accent-ink/15 bg-paper text-foreground"
                }`}
              >
                {isZh ? opt.labelZh : opt.labelEn}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Pipeline Feature Checkboxes */}
      <div className="grid grid-cols-2 gap-1.5 pt-1">
        {(
          [
            {
              key: "wardrobeBuild",
              labelZh: "衣服參考圖換裝 (Lookbook)",
              labelEn: "Wardrobe Lookbook Mode",
            },
            {
              key: "dualBeat",
              labelZh: "每段兩拍雙節拍 (Dual-Beat)",
              labelEn: "Dual-Beat Storyboard",
            },
            {
              key: "chainsClipStarts",
              labelZh: "動作接續上一段結尾",
              labelEn: "Chain Clip Starts",
            },
            {
              key: "anchorsFramesToFirstClip",
              labelZh: "鎖定第一鏡房間背景",
              labelEn: "Lock Room to Clip 1",
            },
            {
              key: "requiresSpokenScript",
              labelZh: "顯示逐字講稿輸入欄",
              labelEn: "Require Spoken Script",
            },
            {
              key: "allowsBrandLogoUpload",
              labelZh: "支援上傳品牌 Logo",
              labelEn: "Allow Brand Logo",
            },
          ] as const
        ).map((toggle) => {
          const checked = Boolean(current[toggle.key]);
          return (
            <label
              key={toggle.key}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition ${
                editable ? "cursor-pointer" : "cursor-default opacity-80"
              } ${
                checked
                  ? "border-accent-ink/35 bg-lime/15 text-foreground"
                  : "border-accent-ink/10 bg-paper text-muted"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={!editable}
                onChange={(e) => update({ [toggle.key]: e.target.checked })}
                className="h-3.5 w-3.5 accent-[#12141c]"
              />
              <span className="truncate">{isZh ? toggle.labelZh : toggle.labelEn}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
