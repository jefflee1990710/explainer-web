import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import type { Project } from "@/model/project";
import {
  backgroundPlateForClip,
  backgroundPlateLockParagraph,
  buildBackgroundPlatePrompt,
  buildObjectSheetPrompt,
  objectSheetLockParagraph,
  objectSheetUrl,
} from "@/service/higgsfield/object-sheet";
import { renderableFromSystem } from "@/service/style/renderable-style";
import { installTestStyles, testStyle, uninstallTestStyles } from "@/service/style/test-styles";
import { after, before } from "node:test";

before(() => installTestStyles());
after(() => uninstallTestStyles());

test("object sheet prompt is a white contact sheet in the video style", () => {
  const style = renderableFromSystem(testStyle("doodle"));
  const prompt = buildObjectSheetPrompt({
    style,
    items: [{ name: "gimbal", notes: "metal dial on a slider" }],
  });
  assert.match(prompt, /plain white background/);
  assert.match(prompt, /1\) gimbal: metal dial on a slider/);
  assert.match(prompt, /No people/);
  assert.match(prompt, /doodle look/);
});

test("background plate prompt is an empty set with no people", () => {
  const style = renderableFromSystem(testStyle("doodle"));
  const prompt = buildBackgroundPlatePrompt({
    style,
    plate: { name: "rooftop", notes: "railing and city skyline at soft daylight" },
    aspectRatio: "9:16",
  });
  assert.match(prompt, /Empty set reference/);
  assert.match(prompt, /Location: rooftop/);
  assert.match(prompt, /No people/);
  assert.match(prompt, /Aspect ratio 9:16/);
});

test("lock paragraphs name the attached image and forbid copying the sheet layout", () => {
  assert.match(
    objectSheetLockParagraph(2, [{ name: "gimbal", notes: "" }]),
    /OBJECT LOCK: attached image 2/,
  );
  assert.match(objectSheetLockParagraph(2, [{ name: "gimbal", notes: "" }]), /Do not copy the white background/);
  assert.match(backgroundPlateLockParagraph(3, { name: "rooftop" }), /BACKGROUND LOCK: attached image 3/);
  assert.match(backgroundPlateLockParagraph(3, { name: "rooftop" }), /Do not paste the empty framing/);
});

test("helpers pick the sheet and the plate for a clip", () => {
  const project = {
    _id: new ObjectId(),
    objectSheetItems: [{ name: "gimbal", notes: "metal" }],
    objectSheetUrl: "https://blob/sheet.png",
    backgroundPlates: [
      {
        setId: "rooftop",
        name: "rooftop",
        notes: "sky",
        clipNumbers: [2],
        url: "https://blob/roof.png",
      },
    ],
    phaseA: {
      clips: [{ clipNumber: 2, backgroundSetId: "rooftop" }],
    },
  } as unknown as Project;
  assert.equal(objectSheetUrl(project), "https://blob/sheet.png");
  assert.equal(backgroundPlateForClip(project, 2)?.url, "https://blob/roof.png");
  assert.equal(backgroundPlateForClip(project, 1), undefined);
});
