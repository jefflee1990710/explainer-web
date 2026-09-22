import { revalidatePath } from "next/cache";
import { type OptionalId } from "mongodb";
import { requireAppUser } from "@/service/auth";
import { ensureAffiliateProfile } from "@/service/affiliate/engine";
import { PAYOUT_MIN_CENTS } from "@/service/affiliate/rates";
import {
  affiliateLedgerCollection,
  affiliatesCollection,
  payoutRequestsCollection,
  usersCollection,
} from "@/dao";
import { getAppUrl } from "@/util/app-url";
import type { PayoutRequest } from "@/model/affiliate";
import type { AppUser } from "@/model/user";

function formatUsd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

export async function requestPayoutAction() {
  try {
    const user = await requireAppUser();
    const profile = await ensureAffiliateProfile(user);
    if (profile.pendingCents < PAYOUT_MIN_CENTS) {
      return {
        ok: false as const,
        error: `最低提領 $${PAYOUT_MIN_CENTS / 100}（目前 ${formatUsd(profile.pendingCents)}）`,
      };
    }

    const payouts = await payoutRequestsCollection();
    const existing = await payouts.findOne({
      clerkUserId: user.clerkUserId,
      status: "pending",
    });
    if (existing) {
      return { ok: false as const, error: "已有進行中的提領申請" };
    }

    const amountCents = profile.pendingCents;
    const now = new Date();
    const doc: OptionalId<PayoutRequest> = {
      clerkUserId: user.clerkUserId,
      amountCents,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };
    await payouts.insertOne(doc);

    const affiliates = await affiliatesCollection();
    await affiliates.updateOne(
      { clerkUserId: user.clerkUserId, pendingCents: { $gte: amountCents } },
      {
        // Hold funds until manually marked paid — do not credit paidCents yet.
        $inc: { pendingCents: -amountCents },
        $set: { updatedAt: now },
      },
    );

    const ledger = await affiliateLedgerCollection();
    await ledger.insertOne({
      affiliateClerkUserId: user.clerkUserId,
      sourceClerkUserId: user.clerkUserId,
      tier: 1,
      kind: "payout",
      amountCents: -amountCents,
      rate: 0,
      baseAmountCents: amountCents,
      eventKey: `payout:${user.clerkUserId}:${now.getTime()}`,
      createdAt: now,
    });

    revalidatePath("/app/affiliate");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "提領失敗",
    };
  }
}

export async function getAffiliateDashboardData() {
  const user = await requireAppUser();
  const profile = await ensureAffiliateProfile(user);
  const appUrl = getAppUrl();

  const users = await usersCollection();
  const downline = await users
    .find({ uplineUserIds: user._id })
    .project<
      Pick<AppUser, "_id" | "clerkUserId" | "email" | "name" | "createdAt" | "uplineUserIds">
    >({ clerkUserId: 1, email: 1, name: 1, createdAt: 1, uplineUserIds: 1 })
    .toArray();

  const ledger = await affiliateLedgerCollection();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const monthEntries = await ledger
    .find({
      affiliateClerkUserId: user.clerkUserId,
      createdAt: { $gte: monthStart },
      kind: { $in: ["buy", "consume"] },
    })
    .toArray();
  const thisMonthCents = monthEntries.reduce((sum, e) => sum + e.amountCents, 0);

  const pendingPayout = await (
    await payoutRequestsCollection()
  ).findOne({ clerkUserId: user.clerkUserId, status: "pending" });

  // Per-downline aggregates from ledger where this user earned.
  const allEarn = await ledger
    .find({
      affiliateClerkUserId: user.clerkUserId,
      kind: { $in: ["buy", "consume"] },
    })
    .toArray();

  const bySource = new Map<
    string,
    { boughtCents: number; consumedCredits: number; earnedCents: number }
  >();
  for (const entry of allEarn) {
    const row = bySource.get(entry.sourceClerkUserId) || {
      boughtCents: 0,
      consumedCredits: 0,
      earnedCents: 0,
    };
    if (entry.kind === "buy") row.boughtCents += entry.baseAmountCents;
    if (entry.kind === "consume") row.consumedCredits += entry.credits || 0;
    row.earnedCents += entry.amountCents;
    bySource.set(entry.sourceClerkUserId, row);
  }

  const downlineRows = downline.map((member) => {
    const tierIndex = (member.uplineUserIds || []).findIndex((id) =>
      id.equals(user._id),
    );
    const stats = bySource.get(member.clerkUserId) || {
      boughtCents: 0,
      consumedCredits: 0,
      earnedCents: 0,
    };
    return {
      id: member._id.toHexString(),
      email: maskEmail(member.email || ""),
      name: member.name || "User",
      tier: (tierIndex >= 0 ? tierIndex + 1 : 1) as 1 | 2 | 3,
      boughtUsd: formatUsd(stats.boughtCents),
      consumedCredits: stats.consumedCredits,
      earnedUsd: formatUsd(stats.earnedCents),
    };
  });

  return {
    code: profile.code,
    link: `${appUrl}/r/${profile.code}`,
    pendingUsd: formatUsd(profile.pendingCents),
    paidUsd: formatUsd(profile.paidCents),
    thisMonthUsd: formatUsd(thisMonthCents),
    pendingCents: profile.pendingCents,
    canPayout: profile.pendingCents >= PAYOUT_MIN_CENTS && !pendingPayout,
    payoutPending: Boolean(pendingPayout),
    downline: downlineRows,
  };
}
