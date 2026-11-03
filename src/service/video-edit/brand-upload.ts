import { randomUUID } from "node:crypto";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { requireAppUser } from "@/service/auth";
import { planBrandUpload } from "@/service/video-edit/edit-state";

type PrepareResult =
  | {
      ok: true;
      token: string;
      pathname: string;
      kind: "image" | "video";
      contentType: string;
    }
  | { ok: false; error: string };

// Mint a short-lived Blob token so the browser uploads the file directly.
// The old path posted the whole MP4 through a Server Action, then uploaded it again.
export async function prepareBrandUpload(input: {
  contentType: string;
  size: number;
  allowGif?: boolean;
}): Promise<PrepareResult> {
  const user = await requireAppUser();
  const plan = planBrandUpload(
    user.clerkUserId,
    { type: input.contentType, size: input.size },
    randomUUID(),
    { allowGif: input.allowGif },
  );
  if (!plan.ok) return plan;
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { ok: false, error: "尚未設定 Vercel Blob" };
  }
  try {
    const token = await generateClientTokenFromReadWriteToken({
      pathname: plan.pathname,
      maximumSizeInBytes: plan.maximumSizeInBytes,
      allowedContentTypes: plan.allowedContentTypes,
      validUntil: Date.now() + 15 * 60 * 1000,
      addRandomSuffix: false,
    });
    return {
      ok: true,
      token,
      pathname: plan.pathname,
      kind: plan.kind,
      contentType: plan.contentType,
    };
  } catch (error) {
    console.error("[brand-upload] client token failed", error);
    return { ok: false, error: "上傳失敗，請再試一次" };
  }
}
