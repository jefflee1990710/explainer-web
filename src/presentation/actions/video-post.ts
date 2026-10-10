"use server";

import { markVideoPostedAction as markPosted } from "@/service/video/mark-posted";

export async function markVideoPostedAction(videoId: string) {
  return markPosted(videoId);
}
