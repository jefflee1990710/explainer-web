# Listicle Clip Prompt Contract (Phase B)

Use only after explicit approval of the current Phase A. Write ONE self-contained video prompt per clip.

## Prompt order

1. Output spec: duration in seconds (3–8, max 8), aspect ratio, 720p, 24 FPS, synchronized audio.
2. Style lock: repeat the canvas, look and negatives from the Visual style block in one or two sentences.
3. Cast lock: the host (if present) follows the attached start/end keyframes and blueprints exactly; never restyle.
4. On-canvas item list: paint a readable numbered list of every approved item title as a primary graphic. Highlight the current item. Also repeat the number-device spec.
5. Scene at t=0: setting, host pose, number device state, item image state, and where previous items sit (matches the START keyframe).
6. Timed beats scaled to duration: number pops with an SFX hit → item image appears or morphs element by element → settles on the END keyframe. For the hook clip: count line + slam-in. For the outro: items line up at rest.
7. Camera: one modest move (punch-in on the number, drift toward the item). No cuts inside a clip.
8. Audio: the line quoted exactly once, audio-only, in the user-selected adult male or female voice; no background music; number-pop SFX synced to the pop.
9. Handoff: the resting state the next clip inherits (this item shrinks into the row / slides off as the next number arrives) — or, for the last clip, the set at rest; no loop.
10. Negatives: no extra invented labels beyond the numbered item list, no wrong numbers, no host restyle, no style drift, no extra limbs, plus the Visual style negatives.

## Dual-keyframe rule

Start and end keyframes are the SAME SHOT. Interpolate across the FULL duration; never hold the start and snap to the end in the last frames. The number device and host keep their screen positions.

## Dialogue rule

Quote the line exactly as approved, once, as audio. Forbid paraphrase, repetition, captions, or visual transcription. Keep the host voice identical in every prompt.

## Phase B checks

- Exactly N prompts, one per approved row, each 3–8s.
- Each prompt repeats style lock, cast lock, number device with correct digits, timed beats, audio, handoff, negatives.
- Item images consistent in scale and placement across prompts.
- Last prompt rests on the set or last item; no bridge to Clip 1.
- No technical colour notation anywhere.
