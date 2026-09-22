import { NextResponse, type NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import {
  bindReferralOnSignup,
  ensureAffiliateProfile,
} from "@/service/affiliate/engine";
import { usersCollection } from "@/dao";

export async function POST(request: NextRequest) {
  // verifyWebhook() reads CLERK_WEBHOOK_SIGNING_SECRET, so guard on the same name.
  if (!process.env.CLERK_WEBHOOK_SIGNING_SECRET) {
    return NextResponse.json({ error: "Missing Clerk webhook secret" }, { status: 500 });
  }

  try {
    const event = await verifyWebhook(request);
    if (event.type === "user.created" || event.type === "user.updated") {
      const user = event.data;
      const email =
        user.email_addresses.find((item) => item.id === user.primary_email_address_id)
          ?.email_address ||
        user.email_addresses[0]?.email_address ||
        "";
      const name =
        [user.first_name, user.last_name].filter(Boolean).join(" ") || email;
      const users = await usersCollection();
      const now = new Date();
      // Referral code may arrive via unsafe_metadata from the signup form.
      const referralCode =
        typeof user.unsafe_metadata?.referralCode === "string"
          ? user.unsafe_metadata.referralCode
          : undefined;

      await users.updateOne(
        { clerkUserId: user.id },
        {
          $set: { email, name, updatedAt: now },
          $setOnInsert: {
            clerkUserId: user.id,
            credits: 0,
            createdAt: now,
          },
        },
        { upsert: true },
      );

      const appUser = await users.findOne({ clerkUserId: user.id });
      if (appUser) {
        if (event.type === "user.created") {
          await bindReferralOnSignup(appUser, referralCode);
        }
        const fresh = await users.findOne({ clerkUserId: user.id });
        if (fresh) await ensureAffiliateProfile(fresh);
      }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    // Surface the reason in platform logs; silent 400s are hard to diagnose.
    console.error("Clerk webhook rejected", error);
    return NextResponse.json({ error: "Invalid Clerk webhook" }, { status: 400 });
  }
}
