/** Where and how the Clip 1 hook title sits, shared by Phase A rules and still prompts for every director. */
export const HOOK_TITLE_PLACEMENT =
  "centered, slightly above the vertical center (about 35–45% from the top; never at the top edge), on a high-contrast plate with a thick solid border, clear of the face";

// Clean fallback hook headline when the Scene text forgot 「...」 quotes.
function sanitizeHookTitleFallback(title?: string) {
  const cleaned = (title ?? "")
    .replace(/[「」"“”]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  return cleaned.length > 48 ? `${cleaned.slice(0, 45).trim()}…` : cleaned;
}

// Still-prompt line for Clip 1's opening frame: uses the Scene's 「」 hook or falls back to the proposal title.
export function hookTitleFrameLine(fallbackTitle?: string) {
  const fallback = sanitizeHookTitleFallback(fallbackTitle);
  const subject = fallback
    ? `the Scene's 「...」 hook (or 「${fallback}」 if none is quoted in Scene)`
    : "the Scene's 「...」 hook";
  return `Clip 1 hook title (overrides any top-edge/top-center placement in Scene): ${subject} is ONE BIG, BOLD headline, ${HOOK_TITLE_PLACEMENT}. Spell it exactly.`;
}

// Phase A director instruction: Clip 1 always gets extra facial expression, body energy, and motion to retain viewers.
export function firstClipHookPerformanceDirectorRule(realistic = false, elementFocus = false) {
  if (elementFocus) {
    return "Clip 1 Hook Retention: Clip 1 opens on the teaching element and the hook title. On every clip, including Clip 1, the character's eyes and hands stay on that element (point, tap, place, slide, flip, or pick up). Lips and jaw stay sealed. No lip-sync, no look into the lens, no greeting wave, and no performance aimed at the camera. Motion is the element moving, not a face talking to the viewer.";
  }
  return realistic
    ? "Clip 1 Hook Retention (Expression & Motion REQUIRED): Clip 1 is the scroll-stopping hook — stage the character with a noticeably more engaging, animated facial expression (active eyebrows, bright focused eyes, and clear emotional reaction matching the hook at natural real-person intensity; never a neutral or resting face), an active opening gesture/posture, and immediate visual motion in the first 0–2s of `motionCamera` so viewers stay on the video."
    : "Clip 1 Hook Retention (Expression & Motion REQUIRED): Clip 1 is the scroll-stopping hook — stage the character with a bigger, more vivid facial expression (expressive eyebrows, wide engaged eyes, and strong emotional reaction to the hook; never a static or neutral face), dynamic body language, and immediate eye-catching animation/camera motion in the first 0–2s of `motionCamera` to hook the viewer.";
}

// Still-prompt line for non-explainer Clip 1 start frames so the opening keyframe has scroll-stopping expression and action.
export function firstClipHookPerformanceFrameLine(realistic = false, elementFocus = false) {
  if (elementFocus) {
    return "HOOK ELEMENT FOCUS (Clip 1): eyes and hands stay on the teaching element. Lips and jaw stay sealed. No lip-sync and no look into the lens. The hook title and the element move; the face does not perform to the camera.";
  }
  return realistic
    ? "HOOK EXPRESSION & MOTION (Clip 1): scroll-stopping opening — give the character a noticeably more animated, engaging facial expression (active brows, expressive eyes, clear hook emotion at natural real-person intensity; never a flat resting face) and an active mid-beat gesture."
    : "HOOK EXPRESSION & MOTION (Clip 1): scroll-stopping opening — give the character a punchy, extra-vivid facial expression (lifted/furrowed brows, wide expressive eyes, strong hook emotion; never a neutral standing pose) and dynamic body/prop action.";
}

// Phase B video prompt rule for Clip 1 so the first 0–2 seconds have extra facial acting, body animation, and camera/scene motion.
export function firstClipHookPerformanceVideoLine(
  realistic = false,
  narratorOnly = false,
  elementFocus = false,
) {
  if (elementFocus) {
    return "HOOK RETENTION (Clip 1 — first 0–2s): the teaching element and the hook title move immediately. The character's eyes and hands stay on that element (point, tap, place, slide, flip, or pick up). Lips and jaw stay sealed with zero lip-sync. Never look into the lens and never wave at the camera.";
  }
  const silentMouth = narratorOnly
    ? " (upper-face eyebrows/eyes and body gesture only — keep lips and jaw 100% static and sealed shut with zero lip-sync)"
    : "";
  return realistic
    ? `HOOK RETENTION (Clip 1 — first 0–2s): open with immediate, scroll-stopping energy — extra-clear, animated facial expression shifts (active eyebrows, engaged eyes, vivid emotional reaction at natural real-person intensity)${silentMouth}, decisive hand/body movement, and immediate scene or camera motion from frame 1 so viewers stay on the video.`
    : `HOOK RETENTION (Clip 1 — first 0–2s): open with immediate, scroll-stopping energy — heightened, vivid facial expression changes (expressive eyebrows and eyes, strong emotional acting)${silentMouth}, energetic body/prop animation, and immediate camera or scene motion from frame 1 so viewers stay on the video.`;
}
