import type { ReactNode } from "react";

// One card per plan. A wide screen shows all four; narrower screens wrap to two, then one.
export function LandingPricingTrack({ children }: { children: ReactNode }) {
  return (
    <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
  );
}
