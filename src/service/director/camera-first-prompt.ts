// Camera-First & Camera-Relative Direction helper for video and motion prompts.
// Ensures every video/motion prompt leads with camera details, pointing direction,
// and camera motion first (e.g. "24mm camera pointing to character from low level..."),
// and ensures all spatial/movement directions are stated relative to the camera
// (e.g. "toward camera", "walking to left side of camera", "leaving camera from right side").

export const CAMERA_FIRST_AND_RELATIVE_DIRECTION_RULE =
  "CAMERA-FIRST & CAMERA-RELATIVE DIRECTION CONTRACT: (1) Always state camera details, direction, and motion FIRST at the very beginning of motionCamera and every video prompt (for example: '24mm camera pointing to character from low level, smooth tracking forward...' or '35mm camera pointing to character at eye level, locked framing...'), before starting character actions, expressions, props, or scene details. (2) Every spatial direction, facing, movement, and trajectory given by the director MUST always be relative to the camera (for example: 'toward camera', 'away from camera', 'walking to left side of camera', 'walking to right side of camera', 'leaving camera from right side', 'entering camera from left side'), never ambiguous stage or world directions.";

/**
 * Rewrites ambiguous movement directions (e.g. "walking left", "exits right", "walks forward")
 * so they are explicitly relative to the camera ("walking to left side of camera",
 * "leaving camera from right side", "walking toward camera").
 */
export function normalizeCameraRelativeDirections(text: string): string {
  if (!text) return "";
  return text
    .replace(
      /\b(walk(?:s|ing|ed)?|step(?:s|ping|ped)?|run(?:s|ning)?|strid(?:es|ing)|mov(?:es|ing|ed)|turn(?:s|ing|ed)?|lean(?:s|ing|ed)?|look(?:s|ing|ed)?|glanc(?:es|ing|ed)?)\s+(?:to\s+(?:the\s+)?)?(left|right)(?:\s+side)?\b(?!\s+(?:side\s+)?of\s+(?:the\s+)?(?:camera|frame|lens))/gi,
      (_match, verb: string, side: string) =>
        `${verb} to ${side.toLowerCase()} side of camera`,
    )
    .replace(
      /\b(exit(?:s|ing|ed)?|leav(?:es|ing)|depart(?:s|ing)?)\s+(?:from\s+)?(?:the\s+)?(?:frame\s+|screen\s+|scene\s+)?(?:on\s+the\s+|to\s+the\s+|from\s+the\s+)?(left|right)(?:\s+side)?\b(?!\s+of\s+(?:the\s+)?(?:camera|frame|lens))/gi,
      (_match, _verb: string, side: string) =>
        `leaving camera from ${side.toLowerCase()} side`,
    )
    .replace(
      /\b(enter(?:s|ing|ed)?)\s+(?:from\s+)?(?:the\s+)?(?:frame\s+|screen\s+|scene\s+)?(?:on\s+the\s+|from\s+the\s+)?(left|right)(?:\s+side)?\b(?!\s+of\s+(?:the\s+)?(?:camera|frame|lens))/gi,
      (_match, _verb: string, side: string) =>
        `entering camera from ${side.toLowerCase()} side`,
    )
    .replace(
      /\b(walk(?:s|ing|ed)?|step(?:s|ping|ped)?|run(?:s|ning)?|strid(?:es|ing)|mov(?:es|ing|ed))\s+forward\b(?!\s+(?:toward|to|into)\b)/gi,
      (_match, verb: string) => `${verb} toward camera`,
    )
    .replace(
      /\b(walk(?:s|ing|ed)?|step(?:s|ping|ped)?|run(?:s|ning)?|strid(?:es|ing)|mov(?:es|ing|ed))\s+backward(?:s)?\b(?!\s+(?:away|from)\b)/gi,
      (_match, verb: string) => `${verb} away from camera`,
    );
}

function detectLensMm(source: string): string {
  const match = source.match(/\b(16|24|28|35|50|85|100|135)\s*mm\b/i);
  if (match) return `${match[1]}mm`;
  if (/\b(?:wide[- ]angle|full[- ]body|low[- ]angle|tracking|running|walking)\b/i.test(source)) {
    return "24mm";
  }
  return "35mm";
}

function detectCameraLevel(source: string): string {
  if (/\blow[- ]?(?:angle|level)\b|仰角|低角度/i.test(source)) {
    return "from low level";
  }
  if (/\bhigh[- ]?(?:angle|level)|overhead\b|俯角|高角度/i.test(source)) {
    return "from high level";
  }
  if (/\bover[- ]the[- ]shoulder|\bOTS\b|過肩/i.test(source)) {
    return "from over-the-shoulder level";
  }
  return "at eye level";
}

function detectCameraMotionSummary(source: string): string {
  if (/\b(?:100%\s+)?locked\b|\bstationary\b|\bstatic\b|固定鏡頭|鎖定鏡頭/i.test(source)) {
    return "locked stationary framing";
  }
  if (/\bpush(?:es|ing)?[- ]in\b|\bdolly[- ]in\b|推近/i.test(source)) {
    return "smooth push-in toward character";
  }
  if (/\bpull(?:s|ing)?[- ]back\b|\bpull(?:s|ing)?[- ]out\b|\bdolly[- ]out\b|拉遠/i.test(source)) {
    return "smooth pull-back from character";
  }
  if (/\btrack(?:s|ing)?\b|\bfollow(?:s|ing)?\b|\bgimbal\b|跟拍|推進/i.test(source)) {
    return "smooth gimbal tracking motion following character";
  }
  if (/\bpan(?:s|ning)?\b|橫移|搖鏡/i.test(source)) {
    return "smooth panning motion across the scene";
  }
  return "steady cinematic camera motion";
}

const ALREADY_CAMERA_FIRST_RE =
  /^(?:\[Shot\s+\d+\]\s*)?(?:Camera\s*:|Board camera\s*:|\d{2,3}mm\s+camera\s+pointing\b|SILENT ON-SCREEN CHARACTER:|Silent visual-only video)/i;

/**
 * Ensures any video/motion prompt begins with concrete camera details, pointing direction,
 * and camera motion first (e.g. "24mm camera pointing to character from low level, ..."),
 * followed by all other scene and character details with camera-relative directions.
 */
export function formatCameraFirstVideoPrompt(input: {
  prompt: string;
  motionCamera?: string;
  startScene?: string;
}): string {
  const normalizedPrompt = normalizeCameraRelativeDirections(
    (input.prompt || "").trim(),
  );
  if (!normalizedPrompt) return "";

  if (ALREADY_CAMERA_FIRST_RE.test(normalizedPrompt)) {
    return normalizedPrompt;
  }

  const combinedContext = [
    normalizedPrompt,
    input.motionCamera || "",
    input.startScene || "",
  ].join(" ");

  const lens = detectLensMm(combinedContext);
  const level = detectCameraLevel(combinedContext);
  const motionSummary = detectCameraMotionSummary(combinedContext);

  const cameraLead = `${lens} camera pointing to character ${level}, ${motionSummary}.`;
  return `${cameraLead} ${normalizedPrompt}`;
}
