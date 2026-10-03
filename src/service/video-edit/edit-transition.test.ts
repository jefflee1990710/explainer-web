import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyEdit } from "@/model/video-edit";
import {
  applyReusableEdit,
  pickReusableEdit,
  resolveTransition,
  setTransition,
  timelineGaps,
  transitionKey,
} from "@/service/video-edit/edit-transition";
import { buildEditTimeline } from "@/service/video-edit/edit-timeline";

test("gaps sit between Intro, each clip, and Outro", () => {
  const items = buildEditTimeline({
    clips: [{ clipNumber: 1 }, { clipNumber: 2 }],
  });
  assert.deepEqual(
    timelineGaps(items).map((gap) => gap.key),
    ["intro__clip-1", "clip-1__clip-2", "clip-2__outro"],
  );
});

test("unset gaps resolve to none; a saved pair wins over the folder default", () => {
  const none = resolveTransition(emptyEdit(), "intro", "clip-1");
  assert.equal(none.effect, "none");
  const edit = setTransition(emptyEdit(), "intro", "clip-1", { effect: "fade", durationSec: 0.8 });
  assert.equal(resolveTransition(edit, "intro", "clip-1").effect, "fade");
  assert.equal(resolveTransition(edit, "clip-1", "clip-2").effect, "fade");
  assert.equal(resolveTransition(edit, "clip-1", "clip-2").durationSec, 0.8);
  const override = setTransition(edit, "clip-1", "clip-2", { effect: "wipeleft", durationSec: 0.3 });
  assert.equal(resolveTransition(override, "intro", "clip-1").effect, "fade");
  assert.equal(resolveTransition(override, "clip-1", "clip-2").effect, "wipeleft");
});

test("reusable defaults keep intro, outro, and transitions — never layers", () => {
  const edit = {
    layers: [
      {
        id: "logo",
        kind: "image" as const,
        assetUrl: "https://cdn/logo.png",
        anchor: "top-right" as const,
        marginPct: 4,
        widthPct: 18,
        opacity: 1,
      },
    ],
    intro: { kind: "image" as const, assetUrl: "https://cdn/intro.png", durationSec: 2 },
    outro: { kind: "video" as const, assetUrl: "https://cdn/outro.mp4", durationSec: 3 },
    defaultTransition: { effect: "dissolve" as const, durationSec: 0.5 },
    transitions: { [transitionKey("intro", "clip-1")]: { effect: "fade" as const, durationSec: 0.4 } },
  };
  const reusable = pickReusableEdit(edit);
  assert.equal("layers" in reusable, false);
  assert.deepEqual(reusable.intro, edit.intro);
  assert.deepEqual(reusable.outro, edit.outro);
  assert.equal(reusable.defaultTransition?.effect, "dissolve");
  const next = applyReusableEdit(reusable);
  assert.deepEqual(next.layers, []);
  assert.equal(next.intro?.assetUrl, "https://cdn/intro.png");
  assert.equal(resolveTransition(next, "intro", "clip-1").effect, "fade");
  assert.equal(resolveTransition(next, "clip-2", "outro").effect, "dissolve");
});
