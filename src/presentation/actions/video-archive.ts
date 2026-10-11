"use server";

import { markVideoArchivedAction as markArchived } from "@/service/video/mark-archived";

export async function markVideoArchivedAction(videoId: string) {
  return markArchived(videoId);
}
