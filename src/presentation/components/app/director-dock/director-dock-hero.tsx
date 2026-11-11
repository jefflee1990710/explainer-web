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
        compact ? "mb-4" : "mb-5 sm:mb-7"
      }`}
    >
      {/* Fanned 3-card showcase matching the reference printscreen */}
      <div
        className={`relative flex w-full max-w-xl items-center justify-center ${
          compact ? "h-28 sm:h-32" : "h-34 sm:h-44"
        }`}
      >
        {/* Left side peek card */}
        <div className="relative h-24 w-36 -translate-x-18 sm:h-30 sm:w-48 sm:-translate-x-32 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_10px_28px_rgba(18,20,28,0.12)] transition duration-300 hover:-translate-x-34">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={leftCard.imageUrl}
            alt={leftCard.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
          <div className="absolute bottom-2 left-2.5 right-2.5 text-left">
            <span className="block font-display text-[9px] font-bold tracking-widest text-white/80 uppercase">
              {leftCard.tag}
            </span>
            <span className="block truncate font-display text-xs font-extrabold tracking-tight text-white">
              {leftCard.title}
            </span>
          </div>
        </div>

        {/* Right side peek card */}
        <div className="relative h-24 w-36 translate-x-18 sm:h-30 sm:w-48 sm:translate-x-32 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_10px_28px_rgba(18,20,28,0.12)] transition duration-300 hover:translate-x-34">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={rightCard.imageUrl}
            alt={rightCard.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
          <div className="absolute bottom-2 left-2.5 right-2.5 text-right">
            <span className="block font-display text-[9px] font-bold tracking-widest text-white/80 uppercase">
              {rightCard.tag}
            </span>
            <span className="block truncate font-display text-xs font-extrabold tracking-tight text-white">
              {rightCard.title}
            </span>
          </div>
        </div>

        {/* Center featured hero card */}
        <div
          className={`absolute z-10 overflow-hidden rounded-2xl border-2 border-white bg-zinc-900 shadow-[0_18px_44px_rgba(18,20,28,0.22)] ${
            compact ? "h-28 w-48 sm:h-32 sm:w-56" : "h-32 w-56 sm:h-40 sm:w-72"
          }`}
        >
          {centerCard.videoUrl ? (
            <video
              key={centerCard.videoUrl}
              src={centerCard.videoUrl}
              poster={centerCard.imageUrl}
              autoPlay
              loop
              muted
              playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={centerCard.imageUrl}
              alt={centerCard.title}
              className="h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
          <div className="absolute inset-x-3.5 bottom-2.5 flex items-end justify-between gap-2 text-left">
            <div className="min-w-0">
              <span className="inline-block rounded bg-[#c6f24b] px-1.5 py-0.5 font-display text-[9px] font-extrabold tracking-wider text-[#12141c] uppercase">
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
        className={`mt-3 font-display font-bold tracking-tight text-[#12141c] ${
          compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-4xl"
        }`}
      >
        {headlineOverride || copy.headline}
      </h1>
    </div>
  );
}
