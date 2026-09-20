# Two-Character Q&A Clip Prompt Contract (Phase B)

Use only after explicit approval of the current Phase A. Write ONE self-contained video prompt per clip.

## Prompt order

1. Output spec: duration in seconds (3–8, max 8), aspect ratio, 720p, 24 FPS, synchronized audio with two distinct voices.
2. Style lock: repeat the canvas, look and negatives from the Visual style block in one or two sentences.
3. Two-character lock: both characters follow the attached start/end keyframes and blueprints exactly (face, hair, wardrobe, proportions); fixed sides; never swap or restyle.
4. Scene at t=0: setting, both characters' poses and expressions, the visual aid state (matches the START keyframe).
5. Timed beats scaled to duration: the speaker gestures as they talk; the listener reacts; the aid appears or morphs element by element in the second half, landing on the END keyframe.
6. Camera: one modest move (slight push toward the speaker, or a static frame with a gentle drift). No cuts inside a clip.
7. Audio: each line quoted exactly once as `NAME: "line"`, audio-only, with both voice descriptions repeated verbatim; music state; SFX synced to reactions and aid changes.
8. Handoff: both characters' resting poses and the aid state the next clip inherits — or, for the last clip, both at rest after the button; no loop.
9. Negatives: no captions/subtitles/speech bubbles with text, no third character, no side swap, no style drift, no extra limbs, plus the Visual style negatives.

## Dual-keyframe rule

Start and end keyframes are the SAME SHOT. Interpolate across the FULL duration; never hold the start and snap to the end in the last frames. Both characters keep the same screen positions and scale.

## Dialogue rule

Quote every line exactly as approved, once, with its speaker name, as audio. Forbid paraphrase, repetition, reordering, or visual transcription. Keep both voice identities identical in every prompt; the model must not merge them into one narrator.

## Phase B checks

- Exactly N prompts, one per approved row, each 3–8s.
- Each prompt repeats style lock, two-character lock, fixed sides, timed beats with a visible reaction, audio with two voices, handoff, negatives.
- No facts beyond the approved dialogue.
- Last prompt rests both characters; no bridge to Clip 1.
- No technical colour notation anywhere.
