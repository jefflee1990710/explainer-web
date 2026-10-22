"use client";

import { motion } from "framer-motion";

const ease = [0.25, 0.1, 0.25, 1] as const;

// Life feed posts — denser grid so hero shows the brand-IP feed, not just two cards.
const LIFE_POSTS = [
  {
    src: "/landing/steps/life.webp",
    caption: "Café · morning",
    object: "object-[18%_center]",
  },
  {
    src: "/hero/cast/fresh/mei-standing.webp",
    caption: "Street · OOTD",
    object: "object-cover",
  },
  {
    src: "/hero/cast/fresh/yuna-standing.webp",
    caption: "City · evening",
    object: "object-cover",
  },
  {
    src: "/landing/ai-influencer/wardrobe-grid.jpg",
    caption: "Wardrobe · looks",
    object: "object-cover",
  },
] as const;

// Right hero stage: Life on top, explainer below — clear vertical gap, no pile-up.
export function LandingHeroOutputs() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 36 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.35, duration: 0.85, ease }}
      className="relative mx-auto flex h-full w-full max-w-[22rem] items-center justify-center px-3 py-5 sm:max-w-[24rem] lg:max-w-none lg:px-4 xl:px-6"
    >
      <div
        aria-hidden
        className="absolute right-[10%] top-[10%] h-40 w-40 rounded-full bg-[#c6f24b]/25 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute bottom-[10%] left-[8%] h-32 w-32 rounded-full bg-[#c6f24b]/10 blur-2xl"
      />

      <div className="relative flex w-full flex-col gap-8 sm:gap-10 xl:gap-12">
        {/* Top — Life posts side by side, no rotate / no overlap. */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.65, ease }}
          className="w-full"
        >
          <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-[#c6f24b]">
            Life posts
          </p>
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            {LIFE_POSTS.map((post, index) => (
              <motion.article
                key={post.caption}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1, duration: 0.6, ease }}
                className="relative overflow-hidden rounded-xl bg-[#12141c] shadow-[0_14px_36px_rgba(0,0,0,0.4)] ring-1 ring-white/15"
              >
                <div className="aspect-square overflow-hidden">
                  <img src={post.src} alt="" className={`h-full w-full ${post.object}`} />
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-7">
                  <p className="text-[9px] font-semibold text-white/90">{post.caption}</p>
                </div>
                <span className="absolute left-1.5 top-1.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider text-[#c6f24b] backdrop-blur">
                  Life
                </span>
              </motion.article>
            ))}
          </div>
        </motion.div>

        {/* Bottom — Explainer video, clearly separated from Life. */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.7, ease }}
          className="w-full"
        >
          <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-[#c6f24b]">
            Explainer
          </p>
          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-[#0b0c10] shadow-[0_22px_56px_rgba(0,0,0,0.48)] ring-1 ring-white/20">
            <img
              src="/hero/outputs/explainer.webp"
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />

            <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#c6f24b] text-[#12141c] shadow-[0_8px_28px_rgba(198,242,75,0.45)] ring-4 ring-black/25">
                <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5 fill-current" aria-hidden>
                  <path d="M8 5.5v13l11-6.5-11-6.5z" />
                </svg>
              </span>
            </div>

            <div className="absolute inset-x-3 bottom-2.5">
              <p className="text-[10px] font-bold text-white">60s explainer</p>
              <p className="mt-0.5 text-[9px] leading-snug text-white/75">
                Same soul · clay style · voiceover
              </p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/20">
                <motion.div
                  className="h-full rounded-full bg-[#c6f24b]"
                  initial={{ width: "22%" }}
                  animate={{ width: ["22%", "78%", "22%"] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
