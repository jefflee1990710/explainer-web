"use server";

import * as service from "@/service/home/hot-topics";

export async function getOrGenerateUserHotTopicsAction(options?: {
  forceRefresh?: boolean;
}) {
  return service.getOrGenerateUserHotTopicsAction(options);
}
