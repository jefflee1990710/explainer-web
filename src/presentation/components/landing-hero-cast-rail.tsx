"use client";

import { motion } from "framer-motion";

const ease = [0.25, 0.1, 0.25, 1] as const;

type CastTile = {
  src: string;
  name: string;
  look: string;
  selected?: boolean;
};

// Brand-new Asian female cast for the marketing site only (not account library).
const CAST: CastTile[] = [
  { src: "/hero/cast/fresh/mei-portrait.webp", name: "Mei", look: "Realistic", selected: true },
  { src: "/hero/cast/fresh/yuna-portrait.webp", name: "Yuna", look: "Clay" },
  { src: "/hero/cast/fresh/hana-portrait.webp", name: "Hana", look: "Watercolor" },
  { src: "/hero/cast/fresh/linh-portrait.webp", name: "Linh", look: "Chalk" },
  { src: "/hero/cast/fresh/sora-portrait.webp", name: "Sora", look: "Cutout" },
  { src: "/hero/cast/fresh/aiko-portrait.webp", name: "Aiko", look: "Doodle" },
  { src: "/hero/cast/fresh/mina-portrait.webp", name: "Mina", look: "Pencil" },
  { src: "/hero/cast/fresh/zoe-portrait.webp", name: "Zoe", look: "Pop" },
];

// Video style stills (16:9) — the cast grid above already shows every face, so no repeats here.
const STYLES = [
  { src: "/hero/styles/eight-bit.webp", label: "8-bit" },
  { src: "/hero/styles/ukiyo-e.webp", label: "Ukiyo" },
  { src: "/hero/styles/low-poly.webp", label: "Low-poly" },
  { src: "/hero/styles/ray-traced.webp", label: "Ray" },
  { src: "/hero/styles/flat-illustration.webp", label: "Flat" },
  { src: "/hero/styles/highlighter-notes.webp", label: "Notes" },
];

export function LandingHeroCastRail() {
  return (
    <div data-hero-side="cast" className="relative flex h-full min-h-0 flex-col gap-4 overflow-hidden px-3 py-5 lg:gap-4 lg:px-4 lg:py-4 xl:gap-5 xl:px-5">
      {/* Same vertical share as Life posts on the right, so the two rails start and end together. */}
      <div className="flex min-h-0 flex-col lg:flex-[1.15]">
        <motion.p
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.5, ease }}
          className="mb-2 shrink-0 text-[9px] font-bold uppercase tracking-[0.18em] text-[#c6f24b]"
        >
          Character design
        </motion.p>

        <ul className="grid min-h-0 flex-1 grid-cols-4 gap-1.5 lg:grid-rows-2 lg:gap-2">
          {CAST.map((tile, index) => (
            <motion.li
              key={tile.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 + index * 0.03, duration: 0.4, ease }}
              className="min-h-0"
            >
              <div
                className={[
                  "relative h-full overflow-hidden rounded-xl bg-[#1a1c24] shadow-[0_10px_24px_rgba(0,0,0,0.4)]",
                  tile.selected ? "ring-2 ring-[#c6f24b]" : "ring-1 ring-white/15",
                ].join(" ")}
              >
                <img
                  src={tile.src}
                  alt=""
                  className="aspect-[3/4] h-full w-full object-cover object-top lg:absolute lg:inset-0 lg:aspect-auto"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-1.5 pb-1.5 pt-5">
                  <p className="truncate text-[8px] font-semibold leading-tight text-white">{tile.name}</p>
                  <p className="truncate text-[7px] font-medium text-white/65">{tile.look}</p>
                </div>
                {tile.selected ? (
                  <span className="absolute right-1 top-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#c6f24b] text-[7px] font-bold text-[#12141c]">
                    ✓
                  </span>
                ) : null}
              </div>
            </motion.li>
          ))}
        </ul>
      </div>

      {/* Same vertical share as the Explainer card, so style stills carry the same weight. */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.45, ease }}
        className="flex min-h-0 flex-col lg:flex-1"
      >
        <p className="mb-2 shrink-0 text-[9px] font-bold uppercase tracking-[0.18em] text-[#c6f24b]">
          Video styles
        </p>
        <div className="grid min-h-0 flex-1 grid-cols-3 gap-1.5 lg:grid-rows-2 lg:gap-2">
          {STYLES.map((look, index) => (
            <motion.div
              key={`${look.label}-${index}`}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.48 + index * 0.02, duration: 0.3, ease }}
              className="relative min-h-0 overflow-hidden rounded-xl bg-[#12141c] shadow-[0_10px_24px_rgba(0,0,0,0.4)] ring-1 ring-white/15"
            >
              <img
                src={look.src}
                alt=""
                className="aspect-video h-full w-full object-cover lg:absolute lg:inset-0 lg:aspect-auto"
              />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1 pb-1 pt-4 text-center text-[8px] font-semibold uppercase tracking-wide text-white">
                {look.label}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
