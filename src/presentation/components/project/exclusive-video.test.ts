import assert from "node:assert/strict";
import { test } from "node:test";
import { pauseAllVideos, pauseOtherVideos } from "@/presentation/components/project/exclusive-video";

function fakeVideo(paused: boolean) {
  return {
    paused,
    pauseCalls: 0,
    pause() {
      this.paused = true;
      this.pauseCalls += 1;
    },
  };
}

test("pauseOtherVideos stops every playing video except the current one", () => {
  const current = fakeVideo(false);
  const otherPlaying = fakeVideo(false);
  const alreadyPaused = fakeVideo(true);
  pauseOtherVideos(current, [current, otherPlaying, alreadyPaused]);
  assert.equal(current.pauseCalls, 0);
  assert.equal(current.paused, false);
  assert.equal(otherPlaying.pauseCalls, 1);
  assert.equal(alreadyPaused.pauseCalls, 0);
});

test("pauseAllVideos stops every playing video", () => {
  const a = fakeVideo(false);
  const b = fakeVideo(true);
  pauseAllVideos([a, b]);
  assert.equal(a.pauseCalls, 1);
  assert.equal(b.pauseCalls, 0);
});
