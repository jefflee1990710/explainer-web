"use client";

import { signOut } from "firebase/auth";
import { firebaseAuth } from "@/presentation/components/auth/firebase-client";
import { clearSessionAction } from "@/presentation/actions/auth";
import { track } from "@/presentation/components/analytics/track";

// Drops both the browser Firebase user and the httpOnly session cookie.
export function SignOutButton({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  async function onClick() {
    track("logout");
    await signOut(firebaseAuth()).catch(() => undefined);
    await clearSessionAction();
    window.location.assign("/");
  }

  return (
    <button type="button" onClick={() => void onClick()} className={className}>
      {label}
    </button>
  );
}
