import { usersCollection } from "@/dao";
import { directorVisibilityCollection } from "@/dao/director-visibility";
import { isDirectorSlug } from "@/model/director";
import { isScroAdminEmail } from "@/service/academy/admin";

const VISIBILITY_ID = "builtin" as const;

// A director turned off in /scroadmin/analytics/directors is visible only to the operator inbox.
export function directorVisibleToEmail(input: {
  slug: string;
  hiddenInPicker: boolean;
  isActive?: boolean;
  requireActive?: boolean;
  privateSlugs: ReadonlySet<string>;
  email?: string | null;
}): boolean {
  if (input.requireActive && input.isActive === false) return false;
  if (input.privateSlugs.has(input.slug)) return isScroAdminEmail(input.email);
  return !input.hiddenInPicker;
}

// True when this slug is switched off and the viewer is not the operator inbox.
export function directorKeptPrivate(
  slug: string,
  privateSlugs: ReadonlySet<string>,
  email?: string | null,
): boolean {
  return privateSlugs.has(slug) && !isScroAdminEmail(email);
}

// Slugs an admin has switched off. Missing config or database means every director stays public.
export async function loadPrivateDirectorSlugs(): Promise<Set<string>> {
  if (!process.env.MONGODB_URI) return new Set();
  try {
    const col = await directorVisibilityCollection();
    const doc = await col.findOne({ _id: VISIBILITY_ID });
    return new Set((doc?.privateSlugs ?? []).filter((slug) => typeof slug === "string" && slug.length > 0));
  } catch {
    return new Set();
  }
}

export async function loadDirectorVisibility(
  clerkUserId?: string,
  knownEmail?: string | null,
): Promise<{ email: string | null; privateSlugs: Set<string> }> {
  const [email, privateSlugs] = await Promise.all([
    knownEmail !== undefined ? Promise.resolve(knownEmail) : emailForClerkUser(clerkUserId),
    loadPrivateDirectorSlugs(),
  ]);
  return { email: email ?? null, privateSlugs };
}

// Persist the admin switch. `enabled` true removes the slug so everyone can see the director again.
export async function setBuiltinDirectorEnabled(slug: string, enabled: boolean): Promise<void> {
  if (!isDirectorSlug(slug)) throw new Error("未知導演");
  const col = await directorVisibilityCollection();
  const now = new Date();
  if (enabled) {
    await col.updateOne(
      { _id: VISIBILITY_ID },
      { $pull: { privateSlugs: slug }, $set: { updatedAt: now } },
      { upsert: true },
    );
    return;
  }
  await col.updateOne(
    { _id: VISIBILITY_ID },
    { $addToSet: { privateSlugs: slug }, $set: { updatedAt: now } },
    { upsert: true },
  );
}

async function emailForClerkUser(clerkUserId?: string): Promise<string | null> {
  if (!clerkUserId || !process.env.MONGODB_URI) return null;
  try {
    const users = await usersCollection();
    const user = await users.findOne({ clerkUserId }, { projection: { email: 1 } });
    return user?.email ?? null;
  } catch {
    return null;
  }
}
