import assert from "node:assert/strict";
import test from "node:test";
import { ACADEMY_LESSONS } from "@/service/academy/catalog/lessons";
import {
  ACADEMY_LESSON_VIDEO_VERSION,
  ACADEMY_VIDEO_BEAT_COUNT,
  ACADEMY_VIDEO_BEAT_SECONDS,
  ACADEMY_VIDEO_SECONDS,
  academyLessonMotion,
  academyLessonNeedsVideo,
  academyLessonVideoBeats,
  academyLessonVoiceover,
  academyLessonVoiceoverWordCount,
} from "@/service/academy/catalog/video";

test("academy lesson videos are four 15-second beats that cover the lesson", () => {
  assert.equal(ACADEMY_VIDEO_BEAT_SECONDS, 15);
  assert.equal(ACADEMY_VIDEO_BEAT_COUNT, 4);
  assert.equal(ACADEMY_VIDEO_SECONDS, 60);
  assert.equal(ACADEMY_LESSON_VIDEO_VERSION, 2);

  for (const lesson of ACADEMY_LESSONS) {
    const beats = academyLessonVideoBeats(lesson);
    assert.equal(beats.length, 4);
    assert.deepEqual(
      beats.map((beat) => beat.durationSeconds),
      [15, 15, 15, 15],
    );
    assert.deepEqual(
      beats.map((beat) => beat.frame),
      ["image1", "image1", "image2", "image2"],
    );
    assert.ok(beats.every((beat) => beat.spoken.trim().length > 0));
    assert.ok(beats[0].spoken.startsWith(lesson.excerpt.trim().slice(0, 24)));
    assert.match(beats[0].prompt, /Spoken line, exactly:/);
    assert.match(beats[0].prompt, /15-second beat 1 of 4/);
    assert.match(beats[0].prompt, /60-second/);
    assert.ok(academyLessonVoiceoverWordCount(lesson) >= 40);
    assert.ok(academyLessonVoiceoverWordCount(lesson) <= 170);
    assert.match(academyLessonVoiceover(lesson), /1\./);
  }
});

test("academy lesson motion comes from the stored video prompt", () => {
  const motion = academyLessonMotion(
    'Spoken line, exactly: "Hook, proof, payoff, then one ask." Motion: the four cards appear in order.',
  );
  assert.equal(motion, "the four cards appear in order.");
});

test("stale bumper clips regenerate until videoVersion is 2", () => {
  assert.equal(academyLessonNeedsVideo(undefined), true);
  assert.equal(academyLessonNeedsVideo({ video: "https://cdn.example/old.mp4" }), true);
  assert.equal(
    academyLessonNeedsVideo({ video: "https://cdn.example/old.mp4", videoVersion: 1 }),
    true,
  );
  assert.equal(
    academyLessonNeedsVideo({ video: "https://cdn.example/new.mp4", videoVersion: 2 }),
    false,
  );
  assert.equal(
    academyLessonNeedsVideo({ video: "https://cdn.example/new.mp4", videoVersion: 2 }, true),
    true,
  );
});
