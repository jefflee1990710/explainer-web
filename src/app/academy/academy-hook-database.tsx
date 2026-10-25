"use client";

import { useMemo, useState } from "react";
import { AcademyInstagramPreview } from "@/app/academy/academy-instagram-preview";
import { ACADEMY_HOOKS, HOOK_SHAPES, type HookShape } from "@/service/academy/hook-database";

// Public reference of first-second lines with real Instagram Reel/Post examples.
export function AcademyHookDatabase({
  eyebrow,
  title,
  subtitle,
  allLabel,
  copyLabel,
  copiedLabel,
  exampleLabel,
  watchLabel,
  shapeLabels,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  allLabel: string;
  copyLabel: string;
  copiedLabel: string;
  exampleLabel: string;
  watchLabel: string;
  shapeLabels: Record<HookShape, string>;
}) {
  const [shape, setShape] = useState<HookShape | "all">("all");
  const [copiedId, setCopiedId] = useState("");
  const shapesInUse = useMemo(
    () => HOOK_SHAPES.filter((item) => ACADEMY_HOOKS.some((hook) => hook.shape === item)),
    [],
  );
  const hooks = useMemo(
    () => (shape === "all" ? ACADEMY_HOOKS : ACADEMY_HOOKS.filter((hook) => hook.shape === shape)),
    [shape],
  );

  async function copyLine(id: string, line: string) {
    try {
      await navigator.clipboard.writeText(line);
      setCopiedId(id);
    } catch {
      setCopiedId("");
    }
  }

  return (
    <section id="hooks" aria-labelledby="academy-hooks-title" className="scroll-mt-28">
      <p className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">{eyebrow}</p>
      <h2 id="academy-hooks-title" className="mt-2 font-display text-2xl font-bold tracking-tight text-zinc-900">
        {title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600">{subtitle}</p>
      {shapesInUse.length > 1 ? (
        <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label={title}>
          <ShapeChip active={shape === "all"} label={allLabel} onSelect={() => setShape("all")} />
          {shapesInUse.map((item) => (
            <ShapeChip
              key={item}
              active={shape === item}
              label={shapeLabels[item]}
              onSelect={() => setShape(item)}
            />
          ))}
        </div>
      ) : null}
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {hooks.map((hook) => (
          <li key={hook.id} className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5c6170]">
                {shapeLabels[hook.shape]}
              </p>
              <span className="text-xs font-medium text-zinc-500">{hook.exampleHandle}</span>
            </div>
            <p className="mt-2 font-display text-lg font-semibold leading-snug text-[#12141c]">
              {hook.line}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">{hook.note}</p>
            <AcademyInstagramPreview
              url={hook.exampleUrl}
              title={`${exampleLabel} ${hook.exampleHandle}`}
            />
            <div className="mt-3 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                {exampleLabel} · {hook.exampleHandle}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-700">{hook.exampleCaption}</p>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void copyLine(hook.id, hook.line)}
                className="inline-flex w-fit cursor-pointer rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-[#12141c] transition hover:border-[#12141c]"
              >
                {copiedId === hook.id ? copiedLabel : copyLabel}
              </button>
              <a
                href={hook.exampleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-1 rounded-full bg-[#c6f24b] px-3 py-1.5 text-xs font-semibold text-[#12141c] transition hover:brightness-95"
              >
                {watchLabel} ↗
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ShapeChip({
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
