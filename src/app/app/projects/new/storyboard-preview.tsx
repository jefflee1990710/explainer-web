"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Spinner } from "@/components/spinner";
import { LANGUAGE_PRESETS } from "@/lib/director/languages";
import type { PublicProject } from "@/lib/serialize";

const ease = [0.22, 1, 0.36, 1] as const;

// Inline storyboard shown right under the form once Phase A lands.
export function StoryboardPreview({
  project,
  credits,
  subscribed,
  pending,
  error,
  onApprove,
  onRevise,
}: {
  project: PublicProject;
  credits: number;
  subscribed: boolean;
  pending: "revise" | "approve" | "";
  error: string;
  onApprove: () => void;
  onRevise: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  const phaseA = project.phaseA;
  if (!phaseA) return null;

  const language = LANGUAGE_PRESETS[project.language];
  // Approving the storyboard generates a start + end frame per clip, 1 credit each.
  const framesCost = phaseA.clipCount * 2;
  const canGenerate = subscribed && credits >= framesCost;
  const busy = pending !== "";

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12, transition: { duration: 0.2 } }}
      transition={{ duration: 0.45, ease }}
      className="space-y-5"
    >
      <header className="rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-6 shadow-[6px_6px_0_0_rgba(18,20,28,0.08)]">
        <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-accent">
          Phase A · 分鏡提案
        </p>
        <h2 className="font-display mt-2 text-2xl font-bold">
          {phaseA.localizedTitle}
        </h2>
        <p className="text-sm text-muted">{phaseA.englishTitle}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Chip>{phaseA.targetDuration}</Chip>
          <Chip>{phaseA.clipCount} 段 clips</Chip>
          <Chip>{project.aspectRatio}</Chip>
          <Chip>{language.label} 旁白</Chip>
          <Chip>{phaseA.loopMode === "infinite" ? "無縫循環" : "線性"}</Chip>
        </div>
        <dl className="mt-5 grid gap-4 text-sm md:grid-cols-2">
          <Field label="核心訊息">{phaseA.coreMessage}</Field>
          <Field label="開場鉤子">{phaseA.hookStrategy}</Field>
          <Field label="旁白角色">{phaseA.narrator}</Field>
          <Field label="視覺世界">{phaseA.visualWorld}</Field>
        </dl>
      </header>

      <motion.ol
        className="grid gap-3"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
      >
        {phaseA.clips.map((clip) => (
          <motion.li
            key={clip.clipNumber}
            variants={{
              hidden: { opacity: 0, y: 14 },
              show: { opacity: 1, y: 0, transition: { duration: 0.35, ease } },
            }}
            className="grid gap-3 rounded-2xl border border-accent-ink/10 bg-paper/85 p-4 md:grid-cols-[72px_1fr_1fr]"
          >
            <div>
              <span className="inline-flex rounded-full bg-accent-ink px-2.5 py-1 font-display text-xs font-bold text-lime">
                #{clip.clipNumber}
              </span>
              <p className="mt-2 text-xs text-muted">{clip.timeRange}</p>
            </div>
            <div className="text-sm">
              <p className="font-medium">{clip.explainerScene}</p>
              <p className="mt-1 text-xs text-muted">{clip.motionCamera}</p>
            </div>
            <div className="text-sm">
              <p className="font-medium">{clip.englishVo}</p>
              <p className="mt-1 text-xs text-muted">{clip.referenceTranslation}</p>
            </div>
          </motion.li>
        ))}
      </motion.ol>

      <div className="grid gap-4 md:grid-cols-[1fr_320px]">
        <form
          className="rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            onRevise(note);
          }}
        >
          <label htmlFor="revise-note" className="block text-sm font-semibold">
            想改哪裡？
          </label>
          <textarea
            id="revise-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            disabled={busy}
            className="mt-2 w-full rounded-xl border border-accent-ink/15 bg-paper px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
            placeholder="例如：鉤子再強一點、最後加上 CTA、語氣更輕鬆"
          />
          <button
            type="submit"
            disabled={busy}
            className="mt-3 inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border border-accent-ink/15 bg-paper px-5 py-2 text-sm font-semibold shadow-[3px_3px_0_0_rgba(198,242,75,0.9)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending === "revise" ? <Spinner /> : null}
            {pending === "revise" ? "重寫中…" : "重寫分鏡"}
          </button>
        </form>

        <div className="rounded-[1.5rem] border border-accent-ink/10 bg-lime/60 p-5">
          <p className="font-display text-sm font-bold">核准分鏡，先畫分鏡圖</p>
          <p className="mt-2 text-sm">
            每段產生起始＋結尾兩張畫格，將扣{" "}
            <strong>{framesCost} credits</strong>
            <span className="text-muted">（剩餘 {credits}）</span>
          </p>
          <p className="mt-1 text-xs text-muted">
            看過畫格再決定產片；產片另扣 {phaseA.clipCount} credits。
          </p>
          {!canGenerate ? (
            <p className="mt-2 text-xs text-accent">
              {subscribed ? "credits 不足，請先升級方案。" : "尚未訂閱，按下後將前往訂閱頁。"}
            </p>
          ) : null}
          <motion.button
            type="button"
            onClick={onApprove}
            disabled={busy}
            whileTap={{ scale: 0.98 }}
            className="mt-4 inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-[4px_4px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending === "approve" ? <Spinner /> : null}
            {pending === "approve" ? "送出中…" : "核准並產生分鏡圖"}
          </motion.button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-accent">
          {error}
        </p>
      ) : null}
    </motion.section>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-accent-ink/10 bg-paper px-2.5 py-1 font-medium">
      {children}
    </span>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="mt-1 leading-6">{children}</dd>
    </div>
  );
}
