import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FINAL_STALE_MS,
  blobStoreHost,
  brandAssetPath,
  checkBrandUpload,
  finalFingerprint,
  hasEdit,
  isBrandAssetUrl,
  isEditDirty,
  isFinalCurrent,
  isFinalRunning,
  normalizeTemplateName,
} from "@/service/video-edit/edit-state";
import type { VideoEdit } from "@/model/video-edit";

const logo = (id: string, url = "https://x.public.blob.vercel-storage.com/explainer/brand/u1/a.png") => ({
  id,
  kind: "image" as const,
  assetUrl: url,
  anchor: "top-right" as const,
  marginPct: 4,
  widthPct: 18,
  opacity: 1,
});

const base: VideoEdit = {
  layers: [logo("a"), logo("b", "https://x.public.blob.vercel-storage.com/explainer/brand/u1/b.png")],
  intro: { kind: "image", assetUrl: "https://x.public.blob.vercel-storage.com/explainer/brand/u1/i.png", durationSec: 2 },
};

const video = (edit?: VideoEdit) => ({
  phaseA: { clips: [{ clipNumber: 1 }] },
  clips: [{ clipNumber: 1, blobUrl: "https://blob/c1.mp4", submittedAt: "t1" }],
  edit,
});

test("hasEdit is false for no edit or an empty one", () => {
  assert.equal(hasEdit(undefined), false);
  assert.equal(hasEdit({ layers: [] }), false);
  assert.equal(hasEdit(base), true);
  assert.equal(hasEdit({ layers: [], outro: base.intro }), true);
});

test("isEditDirty ignores layer ids but not order or values", () => {
  const renamed = { ...base, layers: base.layers.map((l, i) => ({ ...l, id: `n${i}` })) };
  assert.equal(isEditDirty(base, renamed), false);
  assert.equal(isEditDirty(base, { ...base, layers: [...base.layers].reverse() }), true);
  assert.equal(isEditDirty(base, { ...base, layers: [{ ...base.layers[0], opacity: 0.5 }, base.layers[1]] }), true);
  assert.equal(isEditDirty(base, { ...base, intro: undefined }), true);
});

test("finalFingerprint changes with the edit and the clips", () => {
  const a = finalFingerprint(video(base));
  assert.equal(finalFingerprint(video(structuredClone(base))), a);
  assert.notEqual(finalFingerprint(video({ ...base, outro: base.intro })), a);
  const redone = { ...video(base), clips: [{ clipNumber: 1, blobUrl: "https://blob/c1.mp4", submittedAt: "t2" }] };
  assert.notEqual(finalFingerprint(redone), a);
});

test("isFinalCurrent needs a completed file with the current fingerprint", () => {
  const v = video(base);
  const fp = finalFingerprint(v);
  assert.equal(isFinalCurrent({ ...v, finalUrl: "u", finalStatus: "completed", finalFingerprint: fp }), true);
  assert.equal(isFinalCurrent({ ...v, finalUrl: "u", finalStatus: "completed", finalFingerprint: "old" }), false);
  assert.equal(isFinalCurrent({ ...v, finalStatus: "completed", finalFingerprint: fp }), false);
});

test("isFinalRunning treats a busy export past FINAL_STALE_MS or without queuedAt as dead", () => {
  const now = Date.UTC(2026, 8, 27, 12);
  const fresh = new Date(now - 60_000);
  const stale = new Date(now - FINAL_STALE_MS - 1);
  assert.equal(isFinalRunning({ finalStatus: "in_progress", finalQueuedAt: fresh }, now), true);
  assert.equal(isFinalRunning({ finalStatus: "queued", finalQueuedAt: stale }, now), false);
  assert.equal(isFinalRunning({ finalStatus: "queued" }, now), false);
  assert.equal(isFinalRunning({ finalStatus: "completed", finalQueuedAt: fresh }, now), false);
  assert.equal(isFinalRunning({ finalStatus: "queued", finalQueuedAt: fresh.toISOString() }, now), true);
});

test("isBrandAssetUrl only accepts this user's folder in this project's store", () => {
  const host = "x.public.blob.vercel-storage.com";
  const ok = `https://${host}/${brandAssetPath("u1", "abc", "png")}`;
  assert.equal(isBrandAssetUrl(ok, "u1", host), true);
  assert.equal(isBrandAssetUrl(ok, "u2", host), false);
  assert.equal(isBrandAssetUrl("https://evil.example.com/explainer/brand/u1/a.png", "u1", host), false);
  assert.equal(isBrandAssetUrl("not a url", "u1", host), false);
  assert.equal(
    isBrandAssetUrl("https://other.public.blob.vercel-storage.com/explainer/brand/u1/a.png", "u1", host),
    false,
  );
  assert.equal(isBrandAssetUrl(ok, "u1", null), false);
});

test("blobStoreHost derives the public host from the read-write token", () => {
  assert.equal(
    blobStoreHost("vercel_blob_rw_9He1NjomUXtmv8tB_abcDEF123"),
    "9he1njomuxtmv8tb.public.blob.vercel-storage.com",
  );
  assert.equal(blobStoreHost(undefined), null);
  assert.equal(blobStoreHost("nope"), null);
});

test("checkBrandUpload enforces type and size", () => {
  assert.deepEqual(checkBrandUpload({ type: "image/png", size: 10 }), { ok: true, kind: "image", ext: "png" });
  assert.deepEqual(checkBrandUpload({ type: "video/quicktime", size: 10 }), { ok: true, kind: "video", ext: "mov" });
  assert.equal(checkBrandUpload({ type: "image/gif", size: 10 }).ok, false);
  assert.equal(checkBrandUpload({ type: "image/png", size: 6 * 1024 * 1024 }).ok, false);
  assert.equal(checkBrandUpload({ type: "video/mp4", size: 51 * 1024 * 1024 }).ok, false);
  assert.equal(checkBrandUpload({ type: "video/mp4", size: 0 }).ok, false);
});

test("normalizeTemplateName trims and bounds length", () => {
  assert.deepEqual(normalizeTemplateName("  品牌 A  "), { ok: true, name: "品牌 A" });
  assert.equal(normalizeTemplateName("   ").ok, false);
  assert.equal(normalizeTemplateName("x".repeat(61)).ok, false);
});
