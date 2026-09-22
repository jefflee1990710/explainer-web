// Wan 3.0 All-in-One routes by media type AND prompt intent. "Reference"
// wording can send start/end stills into reference_image mode instead of
// locking them as the first and last frames.

export const WAN_FIRST_LAST_FRAME_LOCK =
  "The attached images are this clip's locked FIRST FRAME and LAST FRAME. Interpolate from the first frame to the last frame. Do not treat them as style, character, or multi-modal reference images.";

export function lockWanVideoPrompt(prompt: string) {
  const body = prompt.trim();
  if (body.startsWith(WAN_FIRST_LAST_FRAME_LOCK)) return body;
  return `${WAN_FIRST_LAST_FRAME_LOCK}\n\n${body}`;
}
