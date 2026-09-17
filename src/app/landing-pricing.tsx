"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { EnterpriseCta } from "@/components/pricing/enterprise-cta";
import { MotionItem, MotionReveal, MotionStagger } from "@/components/motion-reveal";
import { PLANS } from "@/lib/billing/plans";

export function LandingPricing() {
  const plans = Object.values(PLANS);

  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 pb-24">
      <MotionReveal>
        <h2 className="font-display text-3xl font-bold sm:text-4xl">訂閱後才能產片</h2>
        <p className="mt-3 max-w-xl text-muted">
          每段 clip 扣 3 credits（起迄分鏡圖各 1、產片 1）。可先寫分鏡，核准時才扣。
        </p>
      </MotionReveal>

      <MotionStagger className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => (
          <MotionItem key={plan.id}>
            <article
              className={`flex h-full flex-col rounded-[1.75rem] border p-7 shadow-[8px_8px_0_0_rgba(18,20,28,0.1)] ${
                plan.highlight
                  ? "border-accent-ink bg-accent-ink text-paper"
                  : "border-accent-ink/10 bg-paper/90"
              }`}
            >
              {plan.highlight ? (
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lime">
                  最受歡迎
                </p>
              ) : null}
              <h3 className="font-display mt-1 text-2xl font-bold">
                {plan.nameZh} / {plan.name}
              </h3>
              <p className="mt-3 font-display text-4xl font-bold">
                ${plan.amountUsd}
                <span
                  className={`text-base font-medium ${
                    plan.highlight ? "text-paper/70" : "text-muted"
                  }`}
                >
                  {" "}
                  / 月
                </span>
              </p>
              <p
                className={`mt-3 flex-1 text-sm leading-6 ${
                  plan.highlight ? "text-paper/75" : "text-muted"
                }`}
              >
                {plan.blurb}
              </p>
              <p
                className={`mt-2 text-xs ${
                  plan.highlight ? "text-paper/55" : "text-muted"
                }`}
              >
                {plan.monthlyCredits} credits · 約 {Math.floor(plan.monthlyCredits / 3)}{" "}
                段 clips
              </p>
              <motion.div
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="mt-7 inline-flex"
              >
                <Link
                  href="/app/billing"
                  className={`rounded-full px-5 py-2.5 text-sm font-semibold ${
                    plan.highlight
                      ? "bg-lime text-accent-ink shadow-[3px_3px_0_0_rgba(255,77,46,0.9)]"
                      : "bg-accent text-white shadow-[3px_3px_0_0_#12141c]"
                  }`}
                >
                  訂閱 {plan.nameZh}
                </Link>
              </motion.div>
            </article>
          </MotionItem>
        ))}
        <MotionItem>
          <EnterpriseCta />
        </MotionItem>
      </MotionStagger>
    </section>
  );
}
