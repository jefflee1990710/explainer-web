# Follow Shot Proposal Contract (Phase A)

Present a readable director's proposal and stop for confirmation before writing model prompts.

## Header contract

1. Title in the planning language and in English
2. Total duration, clip count, each clip 3–6 seconds, loop mode: always Linear
3. The place and the action
4. Aspect ratio and the one locked third-person camera
5. Cast lock: the one attached blueprint, clothes unchanged
6. No narrator
7. The beats mapped to clips

## Storyboard contract

| Clip # & time | walk / turn / gesture / rest | Start still | The one beat | VO | SFX |
|---|---|---|---|---|---|

## Scene detail

Write `startScene` and `endScene` as four concrete parts, in order:

1. Character: pose, facing, and feet. Never describe hair, face, or outfit. One instance of the character.
2. Set: the same place. Name one or two fixed landmarks so the background can shift only a little.
3. Light: the same light in every clip.
4. Camera: locked third-person, similar shot size, character at a similar screen size.

Clip 2 and after: `startScene` copies the previous `endScene`.

## Motion contract (`motionCamera`)

One timed beat. The character moves a short distance or turns. The camera does not cut and does not become a new angle.

Example: `0–4s three steps toward the lens, background shifts slightly, camera locked; 4–5s weight settles`.

The last clip ends stopped. No loop.

## Phase A checks

- Exactly one character.
- Every clip after the first opens on the previous end still.
- Same camera angle for the whole video.
- Background landmarks stay recognizable.
- Clothes do not change.
- Silent clips use `(no dialogue)`.
- The last clip rests. No whip pan and no new setup.
