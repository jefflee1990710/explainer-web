"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { sceneTextLangLabel } from "@/util/i18n/picker-labels";
import type { ClipFrame, SceneTextLanguage } from "@/model/project";

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
  const { t } = useI18n();
  const rows = frames.filter((frame): frame is ClipFrame => Boolean(frame?.prompt?.trim()));
  if (rows.length === 0) return null;

  const langLabel = sceneTextLangLabel(t, sceneTextLanguage).label;

  return (
    <div className="mt-3 space-y-2 rounded-2xl border border-accent-ink/10 bg-paper/90 p-3">
      <p className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        {t("production.debug.promptTitle")}
      </p>
      <p className="text-[11px] leading-5 text-muted">
        {t("production.debug.projectSetting")}
        {sceneTextEnabled ? (
          <>
            {" "}
            <strong className="text-foreground">{t("production.sceneText.on")}</strong> · {langLabel}
            {voiceoverLine?.trim() ? (
              <>
                {t("production.sceneText.onWithVo", { line: voiceoverLine.trim() })}
              </>
            ) : null}
          </>
        ) : (
          <>
            {" "}
            <strong className="text-foreground">{t("production.sceneText.off")}</strong>
            {t("production.sceneText.offHint")}
          </>
        )}
      </p>
      {rows.map((frame) => {
        const summary = sceneTextPromptSummary(frame.prompt);
        const pos = t(`production.frame.position.${frame.position}`);
        const quotedShort = summary.quoted
          ? `${summary.quoted.slice(0, 48)}${summary.quoted.length > 48 ? "…" : ""}`
          : "";
        const line =
          summary.mode === "on"
            ? t("production.debug.frameSummaryOn", { position: pos, quoted: quotedShort })
            : summary.mode === "off"
              ? `${t("production.frame.alt", { position: pos })} · ${t("production.debug.frameSummaryOff")}`
              : `${t("production.frame.alt", { position: pos })} · ${t("production.debug.frameSummaryUnknown")}`;
        const stale =
          (sceneTextEnabled && summary.mode !== "on") ||
          (!sceneTextEnabled && summary.mode === "on");
        return (
          <details key={`${frame.clipNumber}:${frame.position}`} className="group text-xs">
            <summary className="cursor-pointer list-none font-semibold text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="underline-offset-2 group-open:underline">
                {line}
                {stale ? (
                  <span className="ml-1 font-medium text-accent">{t("production.debug.staleSceneText")}</span>
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
