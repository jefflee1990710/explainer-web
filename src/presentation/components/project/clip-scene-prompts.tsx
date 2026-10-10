"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { clipEndScene, clipEndVo, clipStartScene, clipStartVo } from "@/service/director/dual-beat";
import { LANGUAGE_PRESETS } from "@/service/director/languages";
import { skillBansNarration } from "@/service/director/skill-rules";
import type { SceneChatField, StoryboardRow, VoLanguage } from "@/model/project";

// Read-only storyboard. Edits come from the chat; the fields that turn changed are marked.
export function ClipScenePrompts({
  clip,
  language,
  dualBeat,
  skillSlug,
  highlighted = [],
}: {
  clip: StoryboardRow;
  language: VoLanguage;
  dualBeat?: boolean;
  skillSlug?: string;
  highlighted?: SceneChatField[];
}) {
  const { t } = useI18n();
  const voLabel = LANGUAGE_PRESETS[language].label;
  const spokenKind = skillBansNarration(skillSlug) ? "dialogue" : "narration";
  const spoken = (key: string, params?: Record<string, string | number>) =>
    t(`production.spoken.${spokenKind}.${key}`, params);
  const mark = (field: SceneChatField) => highlighted.includes(field);
  const sceneSummary = dualBeat
    ? t("production.scene.summaryStart", { text: clip.startScene || clipStartScene(clip) || t("production.scene.empty") })
    : clip.explainerScene || t("production.scene.empty");

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
        {dualBeat ? (
          <>
            <ReadOnlyField
              label={t("production.scene.labelStartScene")}
              value={clip.startScene || clipStartScene(clip)}
              highlighted={mark("startScene")}
              highlightLabel={t("production.sceneChat.highlight")}
            />
            <ReadOnlyField
              label={t("production.scene.labelEndScene")}
              value={clip.endScene || clipEndScene(clip)}
              highlighted={mark("endScene")}
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
        summary={clip.motionCamera || t("production.scene.empty")}
        collapsible
        open={mark("motionCamera")}
      >
        <ReadOnlyField
          label={t("production.scene.labelMotion")}
          value={clip.motionCamera}
          highlighted={mark("motionCamera")}
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
