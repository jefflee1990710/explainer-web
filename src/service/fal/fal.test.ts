import assert from "node:assert/strict";
import { test } from "node:test";
import {
  decodeFalSparseRle,
  normalizedBBoxFromMask,
  resizeBinaryMaskNearest,
} from "@/service/fal/rle";
import { resolveFalSam3RleFrames } from "@/service/fal/sam3-video";
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
