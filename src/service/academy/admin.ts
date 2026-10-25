import { redirect } from "next/navigation";
import type { AppUser } from "@/model/user";
import { getAuthSession, upsertAppUserFromIdentity } from "@/service/auth";

// Hardcoded operator inbox — the only account that can open /scroadmin.
export const SCRO_ADMIN_EMAIL = "jeff.lee.1990710@gmail.com";

// Case-insensitive match against the hardcoded Scro admin inbox.
export function isScroAdminEmail(email?: string | null): boolean {
  return (email || "").trim().toLowerCase() === SCRO_ADMIN_EMAIL;
}

export type ScroAdminAuth =
  | { ok: true; user: AppUser }
  | { ok: false; error: "unauthenticated" | "forbidden" };

// Check the current Firebase session without redirecting. Used by server actions.
export async function resolveScroAdmin(): Promise<ScroAdminAuth> {
  const session = await getAuthSession();
  if (!session) return { ok: false, error: "unauthenticated" };
  const user = await upsertAppUserFromIdentity({
    uid: session.uid,
    email: session.email,
    name: session.name,
  });
  if (!isScroAdminEmail(user.email)) return { ok: false, error: "forbidden" };
  return { ok: true, user };
}

// Gate a /scroadmin page: unsigned visitors sign in, other emails stay out.
export async function requireScroAdmin(): Promise<AppUser> {
  const resolved = await resolveScroAdmin();
  if (resolved.ok) return resolved.user;
  if (resolved.error === "unauthenticated") {
    redirect("/sign-in?next=/scroadmin");
  }
  redirect("/");
}
