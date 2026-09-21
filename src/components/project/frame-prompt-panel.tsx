"use client";

import { SCENE_TEXT_PRESETS } from "@/lib/director/scene-text";
import type { ClipFrame, SceneTextLanguage } from "@/types/project";

const POSITION_LABEL = { start: "起始", end: "結尾" } as const;

// Pull the scene-text block from a stored frame prompt for quick inspection.
export function sceneTextPromptSummary(prompt: string) {
  if (/MANDATORY ON-CANVAS TEXT/.test(prompt)) {
    const match = prompt.match(
      /Exact text to render \(only writing allowed in the image\): "([^"]*)"/,
    );
    return {
      mode: "on" as const,
      quoted: match?.[1] ?? "",
    };
  }
  if (/No on-canvas text/.test(prompt)) {
    return { mode: "off" as const, quoted: "" };
  }
  return { mode: "unknown" as const, quoted: "" };
}

export function FramePromptPanel({
  sceneTextEnabled,
  sceneTextLanguage,
  voiceoverLine,
  frames,
}: {
  sceneTextEnabled: boolean;
  sceneTextLanguage: SceneTextLanguage;
  voiceoverLine?: string;
  frames: Array<ClipFrame | undefined>;
}) {
  const rows = frames.filter((frame): frame is ClipFrame => Boolean(frame?.prompt?.trim()));
  if (rows.length === 0) return null;

  const langLabel = SCENE_TEXT_PRESETS[sceneTextLanguage].label;

  return (
    <div className="mt-3 space-y-2 rounded-2xl border border-accent-ink/10 bg-paper/90 p-3">
      <p className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        產圖 Prompt（畫面文字）
      </p>
      <p className="text-[11px] leading-5 text-muted">
        專案設定：
        {sceneTextEnabled ? (
          <>
            {" "}
            <strong className="text-foreground">開啟</strong> · {langLabel}
            {voiceoverLine?.trim() ? (
              <>
                {" "}
                — 應畫上旁白：「
                <span className="text-foreground">{voiceoverLine.trim()}</span>」
              </>
            ) : null}
          </>
        ) : (
          <>
            {" "}
            <strong className="text-foreground">關閉</strong> — prompt 要求畫面完全無字
          </>
        )}
      </p>
      {rows.map((frame) => {
        const summary = sceneTextPromptSummary(frame.prompt);
        const stale =
          (sceneTextEnabled && summary.mode !== "on") ||
          (!sceneTextEnabled && summary.mode === "on");
        return (
          <details key={`${frame.clipNumber}:${frame.position}`} className="group text-xs">
            <summary className="cursor-pointer list-none font-semibold text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="underline-offset-2 group-open:underline">
                {POSITION_LABEL[frame.position]}畫格 ·{" "}
                {summary.mode === "on"
                  ? `含旁白文字${summary.quoted ? `「${summary.quoted.slice(0, 48)}${summary.quoted.length > 48 ? "…" : ""}」` : ""}`
                  : summary.mode === "off"
                    ? "禁止畫面文字"
                    : "未辨識畫面文字區塊"}
                {stale ? (
                  <span className="ml-1 font-medium text-accent">（與目前開關不一致，請重畫）</span>
                ) : null}
              </span>
            </summary>
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-xl border border-accent-ink/10 bg-paper p-3 text-[10px] leading-5 text-muted">
              {frame.prompt}
            </pre>
          </details>
        );
      })}
    </div>
  );
}
