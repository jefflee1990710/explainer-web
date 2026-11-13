"use client";

import type { DurationPreset } from "@/model/project";
import { DirectorDockPill } from "@/presentation/components/app/director-dock/director-dock-composer";
import { cycleOption } from "@/presentation/components/app/director-dock/director-dock-config";

const LENGTH_OPTIONS = ["auto", "micro", "short", "punchy", "full"] as const satisfies readonly DurationPreset[];

export type StoryLengthKind = "story" | "one-take";

// Dock and details share these lengths. 60s is the longest step.
export function storyFilmLengthCopy(kind: StoryLengthKind, preset: DurationPreset, locale: string) {
  const zh = locale !== "en";
  const hans = locale === "zh-Hans";
  const auto = zh ? (hans ? "自动" : "自動") : "Auto";
  const second = zh ? "秒" : "s";
  const shot = zh ? (hans ? "一镜" : "一鏡") : "1 shot";
  if (kind === "one-take") {
    const seconds = preset === "micro" ? 6 : preset === "short" ? 18 : preset === "punchy" ? 36 : preset === "full" ? 60 : null;
    return seconds
      ? { label: `${seconds}${second}`, hint: shot }
      : { label: auto, hint: zh ? `6–60 ${second}` : "6–60s" };
  }
  const seconds = preset === "micro" ? 8 : preset === "short" ? 20 : preset === "punchy" ? 45 : preset === "full" ? 60 : null;
  return seconds
    ? { label: `${seconds}${second}`, hint: preset === "full" ? (zh ? (hans ? "最长 1 分钟" : "最長 1 分鐘") : "up to 1 min") : (zh ? "整片" : "whole film") }
    : { label: auto, hint: zh ? `8–60 ${second}` : "8–60s" };
}

// Dock control for a short film's total length. 60s is the longest step.
export function DirectorDockStoryLengthPill({
  preset,
  kind,
  locale,
  disabled,
  onChange,
}: {
  preset: DurationPreset;
  kind: StoryLengthKind;
  locale: string;
  disabled?: boolean;
  onChange: (preset: DurationPreset) => void;
}) {
  const current = LENGTH_OPTIONS.includes(preset as (typeof LENGTH_OPTIONS)[number])
    ? (preset as (typeof LENGTH_OPTIONS)[number])
    : "auto";
  const label = storyFilmLengthCopy(kind, current, locale).label;
  const title = locale === "en" ? "Film length, up to 1 minute" : "片長，最長 1 分鐘";

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
