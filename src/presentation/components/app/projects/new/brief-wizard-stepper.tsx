"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import {
  BRIEF_WIZARD_STEPS,
  type BriefWizardStepIndex,
} from "@/presentation/components/app/projects/new/brief-wizard-steps";

// Top 3-step progress bar for the create-video brief wizard.
export function BriefWizardStepper({
  currentStep,
  maxReachableStep,
  disabled,
  summaries,
  onSelectStep,
}: {
  currentStep: BriefWizardStepIndex;
  maxReachableStep: BriefWizardStepIndex;
  disabled?: boolean;
  summaries?: Partial<Record<BriefWizardStepIndex, string>>;
  onSelectStep: (step: BriefWizardStepIndex) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="border-b border-accent-ink/10 pb-5">
      <ol
        className="grid grid-cols-3 gap-2 sm:gap-3"
        aria-label={t("brief.wizard.stepCount", {
          current: currentStep + 1,
          total: BRIEF_WIZARD_STEPS.length,
        })}
      >
        {BRIEF_WIZARD_STEPS.map((step) => {
          const isCurrent = step.index === currentStep;
          const isDone = step.index < currentStep;
          const clickable = !disabled && step.index <= maxReachableStep;
          const title = t(step.titleKey);
          const subtitle = summaries?.[step.index] || t(step.subtitleKey);

          return (
            <li key={step.id} className="min-w-0">
              <button
                type="button"
                disabled={!clickable}
                onClick={() => onSelectStep(step.index)}
                aria-current={isCurrent ? "step" : undefined}
                className={`flex w-full min-h-[56px] items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition ${
                  isCurrent
                    ? "border-accent-ink bg-lime/35 shadow-[3px_3px_0_0_#12141c]"
                    : isDone
                      ? "border-teal/40 bg-paper/80 hover:border-teal"
                      : "border-accent-ink/10 bg-paper/40"
                } ${
                  clickable
                    ? "cursor-pointer hover:-translate-y-0.5"
                    : "cursor-not-allowed opacity-60"
                }`}
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border font-display text-xs font-bold transition-colors ${
                    isDone
                      ? "border-teal bg-teal text-white"
                      : isCurrent
                        ? "border-accent-ink bg-accent-ink text-lime"
                        : "border-accent-ink/15 bg-paper text-muted"
                  }`}
                >
                  {isDone ? <CheckIcon /> : step.number}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate font-display text-xs font-bold sm:text-sm ${
                      isCurrent || isDone ? "text-foreground" : "text-muted"
                    }`}
                  >
                    {title}
                  </span>
                  <span className="hidden truncate text-[11px] text-muted sm:block">
                    {subtitle}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// Checkmark icon for completed wizard steps.
function CheckIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="m5 12 5 5L20 7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
