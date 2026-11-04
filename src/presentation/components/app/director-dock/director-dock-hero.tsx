"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import {
  getDirectorHeroCopy,
  type DirectorStudioKind,
} from "./director-dock-config";

export function DirectorDockHero({
  kind,
  headlineOverride,
  compact = false,
}: {
  kind: DirectorStudioKind;
  headlineOverride?: string;
  compact?: boolean;
}) {
  const { locale } = useI18n();
  const copy = getDirectorHeroCopy(kind, locale);
  const [leftCard, centerCard, rightCard] = copy.cards;

  return (
    <div
      className={`flex w-full flex-col items-center text-center select-none ${
        compact ? "mb-4" : "mb-6 sm:mb-8"
      }`}
    >
      {/* Fanned 3-card showcase matching the reference printscreen */}
      <div
        className={`relative flex w-full max-w-2xl items-center justify-center ${
          compact ? "h-28 sm:h-32" : "h-36 sm:h-48"
        }`}
      >
        {/* Left side peek card */}
        <div className="relative h-24 w-40 -translate-x-20 sm:h-32 sm:w-52 sm:-translate-x-36 overflow-hidden rounded-xl border border-white/15 bg-zinc-900 shadow-xl transition duration-300 hover:-translate-x-38">
          <img
            src={leftCard.imageUrl}
            alt={leftCard.title}
            className="h-full w-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
          <div className="absolute bottom-2 left-2.5 right-2.5 text-left">
            <span className="block font-display text-[9px] font-bold tracking-widest text-white/75 uppercase">
              {leftCard.tag}
            </span>
            <span className="block truncate font-display text-xs font-extrabold tracking-tight text-white">
              {leftCard.title}
            </span>
          </div>
        </div>

        {/* Right side peek card */}
        <div className="relative h-24 w-40 translate-x-20 sm:h-32 sm:w-52 sm:translate-x-36 overflow-hidden rounded-xl border border-white/15 bg-zinc-900 shadow-xl transition duration-300 hover:translate-x-38">
          <img
            src={rightCard.imageUrl}
            alt={rightCard.title}
            className="h-full w-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
          <div className="absolute bottom-2 left-2.5 right-2.5 text-right">
            <span className="block font-display text-[9px] font-bold tracking-widest text-white/75 uppercase">
              {rightCard.tag}
            </span>
            <span className="block truncate font-display text-xs font-extrabold tracking-tight text-white">
              {rightCard.title}
            </span>
          </div>
        </div>

        {/* Center featured hero card */}
        <div
          className={`absolute z-10 overflow-hidden rounded-2xl border border-white/25 bg-zinc-950 shadow-[0_20px_50px_rgba(0,0,0,0.85)] ${
            compact ? "h-28 w-52 sm:h-32 sm:w-60" : "h-34 w-60 sm:h-44 sm:w-80"
          }`}
        >
          <img
            src={centerCard.imageUrl}
            alt={centerCard.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
          <div className="absolute inset-x-3.5 bottom-2.5 flex items-end justify-between gap-2 text-left">
            <div className="min-w-0">
              <span className="inline-block rounded bg-[#d8ff3e] px-1.5 py-0.5 font-display text-[9px] font-extrabold tracking-wider text-[#111318] uppercase">
                {centerCard.tag}
              </span>
              <p className="mt-1 truncate font-display text-xs font-extrabold tracking-wide text-white sm:text-sm">
                {centerCard.title}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Centered Headline */}
      <h1
        className={`mt-3 font-display font-bold tracking-tight text-white ${
          compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-4xl"
        }`}
      >
        {headlineOverride || copy.headline}
      </h1>
    </div>
  );
}
