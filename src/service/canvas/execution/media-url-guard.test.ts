import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assertAllowedCanvasMediaUrl, isAllowedCanvasMediaUrl } from "@/service/canvas/execution/media-url-guard";

describe("canvas media URL guard", () => {
  it("allows Vercel Blob over https", () => {
    assert.equal(isAllowedCanvasMediaUrl("https://abc.public.blob.vercel-storage.com/a.mp4", {}), true);
  });

  it("blocks internal hosts, other schemes, ports, and credentials", () => {
    for (const url of [
      "http://169.254.169.254/latest/meta-data",
      "http://localhost:3000/x",
      "file:///etc/passwd",
      "http://abc.public.blob.vercel-storage.com/a.mp4",
      "https://abc.public.blob.vercel-storage.com:8443/a.mp4",
      "https://user:pw@abc.public.blob.vercel-storage.com/a.mp4",
      "https://blob.vercel-storage.com.evil.io/a.mp4",
      "not a url",
    ]) {
      assert.equal(isAllowedCanvasMediaUrl(url, {}), false, url);
    }
    assert.throws(() => assertAllowedCanvasMediaUrl("http://10.0.0.1/a", {}));
  });

  it("allows hosts listed in CANVAS_MEDIA_ALLOWED_HOSTS", () => {
    const env = { CANVAS_MEDIA_ALLOWED_HOSTS: "127.0.0.1:9100, cdn.example.com" };
    assert.equal(isAllowedCanvasMediaUrl("http://127.0.0.1:9100/files/a.mp4", env), true);
    assert.equal(isAllowedCanvasMediaUrl("https://cdn.example.com/a.mp4", env), true);
    assert.equal(isAllowedCanvasMediaUrl("http://127.0.0.1:9200/a.mp4", env), false);
  });
});
