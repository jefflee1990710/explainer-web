"use server";

import * as service from "@/service/billing/actions";

export async function startCheckoutAction(
  ...args: Parameters<typeof service.startCheckoutAction>
) {
  return service.startCheckoutAction(...args);
}

export async function startPortalAction(
  ...args: Parameters<typeof service.startPortalAction>
) {
  return service.startPortalAction(...args);
}

export async function startPackCheckoutAction(
  ...args: Parameters<typeof service.startPackCheckoutAction>
) {
  return service.startPackCheckoutAction(...args);
}
