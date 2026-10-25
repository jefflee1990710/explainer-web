"use client";

import { useMemo, useState } from "react";
import {
  ACADEMY_CREATORS,
  CREATOR_CATEGORIES,
  type CreatorCategory,
} from "@/service/academy/creator-database";

// Public Creator Database on Scro Academy: filter creators by format, inspect their signature hook, and open Instagram examples.
export function AcademyCreatorDatabase({
  eyebrow,
  title,
  subtitle,
  allLabel,
  signatureHookLabel,
  stealThisLabel,
  profileLabel,
  exampleLabel,
  categoryLabels,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  allLabel: string;
  signatureHookLabel: string;
  stealThisLabel: string;
  profileLabel: string;
  exampleLabel: string;
  categoryLabels: Record<CreatorCategory, string>;
}) {
  const [category, setCategory] = useState<CreatorCategory | "all">("all");
  const creators = useMemo(
    () =>
      category === "all"
        ? ACADEMY_CREATORS
        : ACADEMY_CREATORS.filter((creator) => creator.category === category),
    [category],
  );

  return (
    <section id="creators" aria-labelledby="academy-creators-title" className="scroll-mt-28">
      <p className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">{eyebrow}</p>
      <h2
        id="academy-creators-title"
        className="mt-2 font-display text-2xl font-bold tracking-tight text-zinc-900"
      >
        {title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600">{subtitle}</p>
      <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label={title}>
        <CategoryChip
          active={category === "all"}
          label={allLabel}
          onSelect={() => setCategory("all")}
        />
        {CREATOR_CATEGORIES.map((item) => (
          <CategoryChip
            key={item}
            active={category === item}
            label={categoryLabels[item]}
            onSelect={() => setCategory(item)}
          />
        ))}
      </div>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {creators.map((creator) => (
          <li
            key={creator.id}
            className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5c6170]">
                {categoryLabels[creator.category]}
              </p>
              <a
                href={creator.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-[#12141c] underline-offset-2 hover:underline"
              >
                {creator.handle}
              </a>
            </div>
            <h3 className="mt-2 font-display text-lg font-semibold leading-snug text-[#12141c]">
              {creator.name}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-zinc-600">{creator.specialty}</p>
            <div className="mt-3 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                {signatureHookLabel}
              </p>
              <p className="mt-1 font-medium text-xs leading-relaxed text-[#12141c]">
                “{creator.signatureHook}”
              </p>
            </div>
            <p className="mt-3 flex-1 text-xs leading-relaxed text-zinc-600">
              <span className="font-semibold text-[#12141c]">{stealThisLabel}: </span>
              {creator.stealThis}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <a
                href={creator.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-1 rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-[#12141c] transition hover:border-[#12141c]"
              >
                {profileLabel} ↗
              </a>
              <a
                href={creator.exampleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-1 rounded-full bg-[#c6f24b] px-3 py-1.5 text-xs font-semibold text-[#12141c] transition hover:brightness-95"
              >
                {exampleLabel} ↗
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CategoryChip({
  active,
  label,
  onSelect,
}: {
  active: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      className={
        active
          ? "cursor-pointer rounded-full bg-[#12141c] px-3 py-1.5 text-xs font-semibold text-white"
          : "cursor-pointer rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-zinc-400"
      }
    >
      {label}
    </button>
  );
}
