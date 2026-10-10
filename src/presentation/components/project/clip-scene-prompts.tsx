"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { clipEndScene, clipEndVo, clipStartScene, clipStartVo } from "@/service/director/dual-beat";
import { LANGUAGE_PRESETS } from "@/service/director/languages";
import { skillBansNarration } from "@/service/director/skill-rules";
import type { StoryboardRow, VoLanguage } from "@/model/project";

// Read-only storyboard. A chat edit shows the old paragraph struck through, then the new one in green.
export function ClipScenePrompts({
  clip,
  language,
  dualBeat,
  skillSlug,
  previousVo,
  previousScene,
  previousStart,
  previousEnd,
  previousMotion,
}: {
  clip: StoryboardRow;
  language: VoLanguage;
  dualBeat?: boolean;
  skillSlug?: string;
  previousVo?: string;
  previousScene?: string;
  previousStart?: string;
  previousEnd?: string;
  previousMotion?: string;
}) {
  const { t } = useI18n();
  const voLabel = LANGUAGE_PRESETS[language].label;
  const spokenKind = skillBansNarration(skillSlug) ? "dialogue" : "narration";
  const spoken = (key: string, params?: Record<string, string | number>) =>
    t(`production.spoken.${spokenKind}.${key}`, params);
  const sceneSummary = dualBeat
    ? t("production.scene.summaryStart", { text: clip.startScene || clipStartScene(clip) || t("production.scene.empty") })
    : clip.explainerScene || t("production.scene.empty");

  return (
    <div className="flex flex-col gap-3">
      <FormSection title={spoken("section")}>
        {dualBeat ? (
          <>
            <ReadOnlyField label={spoken("startField", { lang: voLabel })} value={clip.startVo || clipStartVo(clip)} />
            <ReadOnlyField label={spoken("endField", { lang: voLabel })} value={clip.endVo || clipEndVo(clip)} />
          </>
        ) : (
          <ReadOnlyField
            label={spoken("field", { lang: voLabel })}
            value={clip.englishVo}
            previous={previousVo}
          />
        )}
      </FormSection>

      <FormSection
        title={t("production.scene.sectionScene")}
        summary={sceneSummary}
        collapsible
        open={Boolean(previousScene || previousStart || previousEnd)}
      >
        {dualBeat ? (
          <>
            <ReadOnlyField
              label={t("production.scene.labelStartScene")}
              value={clip.startScene || clipStartScene(clip)}
              previous={previousStart}
            />
            <ReadOnlyField
              label={t("production.scene.labelEndScene")}
              value={clip.endScene || clipEndScene(clip)}
              previous={previousEnd}
            />
          </>
        ) : (
          <ReadOnlyField
            label={t("production.scene.labelExplainerScene")}
            value={clip.explainerScene}
            previous={previousScene}
          />
        )}
      </FormSection>

      <FormSection
        title={t("production.scene.sectionMotion")}
        summary={clip.motionCamera || t("production.scene.empty")}
        collapsible
        open={Boolean(previousMotion)}
      >
        <ReadOnlyField
          label={t("production.scene.labelMotion")}
          value={clip.motionCamera}
          previous={previousMotion}
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
  previous,
}: {
  label: string;
  value: string;
  previous?: string;
}) {
  const changed = Boolean(previous && previous !== value);
  return (
    <div>
      <p className="text-xs font-semibold">{label}</p>
      {changed ? (
        <>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted line-through">{previous}</p>
          <p className="mt-2 whitespace-pre-wrap rounded-md bg-green-100 px-2 py-1.5 text-sm leading-6 text-green-950">
            {value}
          </p>
        </>
      ) : (
        <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{value}</p>
      )}
    </div>
  );
}
