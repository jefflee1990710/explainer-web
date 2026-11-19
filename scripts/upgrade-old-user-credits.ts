import fs from "node:fs/promises";
import { loadEnvConfig } from "@next/env";
import { usersCollection } from "@/dao/users";
import { WELCOME_CREDIT_USD } from "@/service/billing/welcome-credits";
import { resolveUserUsdBalance } from "@/service/billing/credit-balance";
import { legacyCreditsToUsd } from "@/service/billing/usd";
import { sendMail } from "@/service/notify/smtp";
import {
  CREDIT_UPGRADE_FROM_EMAIL,
  creditUpgradeEmailHtml,
  creditUpgradeEmailSubject,
  creditUpgradeEmailText,
} from "@/service/notify/welcome-credit-upgrade-email";

loadEnvConfig(process.cwd());

// CLI flags:
//   --target=6.00 Target USD Credit balance (defaults to WELCOME_CREDIT_USD)
//   --apply       Update MongoDB users with legacy 20 credits ($0.80) to targetCreditUsd
//   --send        Send the HTML notification email from noreply@scro.io to upgraded users
async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const send = args.includes("--send");
  const targetArg = args.find((a) => a.startsWith("--target="));
  const targetCreditUsd = targetArg ? Number(targetArg.split("=")[1]) : WELCOME_CREDIT_USD;
  const previousUsd = legacyCreditsToUsd(20);

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
    previousCreditUsd: previousUsd,
    newCreditUsd: targetCreditUsd,
    studioHref: "https://www.scro.io/app",
  });
  const previewPath = "/tmp/scro-credit-upgrade-email-draft.html";
  await fs.writeFile(previewPath, sampleHtml, "utf8");

  console.log(
    `=== CREDIT UPGRADE & EMAIL DRAFT (${apply ? "APPLY" : "DRY-RUN"} / ${send ? "SEND" : "NO-SEND"}) ===`,
  );
  console.log(`From: Scro <${CREDIT_UPGRADE_FROM_EMAIL}>`);
  console.log(`Subject: ${creditUpgradeEmailSubject(targetCreditUsd)}`);
  console.log(`Target USD Credit: ${previousUsd} -> ${targetCreditUsd}`);
  console.log(`HTML Draft Saved: ${previewPath}`);
  console.log(`Matched Users: ${matchedUsers.length}`);

  const now = new Date();
  for (const u of matchedUsers) {
    const currentUsd = resolveUserUsdBalance(u).creditUsd;
    console.log(
      `  - ${u.email} (name: ${u.name || "—"}, current USD Credit: ${currentUsd} -> ${targetCreditUsd})`,
    );

    if (apply && u.credits === 20) {
      await users.updateOne(
        { _id: u._id, credits: 20 },
        {
          $set: {
            creditUsd: targetCreditUsd,
            creditLimitUsd: targetCreditUsd,
            welcomeCreditUpgradedAt: now,
            updatedAt: now,
          } as Record<string, unknown>,
        },
      );
      console.log(`    [db] Updated ${u.email} creditUsd: ${currentUsd} -> ${targetCreditUsd}`);
    }

    if (send && u.email) {
      // Already-upgraded accounts keep the balance they have. A new apply announces the target.
      const announcedUsd = apply && u.credits === 20 ? targetCreditUsd : currentUsd;
      const sent = await sendMail({
        fromEmail: CREDIT_UPGRADE_FROM_EMAIL,
        to: u.email,
        subject: creditUpgradeEmailSubject(announcedUsd),
        text: creditUpgradeEmailText({
          recipientName: u.name,
          previousCreditUsd: previousUsd,
          newCreditUsd: announcedUsd,
          studioHref: "https://www.scro.io/app",
        }),
        html: creditUpgradeEmailHtml({
          recipientName: u.name,
          previousCreditUsd: previousUsd,
          newCreditUsd: announcedUsd,
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
