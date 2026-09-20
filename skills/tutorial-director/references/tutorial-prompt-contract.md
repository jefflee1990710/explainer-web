# Tutorial Clip Prompt Contract (Phase B)

Use only after explicit approval of the current Phase A. Write ONE self-contained video prompt per clip.

## Prompt order

1. Output spec: duration in seconds (3–8, max 8), aspect ratio, 720p, 24 FPS, synchronized audio.
2. Style lock: repeat the canvas, look and negatives from the Visual style block in one or two sentences.
3. Cast lock: the instructor / hands follow the attached start/end keyframes and blueprints exactly; never restyle.
4. Workspace lock: repeat the surface, the laid-out inputs, the result zone, and the step marker spec with this clip's digits.
5. Scene at t=0: the object's inherited state and the hand position (matches the START keyframe).
6. Timed beats scaled to duration: step marker pops with a soft hit → hand enters and performs the ONE action on the named object → the state change completes element by element, landing on the END keyframe. For the hook clip: finished result in use → slides aside → empty workspace revealed. For the result clip: finished object in the result zone, in use if applicable.
7. Camera: one modest move (gentle push on the active object). No cuts inside a clip.
8. Audio: the step line quoted exactly once, audio-only, imperative; steady music; the action SFX synced to the state change.
9. Handoff: the object's new state and the workspace the next clip inherits — or, for the last clip, the finished result at rest; no loop.
10. Negatives: no captions/subtitles/written step text, no wrong step digits, no new tools not in the workspace lock, no object teleporting or resetting, no extra hands or fingers, no style drift, plus the Visual style negatives.

## Dual-keyframe rule

Start and end keyframes are the SAME SHOT. Interpolate across the FULL duration; never hold the start and snap to the end in the last frames. The workspace and step marker keep their screen positions; only the hand and the active object move.

## Dialogue rule

Quote the line exactly as approved, once, as audio. Forbid paraphrase, repetition, captions, or visual transcription. Keep the instructor voice identical in every prompt.

## Phase B checks

- Exactly N prompts, one per approved row, each 3–8s.
- Each prompt repeats style lock, cast lock, workspace lock with correct step digits, timed beats with one action and one state change, audio, handoff, negatives.
- Object state chains correctly from the previous prompt's handoff.
- Last prompt rests on the finished result; no bridge to Clip 1.
- No technical colour notation anywhere.
