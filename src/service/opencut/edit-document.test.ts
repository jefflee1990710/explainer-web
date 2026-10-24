import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeOpencutEdit } from "./edit-document";

test("sanitizeOpencutEdit keeps the timeline and blob urls", () => {
  const clean = sanitizeOpencutEdit({
    project: {
      metadata: { id: "scro-1", name: "Scro", thumbnail: "data:image/jpeg;base64,abc" },
      scenes: [{ tracks: { main: { elements: [{ buffer: new ArrayBuffer(8), name: "Clip 1" }] } } }],
    },
    media: [
      { id: "media-1234", name: "Clip 1.mp4", type: "video", sourceUrl: "https://blob.example/clip.mp4", width: 1080, height: 1920 },
      { id: "nope", name: "x", type: "video", sourceUrl: "file:///tmp/a.mp4" },
    ],
  });
  assert.ok(clean);
  assert.equal((clean.project.metadata as { thumbnail?: string }).thumbnail, undefined);
  const element = ((clean.project.scenes as { tracks: { main: { elements: { buffer?: unknown; name: string }[] } } }[])[0]).tracks.main.elements[0];
  assert.equal(element.buffer, undefined);
  assert.equal(element.name, "Clip 1");
  assert.equal(clean.media.length, 1);
  assert.equal(clean.media[0].sourceUrl, "https://blob.example/clip.mp4");
});

test("sanitizeOpencutEdit preserves dotted OpenCut param keys like transform.* and background.*", () => {
  const clean = sanitizeOpencutEdit({
    project: {
      metadata: { id: "scro-1", name: "Scro" },
      scenes: [
        {
          tracks: {
            overlay: [
              {
                id: "track-overlay-1",
                type: "video",
                elements: [
                  {
                    id: "broll-1",
                    type: "image",
                    name: "B-Roll 2",
                    params: {
                      opacity: 1,
                      blendMode: "normal",
                      "transform.scaleX": 0.72,
                      "transform.scaleY": 0.72,
                      "transform.positionX": -86,
                      "transform.positionY": 269,
                      "background.enabled": true,
                      $illegalOperator: "blocked",
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    },
    media: [],
  });
  assert.ok(clean);
  const overlayEl = (
    clean.project.scenes as Array<{
      tracks: {
        overlay: Array<{
          elements: Array<{ params: Record<string, unknown> }>;
        }>;
      };
    }>
  )[0].tracks.overlay[0].elements[0];
  assert.equal(overlayEl.params["transform.scaleX"], 0.72);
  assert.equal(overlayEl.params["transform.scaleY"], 0.72);
  assert.equal(overlayEl.params["transform.positionX"], -86);
  assert.equal(overlayEl.params["transform.positionY"], 269);
  assert.equal(overlayEl.params["background.enabled"], true);
  assert.equal(overlayEl.params.$illegalOperator, undefined);
});

test("sanitizeOpencutEdit rejects a timeline with no metadata", () => {
  assert.equal(sanitizeOpencutEdit({ project: { scenes: [] }, media: [] }), null);
});
