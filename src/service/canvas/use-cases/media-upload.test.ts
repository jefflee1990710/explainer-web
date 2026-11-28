import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CANVAS_MAX_UPLOAD_BYTES,
  finishCanvasMediaUpload,
  prepareCanvasMediaUpload,
  uploadCanvasMediaFromFormData,
} from "@/service/canvas/use-cases/media-upload";

describe("service/canvas/media-upload", () => {
  it("rejects missing or empty files", async () => {
    const emptyForm = new FormData();
    const missing = await uploadCanvasMediaFromFormData("user-1", emptyForm);
    assert.deepEqual(missing, { ok: false, error: "請選擇要上傳的媒體檔案" });

    const zeroForm = new FormData();
    zeroForm.set("file", new File([], "empty.png", { type: "image/png" }));
    const empty = await uploadCanvasMediaFromFormData("user-1", zeroForm);
    assert.deepEqual(empty, { ok: false, error: "檔案內容不可為空" });
  });

  it("rejects unsupported MIME types and oversized files", async () => {
    const pdfForm = new FormData();
    pdfForm.set("file", new File([Buffer.from("pdf")], "doc.pdf", { type: "application/pdf" }));
    const badMime = await uploadCanvasMediaFromFormData("user-1", pdfForm);
    assert.equal(badMime.ok, false);
    if (!badMime.ok) assert.match(badMime.error, /application\/pdf/);

    const hugeFile = {
      size: CANVAS_MAX_UPLOAD_BYTES + 1,
      type: "video/mp4",
      name: "huge.mp4",
      arrayBuffer: async () => new ArrayBuffer(0),
    } as unknown as File;
    const hugeForm = {
      get: (key: string) => (key === "file" ? hugeFile : null),
    } as unknown as FormData;
    const hugeRes = await uploadCanvasMediaFromFormData("user-1", hugeForm);
    assert.deepEqual(hugeRes, { ok: false, error: "檔案大小超過 15 MB 上限" });
  });

  it("normalizes MIME parameters and uploads valid media to deterministic user folder", async () => {
    const calls: Array<{ size: number; pathname: string; contentType: string }> = [];
    const form = new FormData();
    form.set(
      "file",
      new File([Buffer.from("webm-bytes")], "clip.webm", {
        type: "video/webm; codecs=vp9",
      }),
    );

    const res = await uploadCanvasMediaFromFormData("user-42", form, {
      randomId: () => "fixed-uuid",
      persistBuffer: async (buf, pathname, contentType) => {
        calls.push({ size: buf.byteLength, pathname, contentType });
        return `https://blob.example/${pathname}`;
      },
    });

    assert.deepEqual(res, {
      ok: true,
      url: "https://blob.example/canvas/uploads/user-42/fixed-uuid.webm",
      mediaKind: "video",
      fileName: "clip.webm",
      contentType: "video/webm",
      sizeBytes: 10,
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.pathname, "canvas/uploads/user-42/fixed-uuid.webm");
  });

  it("returns probed length, size, and sound for uploaded video", async () => {
    const form = new FormData();
    form.set("file", new File([Buffer.from("mp4-bytes")], "talk.mp4", { type: "video/mp4" }));
    const res = await uploadCanvasMediaFromFormData("user-42", form, {
      randomId: () => "id",
      persistBuffer: async (_buf, pathname) => `https://blob.example/${pathname}`,
      probeBuffer: async () =>
        "  Duration: 00:00:07.50, start: 0.0\n  Stream #0:0: Video: h264, yuv420p, 720x1280, 30 fps\n  Stream #0:1: Audio: aac, 48000 Hz",
    });
    assert.ok(res.ok);
    if (res.ok) {
      assert.deepEqual(res.meta, {
        url: "https://blob.example/canvas/uploads/user-42/id.mp4",
        durationSec: 7.5,
        hasAudio: true,
        width: 720,
        height: 1280,
      });
    }
  });

  it("signs a direct upload without reading the file bytes", async () => {
    const prepared = await prepareCanvasMediaUpload(
      "user-42",
      { contentType: "video/mp4", size: 12, fileName: "Install to Local Agent - Claude.mp4" },
      {
        randomId: () => "fixed-uuid",
        readWriteToken: "",
        mintToken: async (plan) => {
          assert.equal(plan.pathname, "canvas/uploads/user-42/fixed-uuid.mp4");
          assert.equal(plan.maximumSizeInBytes, CANVAS_MAX_UPLOAD_BYTES);
          assert.deepEqual(plan.allowedContentTypes, ["video/mp4"]);
          assert.equal(plan.fileName, "Install to Local Agent - Claude.mp4");
          return "signed-token";
        },
      },
    );
    assert.deepEqual(prepared, {
      ok: true,
      token: "signed-token",
      pathname: "canvas/uploads/user-42/fixed-uuid.mp4",
      mediaKind: "video",
      contentType: "video/mp4",
      fileName: "Install to Local Agent - Claude.mp4",
    });
  });

  it("returns size and type errors before a token is minted", async () => {
    const huge = await prepareCanvasMediaUpload("user-1", {
      contentType: "video/mp4",
      size: CANVAS_MAX_UPLOAD_BYTES + 1,
      fileName: "huge.mp4",
    });
    assert.deepEqual(huge, { ok: false, error: "檔案大小超過 15 MB 上限" });

    const pdf = await prepareCanvasMediaUpload("user-1", {
      contentType: "application/pdf",
      size: 20,
      fileName: "Install to Local Agent - Claude.pdf",
    });
    assert.equal(pdf.ok, false);
    if (!pdf.ok) assert.match(pdf.error, /application\/pdf/);

    const missingToken = await prepareCanvasMediaUpload(
      "user-1",
      { contentType: "image/png", size: 4, fileName: "a.png" },
      { readWriteToken: "" },
    );
    assert.deepEqual(missingToken, { ok: false, error: "尚未設定 Vercel Blob" });
  });

  it("probes only this user's uploaded video", async () => {
    const url = "https://abc.public.blob.vercel-storage.com/canvas/uploads/user-42/id.mp4";
    const res = await finishCanvasMediaUpload(
      "user-42",
      { url, fileName: "talk.mp4", contentType: "video/mp4", sizeBytes: 10 },
      {
        probeUrl: async () =>
          "  Duration: 00:00:07.50, start: 0.0\n  Stream #0:0: Video: h264, yuv420p, 720x1280, 30 fps\n  Stream #0:1: Audio: aac, 48000 Hz",
      },
    );
    assert.ok(res.ok);
    if (res.ok) assert.equal(res.meta?.durationSec, 7.5);

    const other = await finishCanvasMediaUpload("user-42", {
      url: "https://abc.public.blob.vercel-storage.com/canvas/uploads/user-other/id.mp4",
      fileName: "talk.mp4",
      contentType: "video/mp4",
      sizeBytes: 10,
    });
    assert.deepEqual(other, { ok: false, error: "上傳結果無效，請再試一次" });
  });
});
