import type { Messages } from "@/util/i18n/messages/types";

export type MarketingPageKey =
  | "rightTool"
  | "talkingHeadPage"
  | "cantonesePage"
  | "explainerPage"
  | "aiInfluencerPage"
  | "productPromoPage";

const PATH_TO_KEY: Record<string, MarketingPageKey> = {
  "/right-tool": "rightTool",
  "/talking-head": "talkingHeadPage",
  "/cantonese": "cantonesePage",
  "/explainer": "explainerPage",
  "/ai-influencer": "aiInfluencerPage",
  "/product-promo": "productPromoPage",
};

export const KEY_TO_PATH: Record<MarketingPageKey, string> = {
  rightTool: "/right-tool",
  talkingHeadPage: "/talking-head",
  cantonesePage: "/cantonese",
  explainerPage: "/explainer",
  aiInfluencerPage: "/ai-influencer",
  productPromoPage: "/product-promo",
};

// Client-safe: feature SEO landings keep their title when locale switches.
export function marketingSeoTitle(messages: Messages, pathname: string): string | null {
  const key = PATH_TO_KEY[pathname];
  return key ? messages[key].seo.title : null;
}
