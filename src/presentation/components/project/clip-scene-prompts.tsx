"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { clipEndScene, clipEndVo, clipStartScene, clipStartVo } from "@/service/director/dual-beat";
import { LANGUAGE_PRESETS } from "@/service/director/languages";
import { skillBansNarration } from "@/service/director/skill-rules";
import type { SceneChatField, StoryboardRow, VoLanguage } from "@/model/project";

// Read-only storyboard. When a still or clip has been sent, those sections show that prompt.
export function ClipScenePrompts({
  clip,
  language,
  dualBeat,
  skillSlug,
  highlighted = [],
  startPrompt,
  endPrompt,
  motionPrompt,
}: {
  clip: StoryboardRow;
  language: VoLanguage;
  dualBeat?: boolean;
  skillSlug?: string;
  highlighted?: SceneChatField[];
  // Exact prompts last submitted for the start still, end still, and clip video.
  startPrompt?: string;
  endPrompt?: string;
  motionPrompt?: string;
}) {
  const { t } = useI18n();
  const voLabel = LANGUAGE_PRESETS[language].label;
  const spokenKind = skillBansNarration(skillSlug) ? "dialogue" : "narration";
  const spoken = (key: string, params?: Record<string, string | number>) =>
    t(`production.spoken.${spokenKind}.${key}`, params);
  const mark = (field: SceneChatField) => highlighted.includes(field);
  const sentStart = startPrompt?.trim() || "";
  const sentEnd = endPrompt?.trim() || "";
  const sentMotion = motionPrompt?.trim() || "";
  const showSentStills = Boolean(sentStart || sentEnd);
  const startText = sentStart || clip.startScene || clipStartScene(clip);
  const endText = sentEnd || clip.endScene || clipEndScene(clip);
  const sceneSummary = showSentStills || dualBeat
    ? t("production.scene.summaryStart", { text: startText || t("production.scene.empty") })
    : clip.explainerScene || t("production.scene.empty");
  const motionText = sentMotion || clip.motionCamera;

  return (
    <div className="flex flex-col gap-3">
      <FormSection title={spoken("section")}>
        {dualBeat ? (
          <>
            <ReadOnlyField
              label={spoken("startField", { lang: voLabel })}
              value={clip.startVo || clipStartVo(clip)}
              highlighted={mark("englishVo")}
              highlightLabel={t("production.sceneChat.highlight")}
            />
            <ReadOnlyField
              label={spoken("endField", { lang: voLabel })}
              value={clip.endVo || clipEndVo(clip)}
              highlighted={mark("englishVo")}
              highlightLabel={t("production.sceneChat.highlight")}
            />
          </>
        ) : (
          <ReadOnlyField
            label={spoken("field", { lang: voLabel })}
            value={clip.englishVo}
            highlighted={mark("englishVo")}
            highlightLabel={t("production.sceneChat.highlight")}
          />
        )}
      </FormSection>

      <FormSection title={t("production.scene.sectionScene")} summary={sceneSummary} collapsible>
        {showSentStills || dualBeat ? (
          <>
            <ReadOnlyField
              label={t("production.scene.labelStartScene")}
              value={startText}
              highlighted={!sentStart && mark("startScene")}
              highlightLabel={t("production.sceneChat.highlight")}
            />
            <ReadOnlyField
              label={t("production.scene.labelEndScene")}
              value={endText}
              highlighted={!sentEnd && mark("endScene")}
              highlightLabel={t("production.sceneChat.highlight")}
            />
          </>
        ) : (
          <ReadOnlyField
            label={t("production.scene.labelExplainerScene")}
            value={clip.explainerScene}
            highlighted={mark("startScene") || mark("endScene")}
            highlightLabel={t("production.sceneChat.highlight")}
          />
        )}
      </FormSection>

      <FormSection
        title={t("production.scene.sectionMotion")}
        summary={motionText || t("production.scene.empty")}
        collapsible
        open={!sentMotion && mark("motionCamera")}
      >
        <ReadOnlyField
          label={t("production.scene.labelMotion")}
          value={motionText}
          highlighted={!sentMotion && mark("motionCamera")}
          highlightLabel={t("production.sceneChat.highlight")}
        />
      </FormSection>
    </div>
  );
}

function FormSection({
  title,
  summary,
  collapsible = false,
  open = false,
  children,
}: {
  title: string;
  summary?: string;
  collapsible?: boolean;
  open?: boolean;
  children: React.ReactNode;
}) {
  if (!collapsible) {
    return (
      <section className="flex flex-col gap-2">
        <h3 className="text-[11px] font-bold text-[var(--studio-muted)]">{title}</h3>
        {children}
      </section>
    );
  }
  return (
    <details className="group rounded-md border border-[var(--studio-line)]" {...(open ? { open: true } : {})}>
      <summary className="flex cursor-pointer list-none items-start gap-2 px-3 py-2">
        <span className="mt-0.5 text-[10px] text-[var(--studio-muted)] transition group-open:rotate-90">
          ▶
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-bold text-[var(--studio-muted)]">{title}</span>
          <span className="block truncate text-xs group-open:hidden">{summary}</span>
        </span>
      </summary>
      <div className="flex flex-col gap-2 px-3 pb-3">{children}</div>
    </details>
  );
}

function ReadOnlyField({
  label,
  value,
  highlighted,
  highlightLabel,
}: {
  label: string;
  value: string;
  highlighted: boolean;
  highlightLabel: string;
}) {
  return (
    <div
      className={
        highlighted
          ? "rounded-md bg-[color-mix(in_srgb,var(--studio-teal)_16%,white)] px-2.5 py-2 ring-1 ring-[var(--studio-teal)]"
          : ""
      }
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold">{label}</p>
        {highlighted ? (
          <span className="text-[10px] font-bold text-[var(--studio-teal)]">{highlightLabel}</span>
        ) : null}
      </div>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{value}</p>
    </div>
  );
}
