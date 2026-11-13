"use client";

import type { DurationPreset } from "@/model/project";
import { DirectorDockPill } from "@/presentation/components/app/director-dock/director-dock-composer";
import { cycleOption } from "@/presentation/components/app/director-dock/director-dock-config";

const LENGTH_OPTIONS = ["auto", "micro", "short", "punchy", "full"] as const satisfies readonly DurationPreset[];

// Short film totals. One-take is one shot, so its steps are the exact clip lengths.
const LENGTH_LABEL: Record<"story" | "one-take", Record<(typeof LENGTH_OPTIONS)[number], string>> = {
  story: { auto: "Auto", micro: "8s", short: "20s", punchy: "45s", full: "60s" },
  "one-take": { auto: "Auto", micro: "6s", short: "18s", punchy: "36s", full: "60s" },
};

// Dock control for a short film's total length. 60s is the longest step.
export function DirectorDockStoryLengthPill({
  preset,
  kind,
  locale,
  disabled,
  onChange,
}: {
  preset: DurationPreset;
  kind: "story" | "one-take";
  locale: string;
  disabled?: boolean;
  onChange: (preset: DurationPreset) => void;
}) {
  const current = LENGTH_OPTIONS.includes(preset as (typeof LENGTH_OPTIONS)[number])
    ? (preset as (typeof LENGTH_OPTIONS)[number])
    : "auto";
  const seconds = LENGTH_LABEL[kind][current];
  const label = current === "auto" && locale !== "en" ? "自動" : seconds;
  const title =
    locale === "en"
      ? "Film length, up to 1 minute"
      : "片長，最長 1 分鐘";

  return (
    <DirectorDockPill
      title={title}
      disabled={disabled}
      label={label}
      onClick={() => onChange(cycleOption(LENGTH_OPTIONS, current, 1))}
      icon={
        <svg
          aria-hidden="true"
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6l4 2" />
        </svg>
      }
    />
  );
}
