import { NextResponse, type NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { usersCollection } from "@/lib/collections";

export async function POST(request: NextRequest) {
  if (!process.env.CLERK_WEBHOOK_SECRET) {
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
    }
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Invalid Clerk webhook" }, { status: 400 });
  }
}
