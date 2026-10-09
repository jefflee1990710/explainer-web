"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import type { CoverageNeed, ReferenceCoverage } from "@/service/character/reference-coverage";

// Guideline copy per missing shot, in the order the user should take them.
const NEED_KEYS: Record<CoverageNeed, { title: string; body: string }> = {
  frontFace: { title: "characters.coverageFrontFaceTitle", body: "characters.coverageFrontFaceBody" },
  clearCloseup: { title: "characters.coverageCloseupTitle", body: "characters.coverageCloseupBody" },
  sideFace: { title: "characters.coverageSideFaceTitle", body: "characters.coverageSideFaceBody" },
  fullBody: { title: "characters.coverageFullBodyTitle", body: "characters.coverageFullBodyBody" },
};

const WARNING_KEYS: Record<ReferenceCoverage["warnings"][number]["reason"], string> = {
  blurry: "characters.coverageWarnBlurry",
  dark: "characters.coverageWarnDark",
  occluded: "characters.coverageWarnOccluded",
  multiplePeople: "characters.coverageWarnMultiple",
  noFace: "characters.coverageWarnNoFace",
};

// Shown after the AI reads the uploads and finds gaps. The user can add more
// photos (or open the camera) or skip and generate with what is there.
export function ReferenceCoveragePanel({
  coverage,
  disabled,
  onAddMore,
  onOpenCamera,
  onSkip,
}: {
  coverage: ReferenceCoverage;
  disabled: boolean;
  onAddMore: () => void;
  onOpenCamera?: () => void;
  onSkip: () => void;
}) {
  const { t } = useI18n();
  const missing = coverage.missing.map((need) => ({ need, ...NEED_KEYS[need] }));
  return (
    <section
      role="status"
      aria-live="polite"
      className="rounded-2xl border border-accent/30 bg-accent/5 px-4 py-4"
    >
      <h3 className="text-sm font-bold">{t("characters.coverageTitle")}</h3>
      <p className="mt-1 text-xs leading-5 text-muted">{t("characters.coverageIntro")}</p>

      {missing.length ? (
        <ol className="mt-3 space-y-2">
          {missing.map((item, index) => (
            <li key={item.need} className="flex gap-3 rounded-xl border border-accent-ink/10 bg-paper px-3 py-2">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-ink text-[11px] font-bold text-paper">
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{t(item.title)}</span>
                <span className="block text-xs leading-5 text-muted">{t(item.body)}</span>
              </span>
            </li>
          ))}
        </ol>
      ) : null}

      {coverage.warnings.length ? (
        <ul className="mt-3 space-y-1 text-xs text-muted">
          {coverage.warnings.map((warning) => (
            <li key={`${warning.index}-${warning.reason}`}>
              {t("characters.coverageWarnPrefix", { n: warning.index })} {t(WARNING_KEYS[warning.reason])}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onAddMore}
          disabled={disabled}
          className="inline-flex min-h-[40px] cursor-pointer items-center rounded-full bg-accent-ink px-4 text-sm font-semibold text-lime transition hover:-translate-y-0.5 disabled:opacity-60"
        >
          {t("characters.coverageAddMore")}
        </button>
        {onOpenCamera ? (
          <button
            type="button"
            onClick={onOpenCamera}
            disabled={disabled}
            className="inline-flex min-h-[40px] cursor-pointer items-center rounded-full border border-accent-ink/15 bg-paper px-4 text-sm font-semibold transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            {t("characters.coverageUseCamera")}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onSkip}
          disabled={disabled}
          className="inline-flex min-h-[40px] cursor-pointer items-center rounded-full px-3 text-sm font-semibold text-muted transition hover:text-foreground disabled:opacity-60"
        >
          {t("characters.coverageSkip")}
        </button>
      </div>
    </section>
  );
}
