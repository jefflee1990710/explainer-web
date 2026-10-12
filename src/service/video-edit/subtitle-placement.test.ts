import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSubtitleOverlayFilter, subtitlePlacement } from "@/service/video-edit/subtitle-placement";

test("9:16 plate center sits at 62 percent; 16:9 sits above the bottom", () => {
  const reel = subtitlePlacement("9:16", 1080, 1920);
  assert.equal(reel.w, 842);
  assert.equal(reel.x, "(main_w-overlay_w)/2");
  assert.equal(reel.y, "1190-(overlay_h/2)");
  const wide = subtitlePlacement("16:9", 1920, 1080);
  assert.equal(wide.w, 1498);
  assert.equal(wide.y, "main_h-overlay_h-86");
});

test("overlay filter fades each plate for 0.4s", () => {
  const filter = buildSubtitleOverlayFilter({
    count: 2,
    hasAudio: true,
    durations: [5, 6],
    aspect: "9:16",
    width: 1080,
    height: 1920,
  });
  assert.match(filter, /\[2:v\]scale=842:-1/);
  assert.match(filter, /fade=t=in:st=0:d=0\.4:alpha=1/);
  assert.match(filter, /fade=t=out:st=4\.6:d=0\.4:alpha=1/);
  assert.match(filter, /\[3:v\]scale=842:-1/);
  assert.match(filter, /overlay=/);
});
