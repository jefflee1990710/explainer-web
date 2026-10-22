export type InfluencerIpArtSet = {
  wardrobe: string;
  lifeFeed: string;
  daily: string;
  custom: string;
  dailyAspectClass?: string;
};

// Landing page AI Influencer brand-IP showcase art.
export const INFLUENCER_IP_ART: InfluencerIpArtSet = {
  wardrobe: "/landing/ai-influencer/wardrobe-grid.jpg",
  lifeFeed: "/landing/ai-influencer/life-feed.jpg",
  daily: "/landing/ai-influencer/daily-refresh.jpg",
  custom: "/landing/ai-influencer/custom-fashion.jpg",
  dailyAspectClass: "aspect-[1512/368]",
};

// Dedicated brand-new character art set for /ai-influencer feature page (never reuses landing page cast).
export const AI_INFLUENCER_PAGE_IP_ART: InfluencerIpArtSet = {
  wardrobe: "/landing/ai-influencer/ip-wardrobe.jpg",
  lifeFeed: "/landing/ai-influencer/ip-life.jpg",
  daily: "/landing/ai-influencer/ip-daily.jpg",
  custom: "/landing/ai-influencer/ip-custom.jpg",
  dailyAspectClass: "aspect-video",
};
