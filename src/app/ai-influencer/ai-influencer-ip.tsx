"use client";

import { AI_INFLUENCER_PAGE_IP_ART } from "@/presentation/components/influencer-ip-art";
import { InfluencerIpShowcase } from "@/presentation/components/influencer-ip-showcase";

// Marketing page: posts, wardrobe, daily refresh, custom fashion → brand IP with its own dedicated character cast.
export function AiInfluencerIp() {
  return <InfluencerIpShowcase copyKey="aiInfluencerPage.ip" id="ip" art={AI_INFLUENCER_PAGE_IP_ART} />;
}
