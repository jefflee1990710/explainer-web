// Orbit, arc, or a move to another side. The end still is a new camera angle, not the start's framing.
const ANGLE_CHANGE_EN =
  /\b(?:orbit\w*|arc(?:s|ing)?|revolv\w*|360|180|90|\d{2,3}\s*(?:°|deg(?:ree)?s?))\b|\b(?:circl|rotat|swing|sweep|swoop|dolly|pan)\w*\s+(?:a\s+(?:full\s+|half\s+)?(?:circle|turn)\s+)?(?:around|round)\b|\bto the (?:other|opposite) side\b|\bfrom (?:a |the |her |his )?(?:left|right|front|back|behind|side|overhead|low)\b[^.;]*?\bto (?:a |the |her |his )?(?:left|right|front|back|behind|side|overhead|low)\b/i;

const ANGLE_CHANGE_ZH = /環繞|繞到|繞住|繞著|弧形|弧線|\d{2,3}\s*度|轉到另一|換角度|角度由|由側面|由正面|由背面/;

export function cameraChangesAngle(motion: string | undefined) {
  if (!motion?.trim()) return false;
  return ANGLE_CHANGE_EN.test(motion) || ANGLE_CHANGE_ZH.test(motion);
}

// The director's boolean wins. Older clips and user-edited camera text fall back to the motion wording.
export function endStillUsesOpeningStill(clip: { motionCamera?: string; endUsesStartStill?: boolean } | undefined) {
  if (typeof clip?.endUsesStartStill === "boolean") return clip.endUsesStartStill;
  return !cameraChangesAngle(clip?.motionCamera);
}

// A chat or form edit of the camera text makes the director's boolean stale.
export function endStillChoiceIsStale(
  before: { motionCamera: string; startScene?: string; endScene?: string; explainerScene: string },
  after: { motionCamera: string; startScene?: string; endScene?: string; explainerScene: string },
) {
  return (
    before.motionCamera !== after.motionCamera ||
    (before.startScene ?? "") !== (after.startScene ?? "") ||
    (before.endScene ?? "") !== (after.endScene ?? "") ||
    before.explainerScene !== after.explainerScene
  );
}

export function clearEndStillChoice<T extends { endUsesStartStill?: boolean }>(clip: T): T {
  if (clip.endUsesStartStill === undefined) return clip;
  const rest = { ...clip };
  delete rest.endUsesStartStill;
  return rest;
}

// "from left profile to right 3/4 view" → the opening side and the side the camera lands on.
function sweepSides(motion: string) {
  const match = motion.match(
    /\bfrom\s+((?:a |the |her |his )?(?:left|right|front|back|behind|side|overhead|low)\b[^.;]{0,40}?)\s+to\s+((?:a |the |her |his )?(?:left|right|front|back|behind|side|overhead|low)\b[^.;]{0,48}?)(?=\s+as\b|[.;]|$)/i,
  );
  if (!match) return undefined;
  return { opening: match[1].trim(), landed: match[2].trim() };
}

const LANDED_WITHOUT_SIDES =
  "LANDED CAMERA: the move is finished. Draw only the Camera line in the Scene, seen from the new side. Do not draw the opening angle, and do not copy the character blueprint's facing direction.";

// End still after an orbit or a move to another side. Text only: an attached opening still gets copied.
export function landedCameraDirective(motion: string | undefined) {
  if (!cameraChangesAngle(motion)) return "";
  const sides = sweepSides(motion!.replace(/\s+/g, " ").trim());
  if (!sides) return LANDED_WITHOUT_SIDES;
  return `LANDED CAMERA: the move is finished. Draw only the landed angle: ${sides.landed}. The opening angle was ${sides.opening}. Do not draw that opening angle, and do not copy the character blueprint's facing direction.`;
}

// Line for an end still that is not locked to the opening. The director's false wins over the motion wording.
export function endFrameCameraLine(motion: string | undefined, endUsesStartStill?: boolean) {
  if (endStillUsesOpeningStill({ motionCamera: motion, endUsesStartStill })) return "";
  return landedCameraDirective(motion) || LANDED_WITHOUT_SIDES;
}

// Start still, before the same move. Text only, for the same reason as the landed line.
export function openingCameraDirective(motion: string | undefined) {
  if (!cameraChangesAngle(motion)) return "";
  const sides = sweepSides(motion!.replace(/\s+/g, " ").trim());
  if (!sides) return "";
  return `OPENING CAMERA: this still is before the camera moves. Draw only the opening angle: ${sides.opening}. Do not draw the landed angle (${sides.landed}), and do not copy the character blueprint's facing direction.`;
}
