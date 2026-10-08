# Listicle Clip Prompt Contract (Phase B)

Use only after explicit approval of the current Phase A. Write ONE self-contained video prompt per clip.

## Prompt order

1. Output spec: duration in seconds (3–8, max 8), aspect ratio, 720p, 24 FPS, synchronized audio.
2. Style lock: repeat the canvas, look and negatives from the Visual style block in one or two sentences.
3. Cast lock: the host (if present) follows the attached start/end keyframes and blueprints exactly; never restyle.
4. On-canvas item: the hook paints one large count on an empty frame. An item clip paints only that item's number, short title, and one object, with empty space around them. The last clip paints a clean numbered list of the short titles, evenly spaced, with no host and no extra props. Every clip also paints the spoken line as a subtitle, clear of that graphic.
5. Scene at t=0: the hook is empty except the count. An item clip is the setting plus that one item (matches the START keyframe); earlier items are already off screen. The last clip is only the clean list.
6. Timed beats scaled to duration: number pops with an SFX hit → item image appears or morphs element by element → settles on the END keyframe. For the hook clip: count line + slam-in. For the outro: items line up at rest.
7. Camera: one modest move (punch-in on the number, drift toward the item). No cuts inside a clip.
8. Audio: the line quoted exactly once, audio-only, in the user-selected adult male or female voice; no background music; number-pop SFX synced to the pop.
9. Handoff: this item leaves the frame as the next number arrives — or, for the last clip, the full list at rest; no loop. Do not park earlier items in a visible row before the last clip.
10. Negatives: no extra invented labels beyond the numbered item list, no wrong numbers, no host restyle, no style drift, no extra limbs, plus the Visual style negatives.

## Dual-keyframe rule

Start and end keyframes are the SAME SHOT. Interpolate across the FULL duration; never hold the start and snap to the end in the last frames. The number device and host keep their screen positions.

## Dialogue rule

Quote the line exactly as approved, once, as audio, and paint that same line as the subtitle. Do not paraphrase it or add a second caption. Keep the host voice identical in every prompt.

## Motion detail

- Describe the motion as timed beats across the clip (`0–2s …; 2–5s …`). Each beat names the action, the expression change, and the camera start and end framing.
- Be exact: which hand, which direction, which prop, how far.
- Lighting stays constant and matches both keyframes.
- Never re-describe a character's appearance or outfit; it follows the keyframes.
- Never name clothing, layers, or gear (no "winter coat", "boots", "backpack"). Say only that each character keeps exactly the outfit in the first and last frames.

## Phase B checks

- Exactly N prompts, one per approved row, each 3–8s.
- Each prompt repeats style lock, cast lock, number device with correct digits, timed beats, audio, handoff, negatives.
- Item images consistent in scale and placement across prompts.
- Last prompt is the full list at rest, every title readable; no bridge to Clip 1.
- No technical colour notation anywhere.
