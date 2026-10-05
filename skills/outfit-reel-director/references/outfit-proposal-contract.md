# Outfit Reel Proposal Contract (Phase A)

Present a readable director's proposal and stop for confirmation before writing model prompts.

## Garment list

- Use the user's order. One garment per clip, then one hold clip.
- Name the starting outfit once. Every still after that repeats the clothes already on, then the new piece.
- Do not add coats, hats, bags, or shoes the user did not list.
- Face, hair, and proportions stay on the blueprint. The garment names in the scene are the clothes to draw.

## Header contract

1. Title in the planning language and in English
2. Total duration (sum of the 3–4s clips), clip count = garments + 1, loop mode: always Linear
3. The finished look in a few words
4. Aspect ratio, the one room, and the locked full-body camera
5. Cast lock: the one attached blueprint; clothes come from the list
6. Music plus one clothing sound per dressing clip
7. The garment list mapped to clips, with the outfit after each clip

## Storyboard contract

| Clip # & time | Garment / hold | Outfit at clip start | The one action that lands the new piece | VO | SFX |
|---|---|---|---|---|---|

Every dressing clip is 3–4 seconds. The hold clip is 3–4 seconds and adds no garment.

## Scene detail

Write `startScene` and `endScene` as four concrete parts, in order:

1. Character: pose and which listed garments are on. Do not describe hair or face. The end still of a dressing clip has exactly one more garment than the start still.
2. Set: the same room in every clip.
3. Light: the same light in every clip.
4. Camera: locked full-body, character at a similar size, centered.

Clip 2 and after: `startScene` copies the previous `endScene`, including every garment already on.

## Motion contract (`motionCamera`)

Timed beats for the one action. Name the character's own left or right hand, and keep that hand on that garment from the start still through the end still.

Example: `0–1s both hands lift the shirt; 1–3s the shirt comes down over the torso; 3–4s the hands drop and the shirt is on`.

The hold clip is a small settle only: `0–3s a small pose settle; camera locked`. No new clothes.

## Phase A checks

- Exactly one character.
- Clip count equals garments + 1.
- Each dressing clip adds exactly one listed garment and keeps the earlier ones.
- The next start still matches the previous end still.
- Same room and same camera. No flash cuts.
- Silent clips use `(no dialogue)`.
- The last clip rests on the full look. No loop.
