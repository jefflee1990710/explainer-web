"use server";

import * as service from "@/service/reel/actions";

export async function composeReelAction(
  ...args: Parameters<typeof service.composeReelAction>
) {
  return service.composeReelAction(...args);
}
