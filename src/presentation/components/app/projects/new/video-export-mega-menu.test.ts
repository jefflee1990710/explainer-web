import assert from "node:assert/strict";
import test from "node:test";
import {
  ALL_EXPORT_SHARE_TARGETS,
  buildExportShareTargetUrl,
} from "@/presentation/components/app/projects/new/video-export-mega-menu";

test("ALL_EXPORT_SHARE_TARGETS covers download, WhatsApp, IG Reel/Story/Post, and major social platforms", () => {
  const ids = ALL_EXPORT_SHARE_TARGETS.map((item) => item.id);
  assert.ok(ids.includes("download"));
  assert.ok(ids.includes("whatsapp"));
  assert.ok(ids.includes("native_share"));
  assert.ok(ids.includes("instagram_reel"));
  assert.ok(ids.includes("instagram_story"));
  assert.ok(ids.includes("instagram_post"));
  assert.ok(ids.includes("tiktok"));
  assert.ok(ids.includes("youtube_shorts"));
  assert.ok(ids.includes("threads"));
  assert.ok(ids.includes("facebook"));
  assert.ok(ids.includes("x"));
  assert.ok(ids.includes("xiaohongshu"));
});

test("buildExportShareTargetUrl formats WhatsApp, IG Reel/Story/Post, and social share URLs", () => {
  const wa = buildExportShareTargetUrl({
    targetId: "whatsapp",
    videoUrl: "https://blob.example/video.mp4",
    title: "My Reel",
  });
  assert.match(wa, /^https:\/\/wa\.me\/\?text=/);
  assert.match(decodeURIComponent(wa), /My Reel/);
  assert.match(decodeURIComponent(wa), /https:\/\/blob\.example\/video\.mp4/);

  assert.equal(
    buildExportShareTargetUrl({ targetId: "instagram_reel", title: "Reel" }),
    "https://www.instagram.com/reels/create/",
  );
  assert.equal(
    buildExportShareTargetUrl({ targetId: "instagram_story", title: "Story" }),
    "https://www.instagram.com/?story=create",
  );
  assert.equal(
    buildExportShareTargetUrl({ targetId: "instagram_post", title: "Post" }),
    "https://www.instagram.com/",
  );
  assert.equal(
    buildExportShareTargetUrl({ targetId: "tiktok", title: "TikTok" }),
    "https://www.tiktok.com/tiktokstudio/upload",
  );
  assert.match(
    buildExportShareTargetUrl({
      targetId: "x",
      videoUrl: "https://blob.example/video.mp4",
      title: "My Reel",
    }),
    /^https:\/\/x\.com\/intent\/post\?/,
  );
});
