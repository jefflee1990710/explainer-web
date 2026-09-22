"use server";

import * as service from "@/service/affiliate/actions";

export async function requestPayoutAction(
  ...args: Parameters<typeof service.requestPayoutAction>
) {
  return service.requestPayoutAction(...args);
}

export async function getAffiliateDashboardData(
  ...args: Parameters<typeof service.getAffiliateDashboardData>
) {
  return service.getAffiliateDashboardData(...args);
}
