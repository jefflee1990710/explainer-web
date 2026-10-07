# Surprise Interview Proposal Contract (Phase A)

Present a readable director's proposal and stop for confirmation before writing model prompts.

## Header contract

1. Title in the planning language and in English
2. Total duration, clip count, loop mode: always Linear
3. The concept in one line, and the surprise hook line
4. Aspect ratio, the close-up for clip 1, and the seated interview setup for every later clip
5. The one character speaks; bottom subtitles match each line
6. Cast lock: the one attached blueprint
7. No music

## Storyboard contract

| Clip # & time | surprise / interview k of N | Start still | Motion, camera | Spoken line | SFX |
|---|---|---|---|---|---|

Clip 1 is 3–4 seconds. Later clips are 3–8 seconds.

## Scene detail

Write `startScene` and `endScene` as four concrete parts, in order:

1. Character: expression, mouth, and eyeline. Never describe hair, face shape, or the blueprint outfit.
2. Set: clip 1 is a plain background close to the face. Clip 2 onward is one chair and one background, repeated.
3. Light: same direction and mood inside a clip. The interview clips share one light.
4. Camera: clip 1 stays right-side up. It starts with the camera high above the head, looking down, and ends after the camera has dropped down and snapped a zoom-in on the surprised face. Head points to the top edge in both stills. Do not flip the picture. Clip 2 onward is a locked right-side-up medium shot of the seated character, centered, eyes to the lens.

Clip 2 opens on the seated shot. It does not continue the close-up.
Clip 3 and after: `startScene` copies the previous `endScene`.

## Motion contract (`motionCamera`)

Timed beats that fill this clip's seconds.

- Clip 1: the person stays right-side up. The camera drops from above and snaps a zoom-in. Sharp and clear. Example: `0–0.15s hold the high start; 0.15–1.2s the camera drops from above and snaps a zoom-in, still right-side up, focus crisp; 1.2–3s hold the tight surprised face`.
- Later clips: mouth speaks the line, a small nod, hands may gesture once. Camera locked. No cut.

## Phase A checks

- Exactly one character.
- Clip 1 is the only close-up and the only framing change.
- Clip 3 and after open on the previous end still.
- Every spoken line is on canvas as shock-poster type: off-white condensed sans, yellow numbers, the payoff on a mustard dry-brush stroke. Letters stay upright. No subtitle bar.
- The last clip rests in the chair. No loop.
