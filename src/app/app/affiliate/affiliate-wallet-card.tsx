// Wallet summary card on the Affiliate dashboard.
export function AffiliateWalletCard({ label }: { label: string }) {
  return (
    <div className="rounded-[1.25rem] border border-accent-ink/10 bg-lime/40 px-4 py-4 font-semibold">
      {label}
    </div>
  );
}
