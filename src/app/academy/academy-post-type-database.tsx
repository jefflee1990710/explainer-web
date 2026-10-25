"use client";

import { useMemo, useState } from "react";
import {
  ACADEMY_POST_TYPES,
  POST_TYPE_GROUPS,
  type PostTypeGroup,
} from "@/service/academy/post-type-database";

// Formats a creator can publish. Filter by group, then read the beat order.
export function AcademyPostTypeDatabase({
  eyebrow,
  title,
  subtitle,
  allLabel,
  beatsLabel,
  groupLabels,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  allLabel: string;
  beatsLabel: string;
  groupLabels: Record<PostTypeGroup, string>;
}) {
  const [group, setGroup] = useState<PostTypeGroup | "all">("all");
  const types = useMemo(
    () =>
      group === "all" ? ACADEMY_POST_TYPES : ACADEMY_POST_TYPES.filter((item) => item.group === group),
    [group],
  );

  return (
    <section id="post-types" aria-labelledby="academy-post-types-title" className="scroll-mt-28">
      <p className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">{eyebrow}</p>
      <h2
        id="academy-post-types-title"
        className="mt-2 font-display text-2xl font-bold tracking-tight text-zinc-900"
      >
        {title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600">{subtitle}</p>
      <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label={title}>
        <GroupChip active={group === "all"} label={allLabel} onSelect={() => setGroup("all")} />
        {POST_TYPE_GROUPS.map((item) => (
          <GroupChip
            key={item}
            active={group === item}
            label={groupLabels[item]}
            onSelect={() => setGroup(item)}
          />
        ))}
      </div>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {types.map((item) => (
          <li key={item.id} className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5c6170]">
              {groupLabels[item.group]}
            </p>
            <h3 className="mt-2 font-display text-lg font-semibold leading-snug text-[#12141c]">
              {item.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">{item.use}</p>
            <div className="mt-3 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{beatsLabel}</p>
              <p className="mt-1 text-xs leading-relaxed text-[#12141c]">{item.beats}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function GroupChip({
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
