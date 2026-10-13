"use server";

import {
  markVideoArchivedAction as markArchived,
  unarchiveVideoAction as unarchive,
} from "@/service/video/mark-archived";

export async function markVideoArchivedAction(videoId: string) {
  return markArchived(videoId);
}

export async function unarchiveVideoAction(videoId: string) {
  return unarchive(videoId);
}
