# Story Clip Prompt Contract (Phase B)

Use only after explicit approval of the current Phase A. Write ONE self-contained video prompt per clip.

## Prompt order

1. Output spec: duration in seconds (3–8, max 8), aspect ratio, 720p, 24 FPS, synchronized audio.
2. Style lock: repeat the canvas, look and negatives from the Visual style block in one or two sentences.
3. Cast lock: characters follow the attached start/end keyframes and blueprints exactly — same face, hair, wardrobe, proportions. Never restyle.
4. Scene: location and anchor props, protagonist's pose and feeling at t=0 (matches the START keyframe).
5. Timed beats scaled to duration (e.g. `[0–2s]`, `[2–5s]`, `[5–7s]`): first half stays with the start state (small motion only); second half slides and morphs element by element into the END keyframe. Name the feeling shift in each beat.
6. Camera: one modest move for the whole clip (slow push, drift, tilt). No cuts inside a clip.
7. Audio: narrator line and/or `NAME: "line"` dialogue quoted exactly once, marked audio-only; music state; 1–2 SFX synced to visible events. If the clip is a silent beat, say so.
8. Handoff: the resting end state the next clip inherits — or, for the last clip, the button: rest on the final image, no loop.
9. Negatives: no captions/subtitles/transcribed speech, no logos or UI text, no new characters, no style drift, no extra limbs, plus the Visual style negatives.

## Dual-keyframe rule

Start and end keyframes are the SAME SHOT. Interpolate across the FULL duration; never hold the start pose and snap to the end in the last frames. The character keeps roughly the same screen position and scale.

## Dialogue rule

Quote each spoken line exactly as approved, once, as audio. Forbid paraphrase, repetition, reordering, captions, or visual transcription. Keep the narrator identity identical in every prompt.

## Phase B checks

- Exactly N prompts, one per approved row, each 3–8s.
- Each prompt repeats style lock, cast lock, timed beats, audio, handoff, negatives.
- Beats show emotion through gesture and framing; no lecturing text.
- Last prompt rests on the button and does not bridge to Clip 1.
- No technical colour notation anywhere.
