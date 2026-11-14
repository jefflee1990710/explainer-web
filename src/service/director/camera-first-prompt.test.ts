import assert from "node:assert/strict";
import test from "node:test";
import {
  CAMERA_FIRST_AND_RELATIVE_DIRECTION_RULE,
  formatCameraFirstVideoPrompt,
  normalizeCameraRelativeDirections,
} from "@/service/director/camera-first-prompt";

test("normalizeCameraRelativeDirections rewrites movement directions relative to the camera", () => {
  const raw =
    "The protagonist walks left across the street, looks right, walks forward, and finally exits right.";
  const normalized = normalizeCameraRelativeDirections(raw);

  assert.match(normalized, /walks to left side of camera/);
  assert.match(normalized, /looks to right side of camera/);
  assert.match(normalized, /walks toward camera/);
  assert.match(normalized, /leaving camera from right side/);
});

test("normalizeCameraRelativeDirections preserves directions that already reference the camera", () => {
  const raw =
    "Walking toward camera, then walking to left side of camera and leaving camera from right side.";
  assert.equal(normalizeCameraRelativeDirections(raw), raw);
});

test("formatCameraFirstVideoPrompt places camera details, direction, and motion first before other details", () => {
  const formatted = formatCameraFirstVideoPrompt({
    prompt:
      "Low-angle shot as the hero strides forward through neon rain and turns left.",
  });

  assert.match(
    formatted,
    /^24mm camera pointing to character from low level, /,
  );
  assert.match(formatted, /strides toward camera/);
  assert.match(formatted, /turns to left side of camera/);
});

test("formatCameraFirstVideoPrompt is idempotent when prompt already starts with camera lead or board camera", () => {
  const already =
    "24mm camera pointing to character from low level, smooth gimbal tracking motion following character. The hero walks toward camera.";
  assert.equal(formatCameraFirstVideoPrompt({ prompt: already }), already);

  const boardPrompt =
    "Board camera: locked stationary square-on framing. Cutout card glides in smoothly.";
  assert.equal(formatCameraFirstVideoPrompt({ prompt: boardPrompt }), boardPrompt);

  const silentExplainerPrompt =
    "SILENT ON-SCREEN CHARACTER: Board camera: 100% locked square-on view.";
  assert.equal(
    formatCameraFirstVideoPrompt({ prompt: silentExplainerPrompt }),
    silentExplainerPrompt,
  );
});

test("CAMERA_FIRST_AND_RELATIVE_DIRECTION_RULE documents both camera-first order and camera-relative directions", () => {
  assert.match(
    CAMERA_FIRST_AND_RELATIVE_DIRECTION_RULE,
    /24mm camera pointing to character from low level/,
  );
  assert.match(CAMERA_FIRST_AND_RELATIVE_DIRECTION_RULE, /toward camera/);
  assert.match(
    CAMERA_FIRST_AND_RELATIVE_DIRECTION_RULE,
    /walking to left side of camera/,
  );
  assert.match(
    CAMERA_FIRST_AND_RELATIVE_DIRECTION_RULE,
    /leaving camera from right side/,
  );
});
