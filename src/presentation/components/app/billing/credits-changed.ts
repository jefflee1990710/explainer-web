export const CREDITS_CHANGED_EVENT = "scro-credits-changed";

export type CreditsChangedDetail = {
  credits: number;
  creditLimit: number;
  subscribed: boolean;
  planId?: string | null;
};

// Header meter and local wallets listen so a dialog payment updates immediately.
export function notifyCreditsChanged(detail: CreditsChangedDetail) {
  window.dispatchEvent(new CustomEvent<CreditsChangedDetail>(CREDITS_CHANGED_EVENT, { detail }));
}
