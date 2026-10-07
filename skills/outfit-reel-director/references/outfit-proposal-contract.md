# Outfit Reel Proposal Contract (Phase A)

Present a readable director's proposal and stop for confirmation before writing model prompts.

## Outfit

- She is already wearing every garment in the clothing reference images, from clip 1 through the last clip. Do not write a dressing action.
- Copy style, cut, colour, pattern, and details exactly. Name the reference ids. Do not add pieces the photos do not show.
- Face, hair, and proportions stay on the character blueprint. Do not copy the person in the clothing photo.

## Header contract

1. Title in the planning language and in English
2. Total duration (sum of the 3–4s clips), clip count from the duration preset, loop mode: always Linear
3. The finished look in a few words
4. Aspect ratio, the one room, and a different camera move on every clip
5. Cast lock: face and hair from the one attached blueprint; clothes come only from the clothing references
6. No voiceover. No background music. One sound effect per clip
7. The camera-move list, with the same complete outfit on every row

## Storyboard contract

| Clip # & time | Camera move | Outfit | The camera travel | VO | SFX |
|---|---|---|---|---|---|

Every clip is 3–4 seconds. The outfit column is the same complete reference look on every row. VO is `(no dialogue)`.

## Scene detail

Write `startScene` and `endScene` as four concrete parts, in order:

1. Character: a planted standing pose in the complete reference outfit. Do not describe hair or face. Do not put a garment in her hands.
2. Set: the same room in every clip. Do not copy the room in the clothing photo.
3. Light: the same light in every clip.
4. Camera: the start still is the beginning of this clip's one rotation. The end still is where that rotation lands. Same pose, same room, same distance, and same subject size. Head and shoes stay in frame.

## Motion contract (`motionCamera`)

Timed beats for the camera only. She is already dressed and stays planted in the same pose. The move is one slow gimbal rotation for the whole clip. Same distance and same subject size. No push, no zoom, no handheld shake, no whip, and no jump.

Assign these rotations, a different one on every clip, and a new shuffle each time you plan. The default order is:

- left to right
- top to bottom
- right to left
- bottom to top

## Audio

- `englishVo` is `(no dialogue)` on every clip.
- `bgmDirection` is no background music, sound effects only.
- Each `bgmSfx` names one sound effect and says no voice and no music.

## Phase A checks

- Exactly one character.
- Clip count follows the duration preset, not the number of garments.
- Every still shows the complete reference outfit. No dressing.
- Clothes match the reference in style and colour. Only the character changes.
- Same room. A different camera move each clip. No flash cuts inside a clip.
- Every clip is `(no dialogue)`. No background music.
