import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MENTALOK_DEFAULT_BASE_URL,
  MENTALOK_MAX_UPLOAD_BYTES,
  createMentalokJob,
  ensureMentalokUrl,
  getMentalokJob,
  hasMentalokApiKey,
  listMentalokModels,
  uploadMentalokMedia,
} from "@/service/mentalok/client";

describe("mentalok client", () => {
  it("lists enabled models with Bearer auth and parses live pricing", async () => {
    let seenAuth = "";
    const fakeFetch: typeof fetch = async (url, init) => {
      seenAuth = String((init?.headers as Record<string, string>)?.Authorization || "");
      assert.equal(String(url), `${MENTALOK_DEFAULT_BASE_URL}/api/v1/models`);
      return new Response(
        JSON.stringify({
          models: [
            {
              id: "flux-2-klein-4b",
              name: "FLUX.2 [klein] 4B",
              category: "IMAGE",
              priceUsd: 0.0012,
              status: "warm",
              presets: ["flux2-klein-square", "flux2-klein-portrait"],
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const models = await listMentalokModels({
      apiKey: "mtk_live_test",
      fetch: fakeFetch,
    });
    assert.equal(seenAuth, "Bearer mtk_live_test");
    assert.equal(models.length, 1);
    assert.equal(models[0]?.id, "flux-2-klein-4b");
    assert.equal(models[0]?.priceUsd, 0.0012);
    assert.equal(models[0]?.status, "warm");
    assert.deepEqual(models[0]?.presets, ["flux2-klein-square", "flux2-klein-portrait"]);
  });

  it("handles bare array responses for /api/v1/models and object preset descriptors", async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(
        JSON.stringify([
          {
            id: "wan-2-2",
            name: "Wan 2.2 TI2V-5B",
            category: "VIDEO",
            priceUsd: 0.08,
            status: "cold",
            presets: [{ id: "wan22-720p" }, "wan22-480p"],
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );

    const models = await listMentalokModels({
      apiKey: "mtk_live_test",
      baseUrl: "https://custom.mentalok.test/",
      fetch: fakeFetch,
    });
    assert.equal(models.length, 1);
    assert.equal(models[0]?.id, "wan-2-2");
    assert.deepEqual(models[0]?.presets, ["wan22-720p", "wan22-480p"]);
  });

  it("rejects uploads larger than 15 MB before calling fetch", async () => {
    let called = false;
    const huge = Buffer.alloc(MENTALOK_MAX_UPLOAD_BYTES + 1);
    await assert.rejects(
      () =>
        uploadMentalokMedia(
          { buffer: huge, contentType: "image/png" },
          {
            apiKey: "mtk_live_test",
            fetch: async () => {
              called = true;
              return new Response("{}");
            },
          },
        ),
      /15 MB/,
    );
    assert.equal(called, false);
  });

  it("uploads base64 JSON payload to /api/v1/uploads and parses response", async () => {
    const sample = Buffer.from("hello-image-bytes");
    const fakeFetch: typeof fetch = async (url, init) => {
      assert.equal(String(url), `${MENTALOK_DEFAULT_BASE_URL}/api/v1/uploads`);
      assert.equal(init?.method, "POST");
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      assert.equal(body.contentType, "image/png");
      assert.equal(body.filename, "test.png");
      assert.equal(body.dataBase64, sample.toString("base64"));
      return new Response(
        JSON.stringify({
          url: "https://uploads.mentalok.io/u_1.png",
          contentType: "image/png",
          expiresAt: "2026-11-21T00:00:00Z",
        }),
        { status: 201 },
      );
    };

    const uploaded = await uploadMentalokMedia(
      { buffer: sample, contentType: "image/png", filename: "test.png" },
      { apiKey: "mtk_live_test", fetch: fakeFetch },
    );
    assert.equal(uploaded.url, "https://uploads.mentalok.io/u_1.png");
    assert.equal(uploaded.contentType, "image/png");
    assert.equal(uploaded.expiresAt, "2026-11-21T00:00:00Z");
  });

  it("creates and polls a Mentalok generation job", async () => {
    const fakeFetch: typeof fetch = async (url, init) => {
      if (init?.method === "POST") {
        const body = JSON.parse(String(init.body));
        assert.equal(body.modelId, "qwen-image-edit-2511");
        assert.equal(body.presetId, "qwen-edit-4step");
        assert.equal(body.imageUrl, "https://blob.example/in.png");
        return new Response(
          JSON.stringify({ job: { id: "job_123", status: "queued", priceUsd: 0.012 } }),
          { status: 201 },
        );
      }
      assert.equal(String(url), `${MENTALOK_DEFAULT_BASE_URL}/api/v1/jobs/job_123`);
      return new Response(
        JSON.stringify({
          job: {
            id: "job_123",
            status: "completed",
            outputUrl: "https://cdn.mentalok.io/out.png",
          },
        }),
        { status: 200 },
      );
    };

    const created = await createMentalokJob(
      {
        modelId: "qwen-image-edit-2511",
        presetId: "qwen-edit-4step",
        imageUrl: "https://blob.example/in.png",
        prompt: "Add round sunglasses",
      },
      { apiKey: "mtk_live_test", fetch: fakeFetch },
    );
    assert.equal(created.id, "job_123");
    assert.equal(created.status, "queued");
    assert.equal(created.priceUsd, 0.012);

    const polled = await getMentalokJob("job_123", {
      apiKey: "mtk_live_test",
      fetch: fakeFetch,
    });
    assert.equal(polled.status, "completed");
    assert.equal(polled.outputUrl, "https://cdn.mentalok.io/out.png");
  });

  it("handles bare job payloads and extracts clean error messages on non-2xx responses", async () => {
    const bareFetch: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          id: "job_bare",
          status: "processing",
        }),
        { status: 200 },
      );

    const job = await getMentalokJob("job_bare", {
      apiKey: "mtk_live_test",
      fetch: bareFetch,
    });
    assert.equal(job.id, "job_bare");
    assert.equal(job.status, "running");

    const errorFetch: typeof fetch = async () =>
      new Response(
        JSON.stringify({ error: { message: "Model temporarily busy", code: "BUSY" } }),
        { status: 503 },
      );

    await assert.rejects(
      () =>
        createMentalokJob(
          { modelId: "flux-schnell", prompt: "test" },
          { apiKey: "mtk_live_test", fetch: errorFetch },
        ),
      /Model temporarily busy/,
    );
  });

  it("bridges data URLs through uploadMentalokMedia and passes HTTPS URLs through", async () => {
    const direct = await ensureMentalokUrl("https://blob.vercel-storage.com/sample.png", {
      apiKey: "mtk_live_test",
      fetch: async () => {
        throw new Error("should not fetch public https URL by default");
      },
    });
    assert.equal(direct, "https://blob.vercel-storage.com/sample.png");

    const fakeFetch: typeof fetch = async (url, init) => {
      assert.equal(String(url), `${MENTALOK_DEFAULT_BASE_URL}/api/v1/uploads`);
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      assert.equal(body.contentType, "image/png");
      return new Response(JSON.stringify({ url: "https://uploads.mentalok.io/from-data.png" }), {
        status: 201,
      });
    };

    const dataUrl = `data:image/png;base64,${Buffer.from("png-bytes").toString("base64")}`;
    const bridged = await ensureMentalokUrl(dataUrl, {
      apiKey: "mtk_live_test",
      fetch: fakeFetch,
    });
    assert.equal(bridged, "https://uploads.mentalok.io/from-data.png");
  });

  it("detects API key presence cleanly", () => {
    assert.equal(hasMentalokApiKey("mtk_live_abc"), true);
    assert.equal(hasMentalokApiKey("   "), false);
  });
});
