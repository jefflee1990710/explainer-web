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
    items: [{ name: "Whiteboard", notes: "easel with diagrams" }],
  });
  assert.match(prompt, /plain white background/);
  assert.match(prompt, /1\) Whiteboard: easel with diagrams/);
  assert.match(prompt, /paint its exact name/);
  assert.match(prompt, /Whiteboard/);
  assert.match(prompt, /No room, no floor, no desk/);
  assert.match(prompt, /No people/);
  assert.match(prompt, /doodle look/);
});

test("realistic prop sheet and empty set carry camera, grain, and directional light", () => {
  const style = renderableFromSystem(testStyle("realistic"));
  const props = buildObjectSheetPrompt({
    style,
    items: [{ name: "mug", notes: "chipped ceramic" }],
  });
  assert.match(props, /grazing directional key light/);
  assert.match(props, /50mm lens at f\/8/);
  assert.match(props, /no film grain/);
  assert.doesNotMatch(props, /Portra-style|subtle film grain/);
  assert.match(props, /plain white background/);
  assert.doesNotMatch(props, /Even light, no cast shadow/);

  const fork = renderableFromSystem(testStyle("doodle"));
  fork.id = "user-style";
  fork.baseStyleId = "realistic";
  const forked = buildObjectSheetPrompt({
    style: fork,
    items: [{ name: "mug", notes: "chipped ceramic" }],
  });
  assert.match(forked, /material grain/);

  const set = buildBackgroundPlatePrompt({
    style,
    plate: { name: "studio", notes: "frosted acrylic wall" },
    aspectRatio: "9:16",
  });
  assert.match(set, /24mm wide-angle lens at f\/11/);
  assert.match(set, /85mm portrait lens at f\/1\.4/);
  assert.match(set, /Every cell shares that one light direction/);
  assert.match(set, /Nine cells/);

  const flat = buildObjectSheetPrompt({
    style: renderableFromSystem(testStyle("doodle")),
    items: [{ name: "mug", notes: "chipped ceramic" }],
  });
  assert.match(flat, /Even light, no cast shadow/);
  assert.doesNotMatch(flat, /85mm portrait lens|subtle film grain/);
});

test("background plate prompt is a 3x3 of the empty set", () => {
  const style = renderableFromSystem(testStyle("doodle"));
  const prompt = buildBackgroundPlatePrompt({
    style,
    plate: { name: "rooftop", notes: "railing and city skyline at soft daylight" },
    aspectRatio: "9:16",
  });
  assert.match(prompt, /3x3/);
  assert.match(prompt, /Nine cells/);
  assert.match(prompt, /Location: rooftop/);
  assert.match(prompt, /No people/);
  assert.match(prompt, /overhead/);
  assert.doesNotMatch(prompt, /Aspect ratio 9:16/);
});

test("lock paragraphs name the attached image and forbid copying the sheet layout", () => {
  assert.match(
    objectSheetLockParagraph(2, [{ name: "gimbal", notes: "" }]),
    /OBJECT LOCK: attached image 2/,
  );
  assert.match(objectSheetLockParagraph(2, [{ name: "gimbal", notes: "" }]), /Do not copy the white background/);
  assert.match(objectSheetLockParagraph(2, [{ name: "gimbal", notes: "" }]), /draw the blank back/);
  assert.match(objectSheetLockParagraph(2, [{ name: "Whiteboard", notes: "" }]), /named tile/);
  assert.match(backgroundPlateLockParagraph(3, { name: "rooftop" }), /BACKGROUND LOCK: attached image 3/);
  assert.match(backgroundPlateLockParagraph(3, { name: "rooftop" }), /cell whose angle matches/);
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
