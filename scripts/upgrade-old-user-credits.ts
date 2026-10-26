import fs from "node:fs/promises";
import { loadEnvConfig } from "@next/env";
import { usersCollection } from "@/dao/users";
import { WELCOME_CREDITS } from "@/service/billing/welcome-credits";
import { sendMail } from "@/service/notify/smtp";
import {
  CREDIT_UPGRADE_FROM_EMAIL,
  creditUpgradeEmailHtml,
  creditUpgradeEmailSubject,
  creditUpgradeEmailText,
} from "@/service/notify/welcome-credit-upgrade-email";

loadEnvConfig(process.cwd());

// CLI flags:
//   --target=80   Target credit balance (defaults to WELCOME_CREDITS = 80)
//   --apply       Update MongoDB users with credits === 20 to targetCredits
//   --send        Send the HTML notification email from noreply@scro.io to upgraded users
async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const send = args.includes("--send");
  const targetArg = args.find((a) => a.startsWith("--target="));
  const targetCredits = targetArg ? Number(targetArg.split("=")[1]) : WELCOME_CREDITS;

  const users = await usersCollection();
  const matchedUsers = await users
    .find({
      $or: [
        { credits: 20 },
        {
          welcomeCreditUpgradedAt: { $exists: true },
          welcomeCreditUpgradeEmailedAt: { $exists: false },
        },
      ],
    } as Record<string, unknown>)
    .sort({ createdAt: -1 })
    .toArray();

  const sampleHtml = creditUpgradeEmailHtml({
    recipientName: matchedUsers[0]?.name || "Creator",
    previousCredits: 20,
    newCredits: targetCredits,
    studioHref: "https://www.scro.io/app",
  });
  const previewPath = "/tmp/scro-credit-upgrade-email-draft.html";
  await fs.writeFile(previewPath, sampleHtml, "utf8");

  console.log(
    `=== CREDIT UPGRADE & EMAIL DRAFT (${apply ? "APPLY" : "DRY-RUN"} / ${send ? "SEND" : "NO-SEND"}) ===`,
  );
  console.log(`From: Scro <${CREDIT_UPGRADE_FROM_EMAIL}>`);
  console.log(`Subject: ${creditUpgradeEmailSubject(targetCredits)}`);
  console.log(`Target Credits: 20 -> ${targetCredits}`);
  console.log(`HTML Draft Saved: ${previewPath}`);
  console.log(`Matched Users: ${matchedUsers.length}`);

  const now = new Date();
  for (const u of matchedUsers) {
    console.log(
      `  - ${u.email} (name: ${u.name || "—"}, current credits: ${u.credits} -> ${targetCredits})`,
    );

    if (apply && u.credits === 20) {
      await users.updateOne(
        { _id: u._id, credits: 20 },
        {
          $set: {
            credits: targetCredits,
            welcomeCreditUpgradedAt: now,
            updatedAt: now,
          } as Record<string, unknown>,
        },
      );
      console.log(`    [db] Updated ${u.email} credits: 20 -> ${targetCredits}`);
    }

    if (send && u.email) {
      const sent = await sendMail({
        fromEmail: CREDIT_UPGRADE_FROM_EMAIL,
        to: u.email,
        subject: creditUpgradeEmailSubject(targetCredits),
        text: creditUpgradeEmailText({
          recipientName: u.name,
          previousCredits: 20,
          newCredits: targetCredits,
          studioHref: "https://www.scro.io/app",
        }),
        html: creditUpgradeEmailHtml({
          recipientName: u.name,
          previousCredits: 20,
          newCredits: targetCredits,
          studioHref: "https://www.scro.io/app",
        }),
      });
      if (sent) {
        await users.updateOne(
          { _id: u._id },
          { $set: { welcomeCreditUpgradeEmailedAt: now } as Record<string, unknown> },
        );
      }
      console.log(`    [email] ${u.email}: ${sent ? "SENT" : "SKIPPED (SMTP not configured)"}`);
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
