"use server";

import * as service from "@/service/text-style/actions";

export type { TextStyleResult } from "@/service/text-style/actions";

export async function createTextStyleAction(
  ...args: Parameters<typeof service.createTextStyleAction>
) {
  return service.createTextStyleAction(...args);
}

export async function replaceTextStyleImageAction(
  ...args: Parameters<typeof service.replaceTextStyleImageAction>
) {
  return service.replaceTextStyleImageAction(...args);
}

export async function deleteTextStyleAction(
  ...args: Parameters<typeof service.deleteTextStyleAction>
) {
  return service.deleteTextStyleAction(...args);
}
