import Link from "next/link";
import { Show, SignUpButton } from "@clerk/nextjs";
import { SiteHeader } from "@/components/site-header";
import { PLANS } from "@/lib/billing/plans";

export default function HomePage() {
  return (
    <div className="min-h-full">
      <SiteHeader />
      <section className="mx-auto max-w-5xl px-6 py-20">
        <p className="text-sm text-muted">SaaS for explainer videos</p>
        <h1 className="mt-3 max-w-3xl text-5xl font-semibold tracking-tight">
          選一個導演技能，核准分鏡，產出卡通解說影片。
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
          第一個技能是 Cartoon explainer video director：把題材寫成高留存白板塗鴉分鏡，核准後再用 Higgsfield 產圖與逐段影片。
        </p>
        <div className="mt-8 flex gap-3">
          <Show when="signed-out">
            <SignUpButton mode="modal">
              <button className="rounded-full bg-accent px-5 py-3 text-sm text-white">
                開始使用
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link
              href="/app"
              className="rounded-full bg-accent px-5 py-3 text-sm text-white"
            >
              進入工作台
            </Link>
          </Show>
          <Link
            href="#pricing"
            className="rounded-full border border-line bg-card px-5 py-3 text-sm"
          >
            看方案
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-16 md:grid-cols-3">
        {[
          ["1. 選技能", "先從 Cartoon explainer video director 開始，之後可加更多導演技能。"],
          ["2. 核准分鏡", "AI 先交 Phase A 提案：標題、鉤子、分鏡與英文旁白。你改到滿意再繼續。"],
          ["3. Higgsfield 產片", "核准後自動產角色定裝圖，再逐段產出 3–8 秒 clips。"],
        ].map(([title, body]) => (
          <article key={title} className="rounded-2xl border border-line bg-card p-6">
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted">{body}</p>
          </article>
        ))}
      </section>

      <section id="pricing" className="mx-auto max-w-5xl px-6 pb-24">
        <h2 className="text-3xl font-semibold">訂閱後才能產片</h2>
        <p className="mt-3 text-muted">1 credit = 1 段 clip。可先寫分鏡，核准產片時才扣 credits。</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {Object.values(PLANS).map((plan) => (
            <article
              key={plan.id}
              className="rounded-2xl border border-line bg-card p-6"
            >
              <h3 className="text-xl font-semibold">
                {plan.nameZh} / {plan.name}
              </h3>
              <p className="mt-2 text-3xl font-semibold">${plan.amountUsd}<span className="text-base text-muted"> / 月</span></p>
              <p className="mt-3 text-sm text-muted">{plan.blurb}</p>
              <Link
                href="/app/billing"
                className="mt-6 inline-flex rounded-full bg-accent px-4 py-2 text-sm text-white"
              >
                訂閱 {plan.nameZh}
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
