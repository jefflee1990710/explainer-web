import assert from "node:assert/strict";
import { test } from "node:test";
import {
  computeMaskInteriorAnchorPoint,
  decodeFalSparseRle,
  maskForegroundRatio,
  normalizedBBoxFromMask,
  resizeBinaryMaskNearest,
  unionBinaryMasks,
} from "@/service/fal/rle";
import { detectPeopleWithFalSam3ImageRle } from "@/service/fal/sam3-image";
import {
  resolveFalSam3RleFrames,
  segmentVideoWithFalSam3Rle,
} from "@/service/fal/sam3-video";
import { falQueueSubscribe } from "@/service/fal/queue";
import { uploadFalBuffer } from "@/service/fal/storage";

test("decodeFalSparseRle paints row-major (index, length) runs", () => {
  const width = 8;
  const height = 4;
  // Mark pixels 10..12 (row1 cols 2-4) via "10 3"
  const mask = decodeFalSparseRle("10 3", width, height);
  assert.equal(mask.length, 32);
  assert.equal(mask[9], 0);
  assert.equal(mask[10], 1);
  assert.equal(mask[11], 1);
  assert.equal(mask[12], 1);
  assert.equal(mask[13], 0);
  assert.deepEqual(normalizedBBoxFromMask(mask, width, height), {
    x: 2 / 8,
    y: 1 / 4,
    width: 3 / 8,
    height: 1 / 4,
  });
  assert.equal(decodeFalSparseRle("", width, height).some((v) => v), false);
});

test("resizeBinaryMaskNearest keeps occupied cells under nearest mapping", () => {
  const src = new Uint8Array(4);
  src[0] = 1;
  const dst = resizeBinaryMaskNearest(src, 2, 2, 4, 4);
  assert.equal(dst.length, 16);
  assert.equal(dst[0], 1);
  assert.equal(dst[1], 1);
  assert.equal(dst[4], 1);
});

test("resolveFalSam3RleFrames accepts inline string arrays", async () => {
  const frames = await resolveFalSam3RleFrames(["", "1 2", "3 4"]);
  assert.deepEqual(frames, ["", "1 2", "3 4"]);
});

test("uploadFalBuffer + falQueueSubscribe use Authorization Key header (mocked)", async () => {
  process.env.FAL_KEY = "fal_sk_test:secret";
  const calls: Array<{ url: string; method?: string; auth?: string }> = [];

  const fakeFetch: typeof fetch = async (input, init) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    calls.push({
      url,
      method: init?.method,
      auth: headers.get("Authorization") || undefined,
    });

    if (url.includes("/storage/upload/initiate")) {
      return new Response(
        JSON.stringify({
          upload_url: "https://upload.test/put",
          file_url: "https://cdn.test/file.mp4",
        }),
        { status: 200 },
      );
    }
    if (url === "https://upload.test/put") {
      return new Response(null, { status: 200 });
    }
    if (url === "https://queue.fal.run/fal-ai/sam-3/video-rle") {
      return new Response(
        JSON.stringify({
          request_id: "req-1",
          status_url: "https://queue.fal.run/status/req-1",
          response_url: "https://queue.fal.run/result/req-1",
        }),
        { status: 200 },
      );
    }
    if (url === "https://queue.fal.run/status/req-1") {
      return new Response(JSON.stringify({ status: "COMPLETED" }), { status: 200 });
    }
    if (url === "https://queue.fal.run/result/req-1") {
      return new Response(JSON.stringify({ rle: ["0 1", ""] }), { status: 200 });
    }
    return new Response("unexpected", { status: 500 });
  };

  const url = await uploadFalBuffer(
    { bytes: Buffer.from("abc"), fileName: "clip.mp4", contentType: "video/mp4" },
    { fetch: fakeFetch },
  );
  assert.equal(url, "https://cdn.test/file.mp4");

  const result = await falQueueSubscribe<{ rle: string[] }>(
    "fal-ai/sam-3/video-rle",
    { video_url: url, prompt: "person" },
    { fetch: fakeFetch, pollIntervalMs: 1 },
  );
  assert.deepEqual(result.rle, ["0 1", ""]);
  assert.ok(calls.every((c) => !c.auth || c.auth === "Key fal_sk_test:secret" || c.url.includes("upload.test")));
});

test("computeMaskInteriorAnchorPoint picks a foreground pixel inside concave masks and unionBinaryMasks merges masks", () => {
  const maskA = decodeFalSparseRle("11 1 21 1 31 1", 10, 10);
  const maskB = decodeFalSparseRle("18 1 28 1 38 1", 10, 10);

  const anchorA = computeMaskInteriorAnchorPoint(maskA, 10, 10);
  assert.ok(anchorA);
  assert.equal(anchorA.x, 0.15);
  assert.equal(anchorA.y, 0.25);

  const merged = unionBinaryMasks([maskA, maskB], 100);
  assert.equal(merged[21], 1);
  assert.equal(merged[28], 1);
  assert.equal(merged[25], 0);
  assert.equal(maskForegroundRatio(merged), 6 / 100);
});

test("detectPeopleWithFalSam3ImageRle decodes multi-person RLE masks, filters noise, and sorts left-to-right", async () => {
  process.env.FAL_KEY = "fal_sk_test:secret";
  const rightPersonRle = "54 3 74 3 94 3 114 3 134 3";
  const leftPersonRle = "42 3 62 3 82 3 102 3 122 3";
  const tinyNoiseRle = "0 1";

  const fakeFetch: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes("/storage/upload/initiate")) {
      return new Response(
        JSON.stringify({
          upload_url: "https://upload.test/put-img",
          file_url: "https://cdn.test/frame0.jpg",
        }),
        { status: 200 },
      );
    }
    if (url === "https://upload.test/put-img") {
      return new Response(null, { status: 200 });
    }
    if (url === "https://queue.fal.run/fal-ai/sam-3/image-rle") {
      return new Response(
        JSON.stringify({
          request_id: "img-req-1",
          status_url: "https://queue.fal.run/status/img-req-1",
          response_url: "https://queue.fal.run/result/img-req-1",
        }),
        { status: 200 },
      );
    }
    if (url === "https://queue.fal.run/status/img-req-1") {
      return new Response(JSON.stringify({ status: "COMPLETED" }), { status: 200 });
    }
    if (url === "https://queue.fal.run/result/img-req-1") {
      return new Response(
        JSON.stringify({
          rle: [rightPersonRle, leftPersonRle, tinyNoiseRle],
          scores: [0.92, 0.95, 0.41],
          metadata: [
            { index: 0, score: 0.92 },
            { index: 1, score: 0.95 },
            { index: 2, score: 0.41 },
          ],
        }),
        { status: 200 },
      );
    }
    return new Response("unexpected", { status: 500 });
  };

  const people = await detectPeopleWithFalSam3ImageRle(
    {
      imageBuffer: Buffer.from("fake-jpeg"),
      width: 20,
      height: 10,
    },
    { fetch: fakeFetch, pollIntervalMs: 1 },
  );

  assert.equal(people.length, 2);
  assert.equal(people[0]!.personIndex, 1);
  assert.equal(people[0]!.objectId, 1);
  assert.equal(people[0]!.label, "Person #1");
  assert.ok(people[0]!.box.x < people[1]!.box.x);
  assert.equal(people[1]!.personIndex, 2);
  assert.equal(people[1]!.objectId, 0);
  assert.equal(people[1]!.label, "Person #2");
});

test("segmentVideoWithFalSam3Rle forwards pointPrompts with object_id and foreground/background labels", async () => {
  process.env.FAL_KEY = "fal_sk_test:secret";
  let submittedPayload: Record<string, unknown> | null = null;

  const fakeFetch: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.includes("/storage/upload/initiate")) {
      return new Response(
        JSON.stringify({
          upload_url: "https://upload.test/put-vid",
          file_url: "https://cdn.test/sec.mp4",
        }),
        { status: 200 },
      );
    }
    if (url === "https://upload.test/put-vid") {
      return new Response(null, { status: 200 });
    }
    if (url === "https://queue.fal.run/fal-ai/sam-3/video-rle") {
      submittedPayload = JSON.parse(String(init?.body || "{}"));
      return new Response(
        JSON.stringify({
          request_id: "vid-req-1",
          status_url: "https://queue.fal.run/status/vid-req-1",
          response_url: "https://queue.fal.run/result/vid-req-1",
        }),
        { status: 200 },
      );
    }
    if (url === "https://queue.fal.run/status/vid-req-1") {
      return new Response(JSON.stringify({ status: "COMPLETED" }), { status: 200 });
    }
    if (url === "https://queue.fal.run/result/vid-req-1") {
      return new Response(JSON.stringify({ rle: ["10 5"] }), { status: 200 });
    }
    return new Response("unexpected", { status: 500 });
  };

  await segmentVideoWithFalSam3Rle(
    {
      videoBuffer: Buffer.from("mp4"),
      prompt: "person",
      pointPrompts: [
        { x: 120, y: 240, label: 1, frame_index: 0, object_id: 1 },
        { x: 400, y: 250, label: 0, frame_index: 0, object_id: 1 },
      ],
    },
    { fetch: fakeFetch, pollIntervalMs: 1 },
  );

  assert.deepEqual(submittedPayload?.point_prompts, [
    { x: 120, y: 240, label: 1, frame_index: 0, object_id: 1 },
    { x: 400, y: 250, label: 0, frame_index: 0, object_id: 1 },
  ]);
});
