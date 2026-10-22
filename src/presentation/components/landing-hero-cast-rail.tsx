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

// Style mosaic uses the same Asian female faces so the site never shows account characters.
const STYLES = [
  { src: "/hero/cast/fresh/mei-portrait.webp", label: "Realistic" },
  { src: "/hero/cast/fresh/yuna-portrait.webp", label: "Clay" },
  { src: "/hero/cast/fresh/hana-portrait.webp", label: "Water" },
  { src: "/hero/cast/fresh/linh-portrait.webp", label: "Chalk" },
  { src: "/hero/cast/fresh/sora-portrait.webp", label: "Cutout" },
  { src: "/hero/cast/fresh/aiko-portrait.webp", label: "Doodle" },
  { src: "/hero/cast/fresh/mina-portrait.webp", label: "Pencil" },
  { src: "/hero/cast/fresh/zoe-portrait.webp", label: "Pop" },
  { src: "/hero/cast/fresh/mei-standing.webp", label: "Look A" },
  { src: "/hero/cast/fresh/yuna-standing.webp", label: "Look B" },
  { src: "/hero/styles/eight-bit.webp", label: "8-bit" },
  { src: "/hero/styles/ukiyo-e.webp", label: "Ukiyo" },
  { src: "/hero/styles/low-poly.webp", label: "Low-poly" },
  { src: "/hero/styles/ray-traced.webp", label: "Ray" },
  { src: "/hero/styles/flat-illustration.webp", label: "Flat" },
  { src: "/hero/styles/highlighter-notes.webp", label: "Notes" },
];

export function LandingHeroCastRail() {
  return (
    <div className="relative flex h-full flex-col justify-start gap-2 overflow-hidden py-4 pl-2 pr-1 sm:pl-3 lg:justify-center lg:py-6 lg:pl-4 xl:pl-6">
      <motion.p
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15, duration: 0.5, ease }}
        className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#c6f24b]/85"
      >
        Character design
      </motion.p>

      <ul className="grid grid-cols-4 gap-1">
        {CAST.map((tile, index) => (
          <motion.li
            key={tile.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 + index * 0.03, duration: 0.4, ease }}
          >
            <div
              className={[
                "relative overflow-hidden rounded-md bg-[#1a1c24] shadow-[0_6px_18px_rgba(0,0,0,0.4)]",
                tile.selected ? "ring-2 ring-[#c6f24b]" : "ring-1 ring-white/12",
              ].join(" ")}
            >
              <img src={tile.src} alt="" className="aspect-[3/4] w-full object-cover object-top" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-1 pb-1 pt-5">
                <p className="truncate text-[8px] font-semibold leading-tight text-white">{tile.name}</p>
                <p className="truncate text-[7px] font-medium text-white/65">{tile.look}</p>
              </div>
              {tile.selected ? (
                <span className="absolute right-0.5 top-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#c6f24b] text-[7px] font-bold text-[#12141c]">
                  ✓
                </span>
              ) : null}
            </div>
          </motion.li>
        ))}
      </ul>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.45, ease }}
        className="min-h-0 flex-1"
      >
        <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#c6f24b]/85">
          Styles · fresh cast
        </p>
        <div className="grid grid-cols-4 gap-1">
          {STYLES.map((look, index) => (
            <motion.div
              key={`${look.label}-${index}`}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.48 + index * 0.02, duration: 0.3, ease }}
              className="relative overflow-hidden rounded-sm ring-1 ring-white/15"
            >
              <img src={look.src} alt="" className="aspect-square w-full object-cover object-top" />
              <span className="absolute inset-x-0 bottom-0 bg-black/75 py-px text-center text-[6.5px] font-semibold uppercase tracking-wide text-white">
                {look.label}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
