import assert from "node:assert/strict";
import test from "node:test";
import { binaryMaskIoU } from "@/service/fal/rle";
import {
  detectPostElementsWithFalSam3,
  discoverPostObjectsWithVlm,
} from "@/service/fal/sam3-post";

test("binaryMaskIoU computes intersection-over-union for binary masks", () => {
  const a = new Uint8Array([1, 1, 0, 0]);
  const b = new Uint8Array([1, 0, 1, 0]);
  assert.equal(Math.round(binaryMaskIoU(a, b) * 100), 33);
  assert.equal(binaryMaskIoU(a, a), 1);
});

test("discoverPostObjectsWithVlm parses VLM JSON and falls back cleanly on error", async () => {
  const prevKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = "test-or-key";
  try {
    const okRes = await discoverPostObjectsWithVlm(Buffer.from("fake-jpg"), {
      fetch: (async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content:
                    '```json\n{"objects":[{"prompt":"perfume bottle","labelEn":"Perfume Bottle","labelZh":"香水瓶"}],"hasText":true}\n```',
                },
              },
            ],
          }),
          { status: 200 },
        )) as typeof fetch,
    });
    assert.equal(okRes.objects.length, 1);
    assert.equal(okRes.objects[0]?.prompt, "perfume bottle");
    assert.equal(okRes.objects[0]?.labelZh, "香水瓶");
    assert.equal(okRes.hasText, true);

    const fallbackRes = await discoverPostObjectsWithVlm(Buffer.from("fake-jpg"), {
      fetch: (async () => new Response("server error", { status: 500 })) as typeof fetch,
    });
    assert.equal(fallbackRes.objects.length, 1);
    assert.equal(fallbackRes.objects[0]?.labelEn, "Object");
    assert.equal(fallbackRes.hasText, true);
  } finally {
    process.env.OPENROUTER_API_KEY = prevKey;
  }
});

test("detectPostElementsWithFalSam3 segments person, text, and object masks and filters overlapping object masks", async () => {
  const prevFal = process.env.FAL_KEY;
  const prevOr = process.env.OPENROUTER_API_KEY;
  process.env.FAL_KEY = "test-fal-key";
  process.env.OPENROUTER_API_KEY = "test-or-key";

  const fakeFetch: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes("openrouter.ai")) {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  objects: [{ prompt: "perfume bottle", labelEn: "Perfume Bottle", labelZh: "香水瓶" }],
                  hasText: true,
                }),
              },
            },
          ],
        }),
        { status: 200 },
      );
    }
    if (url.includes("rest.alpha.fal.ai/storage/upload/initiate")) {
      return new Response(
        JSON.stringify({
          upload_url: "https://upload.fal.test/put",
          file_url: "https://v3.fal.media/files/post.jpg",
        }),
        { status: 200 },
      );
    }
    if (url === "https://upload.fal.test/put") {
      return new Response("", { status: 200 });
    }
    if (url === "https://queue.fal.run/fal-ai/sam-3/image-rle") {
      const body = init?.body ? (JSON.parse(String(init.body)) as { prompt?: string }) : {};
      const kind =
        body.prompt === "person"
          ? "person"
          : body.prompt?.includes("text")
            ? "text"
            : "object";
      return new Response(
        JSON.stringify({
          request_id: `req-${kind}`,
          status_url: `https://queue.fal.run/status/${kind}`,
          response_url: `https://queue.fal.run/result/${kind}`,
        }),
        { status: 200 },
      );
    }
    if (url.startsWith("https://queue.fal.run/status/")) {
      return new Response(JSON.stringify({ status: "COMPLETED" }), { status: 200 });
    }
    if (url === "https://queue.fal.run/result/person") {
      return new Response(JSON.stringify({ rle: ["0 20"], scores: [0.95] }), { status: 200 });
    }
    if (url === "https://queue.fal.run/result/text") {
      return new Response(JSON.stringify({ rle: ["30 10"], scores: [0.92] }), { status: 200 });
    }
    if (url === "https://queue.fal.run/result/object") {
      return new Response(
        JSON.stringify({ rle: ["0 20", "60 20"], scores: [0.88, 0.91] }),
        { status: 200 },
      );
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  try {
    const elements = await detectPostElementsWithFalSam3(
      { imageBuffer: Buffer.from("fake-jpg"), width: 10, height: 10 },
      { fetch: fakeFetch },
    );
    assert.equal(elements.length, 3);
    assert.deepEqual(
      elements.map((e) => ({ id: e.id, category: e.category, label: e.label, labelZh: e.labelZh })),
      [
        { id: "person-1", category: "person", label: "Person #1", labelZh: "人物 #1" },
        { id: "object-1", category: "object", label: "Perfume Bottle", labelZh: "香水瓶" },
        { id: "text-1", category: "text", label: "Text #1", labelZh: "文字 #1" },
      ],
    );
  } finally {
    process.env.FAL_KEY = prevFal;
    process.env.OPENROUTER_API_KEY = prevOr;
  }
});
