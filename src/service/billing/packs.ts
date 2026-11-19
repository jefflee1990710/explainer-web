import type { CreditPackPrice, PackId } from "@/model/billing-settings";
import { formatUsd } from "@/service/billing/usd";

export type { PackId };

export type CreditPack = {
  id: PackId;
  // Base 1:1 USD credit added before any adhoc bonus percentage.
  creditUsd: number;
  amountUsd: number;
  nameZh: string;
  blurb: string;
};

export const PACK_IDS: PackId[] = [
  "pack10",
  "pack20",
  "pack50",
  "pack100",
  "pack500",
  "pack1000",
];

// Pay-as-you-go one-time USD credit packs ($10, $20, $50, $100, $500, $1,000 USD).
export const CREDIT_PACKS: Record<PackId, CreditPack> = {
  pack10: {
    id: "pack10",
    creditUsd: 10,
    amountUsd: 10,
    nameZh: "$10 儲值包",
    blurb: "一次加上 $10.00 USD Credit。免訂閱即可購買使用，未用完的 USD Credit 永久保留。",
  },
  pack20: {
    id: "pack20",
    creditUsd: 20,
    amountUsd: 20,
    nameZh: "$20 儲值包",
    blurb: "一次加上 $20.00 USD Credit。免訂閱即可購買使用，未用完的 USD Credit 永久保留。",
  },
  pack50: {
    id: "pack50",
    creditUsd: 50,
    amountUsd: 50,
    nameZh: "$50 儲值包",
    blurb: "一次加上 $50.00 USD Credit。免訂閱即可購買使用，未用完的 USD Credit 永久保留。",
  },
  pack100: {
    id: "pack100",
    creditUsd: 100,
    amountUsd: 100,
    nameZh: "$100 儲值包",
    blurb: "一次加上 $100.00 USD Credit。免訂閱即可購買使用，未用完的 USD Credit 永久保留。",
  },
  pack500: {
    id: "pack500",
    creditUsd: 500,
    amountUsd: 500,
    nameZh: "$500 儲值包",
    blurb: "一次加上 $500.00 USD Credit。免訂閱即可購買使用，未用完的 USD Credit 永久保留。",
  },
  pack1000: {
    id: "pack1000",
    creditUsd: 1000,
    amountUsd: 1000,
    nameZh: "$1,000 儲值包",
    blurb: "一次加上 $1,000.00 USD Credit。免訂閱即可購買使用，未用完的 USD Credit 永久保留。",
  },
};

export function localizedPackName(pack: CreditPack, locale: string): string {
  const usd = `$${pack.amountUsd.toLocaleString("en-US")}`;
  if (locale === "zh-Hant") return pack.nameZh;
  if (locale === "zh-Hans") return `${usd} 充值包`;
  if (locale === "ja") return `${usd} チャージパック`;
  if (locale === "ko") return `${usd} 충전 팩`;
  return `${usd} Credit Pack`;
}

export function localizedPackBlurb(pack: CreditPack, locale: string): string {
  const amount = formatUsd(pack.creditUsd);
  if (locale === "zh-Hant") return pack.blurb;
  if (locale === "zh-Hans") {
    return `一次加上 ${amount} USD Credit。无需订阅即可购买使用，未用完的 USD Credit 永久保留。`;
  }
  if (locale === "ja") {
    return `${amount} USD Credit を一括追加。サブスク不要で購入・利用でき、未使用の USD Credit は無期限で繰り越されます。`;
  }
  if (locale === "ko") {
    return `${amount} USD Credit 일회성 충전. 구독 없이 바로 구매하여 사용할 수 있으며, 남은 USD Credit은 영구 보존됩니다.`;
  }
  return `Adds ${amount} USD Credit at once. No subscription required; unused USD Credit never expires and rolls over.`;
}

// Stripe product label; shown on the hosted checkout page.
export function packProductName(pack: CreditPack) {
  return `Scro ${pack.nameZh} (${formatUsd(pack.creditUsd)} USD)`;
}

// True while the stored Stripe price still matches the pack's amount and USD credit.
export function packPriceIsCurrent(stored: CreditPackPrice | undefined, pack: CreditPack) {
  return (
    Boolean(stored?.priceId) &&
    stored?.amountUsd === pack.amountUsd &&
    stored?.creditUsd === pack.creditUsd
  );
}

export function isPackId(value: string | undefined): value is PackId {
  return Boolean(value && PACK_IDS.includes(value as PackId));
}
