import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ALICLOUD_VIDEO_MODEL,
  dashscopeError,
  dashscopeTaskUrl,
  imageSizeForRatio,
  isAlicloudStatusUrl,
  mapDashscopeStatus,
  mediaUrlFromDashscope,
  wan3ClipVideoBody,
  wanClipVideoParameters,
  wanDurationSeconds,
} from "./dashscope";

test("imageSizeForRatio maps project ratios to Qwen pixel sizes", () => {
  assert.equal(imageSizeForRatio("16:9"), "1920*1080");
  assert.equal(imageSizeForRatio("9:16"), "1080*1920");
  assert.equal(imageSizeForRatio("1:1"), "1328*1328");
});

test("wanDurationSeconds clamps clip length to Wan 3.0's 2–30s range", () => {
  assert.equal(wanDurationSeconds(1), 2);
  assert.equal(wanDurationSeconds(3.4), 3);
  assert.equal(wanDurationSeconds(8), 8);
  assert.equal(wanDurationSeconds(20), 20);
  assert.equal(wanDurationSeconds(40), 30);
});

test("wan3 clip body locks first/last frames and native speech", () => {
  const body = wan3ClipVideoBody({
    prompt: 'Dialogue (audio-only): "你好。"',
    durationSeconds: 6,
    startImageUrl: "https://start",
    endImageUrl: "https://end",
  });
  assert.equal(ALICLOUD_VIDEO_MODEL, "wan3.0-video");
  assert.equal(body.model, "wan3.0-video");
  assert.deepEqual(body.input.media, [
    { type: "first_frame", url: "https://start" },
    { type: "last_frame", url: "https://end" },
  ]);
  assert.equal(
    body.input.media.every((item) => item.type === "first_frame" || item.type === "last_frame"),
    true,
  );
  assert.doesNotMatch(JSON.stringify(body), /reference_/);
  assert.match(body.input.prompt, /FIRST FRAME/);
  assert.match(body.input.prompt, /LAST FRAME/);
  assert.match(body.input.prompt, /Do not treat them as .*reference/i);
  assert.match(body.input.prompt, /你好/);
  assert.deepEqual(wanClipVideoParameters(6), {
    resolution: "720P",
    ratio: "adaptive",
    duration: 6,
    audio: true,
    prompt_extend: false,
    watermark: false,
  });
  assert.equal(body.parameters.audio, true);
});

test("mapDashscopeStatus follows PENDING → RUNNING → SUCCEEDED/FAILED", () => {
  assert.equal(mapDashscopeStatus("PENDING"), "queued");
  assert.equal(mapDashscopeStatus("RUNNING"), "in_progress");
  assert.equal(mapDashscopeStatus("SUCCEEDED"), "completed");
  assert.equal(mapDashscopeStatus("FAILED"), "failed");
  assert.equal(mapDashscopeStatus("CANCELED"), "failed");
});

test("mediaUrlFromDashscope reads image results, video_url, and multimodal choices", () => {
  assert.equal(
    mediaUrlFromDashscope({
      output: { results: [{ url: "https://img" }] },
    }),
    "https://img",
  );
  assert.equal(
    mediaUrlFromDashscope({
      output: { video_url: "https://vid.mp4" },
    }),
    "https://vid.mp4",
  );
  assert.equal(
    mediaUrlFromDashscope({
      output: {
        choices: [{ message: { content: [{ image: "https://edit" }] } }],
      },
    }),
    "https://edit",
  );
  assert.equal(mediaUrlFromDashscope({}), undefined);
});

test("isAlicloudStatusUrl matches intl and CN task URLs", () => {
  assert.equal(
    isAlicloudStatusUrl("https://dashscope-intl.aliyuncs.com/api/v1/tasks/abc"),
    true,
  );
  assert.equal(
    isAlicloudStatusUrl("https://dashscope.aliyuncs.com/api/v1/tasks/abc"),
    true,
  );
  assert.equal(
    isAlicloudStatusUrl("https://platform.higgsfield.ai/requests/abc"),
    false,
  );
});

test("dashscopeTaskUrl and dashscopeError keep polling wired to the same region", () => {
  assert.equal(
    dashscopeTaskUrl("https://dashscope-intl.aliyuncs.com/api/v1/", "t1"),
    "https://dashscope-intl.aliyuncs.com/api/v1/tasks/t1",
  );
  assert.equal(
    dashscopeError({ code: "InvalidParameter", message: "bad size" }),
    "InvalidParameter: bad size",
  );
  assert.equal(
    dashscopeError({ output: { code: "Failed", message: "policy" } }),
    "Failed: policy",
  );
});
