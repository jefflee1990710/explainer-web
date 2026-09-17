import { CREDIT_PACKS } from "@/lib/billing/packs";
import { BuyPackButton } from "./billing-actions";

export function CreditPacks({ subscribed }: { subscribed: boolean }) {
  const packs = Object.values(CREDIT_PACKS);

  return (
    <section className="mt-8">
      <h2 className="font-display text-2xl font-bold">加購 credits</h2>
      <p className="mt-2 text-sm text-muted">
        與每月重置分開計算。一次付清，未用完的加購會堆疊到下個週期。
      </p>
      {!subscribed ? (
        <p className="mt-4 rounded-[1rem] border border-accent-ink/10 bg-paper/85 px-4 py-3 text-sm text-muted">
          訂閱方案後才能加購。
        </p>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {packs.map((pack) => (
            <article
              key={pack.id}
              className="flex flex-col rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-6 shadow-[6px_6px_0_0_rgba(18,20,28,0.08)]"
            >
              <h3 className="font-display text-xl font-bold">{pack.nameZh}</h3>
              <p className="mt-2 font-display text-3xl font-bold">
                ${pack.amountUsd}
                <span className="text-base font-medium text-muted"> 一次</span>
              </p>
              <p className="mt-2 flex-1 text-sm text-muted">{pack.blurb}</p>
              <p className="mt-2 text-xs text-muted">
                {pack.credits} credits · 約 {Math.floor(pack.credits / 3)} 段 clips
              </p>
              <div className="mt-5">
                <BuyPackButton packId={pack.id} label={`加購 ${pack.nameZh}`} />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
