"use server";

import { prepareBrandUpload } from "@/service/video-edit/brand-upload";

// Kept in its own action module so picking a video does not load the FFmpeg edit pipeline.
export async function prepareBrandUploadAction(...args: Parameters<typeof prepareBrandUpload>) {
  return prepareBrandUpload(...args);
}
