"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MotionItem, MotionReveal, MotionStagger } from "@/components/motion-reveal";
import { PLANS } from "@/lib/billing/plans";

export function LandingPricing() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 pb-24">
      <MotionReveal>
        <h2 className="font-display text-3xl font-bold sm:text-4xl">訂閱後才能產片</h2>
        <p className="mt-3 max-w-xl text-muted">
          1 credit = 1 段 clip。可先寫分鏡，核准產片時才扣 credits。
        </p>
      </MotionReveal>

      <MotionStagger className="mt-10 grid gap-5 md:grid-cols-2">
        {Object.values(PLANS).map((plan, index) => (
          <MotionItem key={plan.id}>
            <article
              className={`h-full rounded-[1.75rem] border border-accent-ink/10 p-7 shadow-[8px_8px_0_0_rgba(18,20,28,0.1)] ${
                index === 1 ? "bg-accent-ink text-paper" : "bg-paper/90"
              }`}
            >
              <h3 className="font-display text-2xl font-bold">
                {plan.nameZh} / {plan.name}
              </h3>
              <p className="mt-3 font-display text-4xl font-bold">
                ${plan.amountUsd}
                <span
                  className={`text-base font-medium ${
                    index === 1 ? "text-paper/70" : "text-muted"
                  }`}
                >
                  {" "}
                  / 月
                </span>
              </p>
              <p
                className={`mt-3 text-sm leading-6 ${
                  index === 1 ? "text-paper/75" : "text-muted"
                }`}
              >
                {plan.blurb}
              </p>
              <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} className="mt-7 inline-flex">
                <Link
                  href="/app/billing"
                  className={`rounded-full px-5 py-2.5 text-sm font-semibold ${
                    index === 1
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
      </MotionStagger>
    </section>
  );
}
