import { currentUser } from "@clerk/nextjs/server";
import { usersCollection } from "@/lib/collections";
import type { AppUser } from "@/types/user";

// Upsert the Mongo user from the current Clerk session.
export async function requireAppUser(): Promise<AppUser> {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    throw new Error("請先登入");
  }

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ||
    clerkUser.emailAddresses[0]?.emailAddress ||
    "";
  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    clerkUser.username ||
    email ||
    "User";

  const users = await usersCollection();
  const now = new Date();
  await users.updateOne(
    { clerkUserId: clerkUser.id },
    {
      $set: { email, name, updatedAt: now },
      $setOnInsert: {
        clerkUserId: clerkUser.id,
        credits: 0,
        createdAt: now,
      },
    },
    { upsert: true },
  );

  const user = await users.findOne({ clerkUserId: clerkUser.id });
  if (!user) {
    throw new Error("無法建立使用者");
  }
  return user;
}
