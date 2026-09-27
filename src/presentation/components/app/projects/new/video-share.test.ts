import assert from "node:assert/strict";
import { test } from "node:test";
import {
  VIDEO_SHARE_TARGETS,
  canPostVideoUrl,
  videoFileName,
  videoShareHref,
} from "@/presentation/components/app/projects/new/video-share";
import type { PublicVideo } from "@/presentation/serialize";

function video(title: string): PublicVideo {
  return { phaseA: { localizedTitle: title } } as PublicVideo;
}

test("share targets include Instagram Facebook TikTok", () => {
  const ids = VIDEO_SHARE_TARGETS.map((item) => item.id);
  assert.deepEqual(ids, ["instagram", "facebook", "tiktok", "youtube", "x"]);
});

test("file name strips path characters", () => {
  assert.equal(videoFileName(video('預測/下一個字:part?')), "預測 下一個字 part.mp4");
});

test("facebook and x encode the public video url", () => {
  const href = videoShareHref("facebook", "https://cdn.example.com/a.mp4");
  assert.match(href, /facebook.com\/sharer/);
  assert.match(href, /cdn.example.com/);
  assert.match(videoShareHref("x", "https://cdn.example.com/a.mp4"), /twitter.com\/intent/);
});

test("instagram and tiktok open upload pages", () => {
  assert.match(videoShareHref("instagram", "https://x"), /instagram.com/);
  assert.match(videoShareHref("tiktok", "https://x"), /tiktok.com/);
  assert.match(videoShareHref("youtube", "https://x"), /youtube.com\/upload/);
});

test("localhost video urls are not posted to facebook", () => {
  assert.equal(canPostVideoUrl("http://localhost:3000/a.mp4"), false);
  assert.equal(canPostVideoUrl("https://public.blob.vercel-storage.com/a.mp4"), true);
});
