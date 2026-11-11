import {
  blockedUsersCollection,
  charactersCollection,
  jutsuJobsCollection,
  lifeShotsCollection,
  usersCollection,
  videosCollection,
} from "@/dao";
import { isEmailOrUidBlocked, normalizeEmail } from "@/dao/blocked-users";
import { adminAuth } from "@/service/firebase/admin";
import { deleteExplainerBlobUrls } from "@/util/blob/delete-urls";

export { isEmailOrUidBlocked };

export type BlockUserInput = {
  email: string;
  clerkUserId?: string;
  reason: string;
  blockedBy?: string;
  notes?: string;
  ip?: string;
};

/**
 * Permanently blocks an account, disables Firebase credentials, saves the block reason in `blocked_users`,
 * marks the user in `users`, and purges all uploaded and generated media files from Vercel Blob while
 * preserving the user and document records for legal/audit compliance.
 */
export async function blockUserAndPurgeMedia(input: BlockUserInput): Promise<{
  ok: boolean;
  purgedBlobUrlsCount: number;
  error?: string;
}> {
  try {
    const normalizedEmail = normalizeEmail(input.email);
    const usersCol = await usersCollection();
    const blockedCol = await blockedUsersCollection();
    const now = new Date();

    // 1. Find the target user in Mongo
    const query: Record<string, unknown>[] = [{ email: { $regex: `^${normalizedEmail}$`, $options: "i" } }];
    if (input.clerkUserId?.trim()) {
      query.push({ clerkUserId: input.clerkUserId.trim() });
    }
    const userDoc = await usersCol.findOne({ $or: query });
    const clerkUserId = userDoc?.clerkUserId || input.clerkUserId?.trim();

    // 2. Insert or update record in `blocked_users`
    await blockedCol.updateOne(
      { email: normalizedEmail },
      {
        $set: {
          email: normalizedEmail,
          clerkUserId: clerkUserId || undefined,
          reason: input.reason,
          blockedAt: now,
          blockedBy: input.blockedBy || "admin",
          ip: input.ip,
          notes: input.notes,
        },
      },
      { upsert: true },
    );

    // 3. Mark user document as blocked and zero out credits
    if (userDoc) {
      await usersCol.updateOne(
        { _id: userDoc._id },
        {
          $set: {
            isBlocked: true,
            blockedReason: input.reason,
            blockedAt: now,
            credits: 0,
            bonusCredits: 0,
            updatedAt: now,
          },
        },
      );
    }

    // 4. Disable user in Firebase Auth & revoke session tokens
    if (clerkUserId) {
      try {
        const auth = adminAuth();
        await auth.updateUser(clerkUserId, { disabled: true });
        await auth.revokeRefreshTokens(clerkUserId);
      } catch (fbErr) {
        console.error("[account-block] Firebase disable failed:", fbErr);
      }
    }

    // 5. Gather all media Blob URLs owned by this user
    const blobUrlsToPurge = new Set<string>();

    if (clerkUserId) {
      const [jutsuCol, videosCol, charsCol, lifeCol] = await Promise.all([
        jutsuJobsCollection(),
        videosCollection(),
        charactersCollection(),
        lifeShotsCollection(),
      ]);

      const [jutsuJobs, videos, characters, lifeShots] = await Promise.all([
        jutsuCol.find({ clerkUserId }).toArray(),
        videosCol.find({ clerkUserId }).toArray(),
        charsCol.find({ clerkUserId }).toArray(),
        lifeCol.find({ clerkUserId }).toArray(),
      ]);

      // Collect from Jutsu
      for (const j of jutsuJobs) {
        if (j.sourceVideoUrl) blobUrlsToPurge.add(j.sourceVideoUrl);
        if (j.referenceImageUrl) blobUrlsToPurge.add(j.referenceImageUrl);
        for (const url of j.referenceImageUrls || []) {
          if (url) blobUrlsToPurge.add(url);
        }
        if (j.rawStartFrameUrl) blobUrlsToPurge.add(j.rawStartFrameUrl);
        if (j.preparedStartFrameUrl) blobUrlsToPurge.add(j.preparedStartFrameUrl);
        if (j.outputVideoUrl) blobUrlsToPurge.add(j.outputVideoUrl);
        if (j.outputImageUrl) blobUrlsToPurge.add(j.outputImageUrl);
      }

      // Collect from Videos
      for (const v of videos) {
        if (v.reelUrl) blobUrlsToPurge.add(v.reelUrl);
        if (v.finalUrl) blobUrlsToPurge.add(v.finalUrl);
        for (const f of v.frames || []) {
          if (f.outputUrl) blobUrlsToPurge.add(f.outputUrl);
          if (f.blobUrl) blobUrlsToPurge.add(f.blobUrl);
        }
        for (const c of v.clips || []) {
          if (c.outputUrl) blobUrlsToPurge.add(c.outputUrl);
          if (c.blobUrl) blobUrlsToPurge.add(c.blobUrl);
        }
      }

      // Collect from Characters
      for (const c of characters) {
        for (const ver of c.versions || []) {
          if (ver.referenceImageUrl) blobUrlsToPurge.add(ver.referenceImageUrl);
          for (const u of ver.referenceImageUrls || []) {
            if (u) blobUrlsToPurge.add(u);
          }
          if (ver.portraitUrl) blobUrlsToPurge.add(ver.portraitUrl);
          if (ver.blueprintUrl) blobUrlsToPurge.add(ver.blueprintUrl);
          if (ver.profileUrl) blobUrlsToPurge.add(ver.profileUrl);
        }
      }

      // Collect from Life Shots
      for (const s of lifeShots) {
        if (s.sceneImageUrl) blobUrlsToPurge.add(s.sceneImageUrl);
        if (s.resultUrl) blobUrlsToPurge.add(s.resultUrl);
      }

      // 6. Delete Blob URLs from storage
      const urlList = Array.from(blobUrlsToPurge).filter(Boolean);
      if (urlList.length > 0) {
        try {
          await deleteExplainerBlobUrls(urlList);
        } catch (delErr) {
          console.error("[account-block] Vercel blob deletion error:", delErr);
        }
      }

      // 7. Update DB records: mark status as nsfw_blocked and clear output URLs
      await jutsuCol.updateMany(
        { clerkUserId },
        {
          $set: {
            status: "failed",
            error: `NSFW_BLOCKED: ${input.reason}`,
            outputVideoUrl: undefined,
            outputImageUrl: undefined,
            updatedAt: now,
          },
        },
      );

      await videosCol.updateMany(
        { clerkUserId },
        {
          $set: {
            status: "failed",
            error: `NSFW_BLOCKED: ${input.reason}`,
            reelUrl: undefined,
            finalUrl: undefined,
            updatedAt: now,
          },
        },
      );
    }

    return { ok: true, purgedBlobUrlsCount: blobUrlsToPurge.size };
  } catch (error) {
    console.error("[account-block] failed to block user:", error);
    return {
      ok: false,
      purgedBlobUrlsCount: 0,
      error: error instanceof Error ? error.message : "無法封鎖用戶",
    };
  }
}
