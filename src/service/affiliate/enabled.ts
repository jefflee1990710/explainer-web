// Program kill switch. A user still needs affiliateEnabled on their document.
export const AFFILIATE_ENABLED = true;

// True only for accounts an operator has turned on.
export function isAffiliateAccount(
  user: { affiliateEnabled?: boolean } | null | undefined,
) {
  return AFFILIATE_ENABLED && user?.affiliateEnabled === true;
}
