import assert from "node:assert/strict";
import test from "node:test";
import {
  cameraChangesAngle,
  endFrameCameraLine,
  endStillUsesOpeningStill,
  landedCameraDirective,
  openingCameraDirective,
} from "@/service/director/camera-move";

test("an orbit, arc, or move to another side changes the camera angle", () => {
  assert.equal(
    cameraChangesAngle(
      "0-2s Scro Official grasps rig dial with right hand; 2-5s smooth gimbal arc sweeps 180 degrees from left profile to right 3/4 view as she smiles.",
    ),
    true,
  );
  assert.equal(cameraChangesAngle("0–3s the camera orbits around her"), true);
  assert.equal(cameraChangesAngle("the camera swings around to the other side"), true);
  assert.equal(cameraChangesAngle("camera moves from the front to behind her"), true);
  assert.equal(cameraChangesAngle("0–2s 鏡頭環繞到佢右邊"), true);
});

test("a sweep names the opening side and the landed side", () => {
  const arc =
    "0-2s Scro Official grasps rig dial with right hand; 2-5s smooth gimbal arc sweeps 180 degrees from left profile to right 3/4 view as she smiles.";
  const line = landedCameraDirective(arc);
  assert.match(line, /Draw only the landed angle: right 3\/4 view/);
  assert.match(line, /opening angle was left profile/);
  assert.equal(landedCameraDirective("0–2s the camera pushes in; 2–5s it settles on a close-up."), "");
  assert.match(landedCameraDirective("0–2s 鏡頭環繞到佢右邊"), /Camera line in the Scene/);
  const opening = openingCameraDirective(arc);
  assert.match(opening, /Draw only the opening angle: left profile/);
  assert.match(opening, /landed angle \(right 3\/4 view\)/);
  assert.equal(openingCameraDirective("camera locked, she lifts the cup"), "");
});

test("the director's boolean decides whether the end still uses the opening", () => {
  const arc = "smooth gimbal arc sweeps 180 degrees from left profile to right 3/4 view";
  assert.equal(endStillUsesOpeningStill({ motionCamera: arc }), false);
  assert.equal(endStillUsesOpeningStill({ motionCamera: arc, endUsesStartStill: true }), true);
  assert.equal(endStillUsesOpeningStill({ motionCamera: "camera pushes in", endUsesStartStill: false }), false);
  assert.equal(endFrameCameraLine("camera pushes in", false), expectLanded);
  assert.equal(endFrameCameraLine(arc, true), "");
});

const expectLanded =
  "LANDED CAMERA: the move is finished. Draw only the Camera line in the Scene, seen from the new side. Do not draw the opening angle, and do not copy the character blueprint's facing direction.";

test("a push, a zoom, or a locked camera keeps the same angle", () => {
  assert.equal(cameraChangesAngle("0–2s the camera pushes in; 2–5s it settles on a close-up."), false);
  assert.equal(cameraChangesAngle("camera rapidly zooms out on gimbal from 80mm close-up to 35mm wide"), false);
  assert.equal(cameraChangesAngle("camera locked, she lifts the cup and smiles"), false);
  assert.equal(cameraChangesAngle("鏡頭鎖定，佢舉起杯"), false);
  assert.equal(cameraChangesAngle(undefined), false);
});
