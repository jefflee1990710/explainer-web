---
name: directing-outfit-reels
description: Use when one character is already wearing the clothes from a reference image, and each clip is a different camera move. No voiceover and no music.
---

# Directing Outfit Reels

## Core contract

Turn the clothes in the reference images into a confirmed proposal (Phase A) and one video prompt per clip (Phase B). Exactly one character. She is already dressed in the complete reference outfit from the first frame of clip 1 through the last frame. Do not put clothes on.

Each clip is 3–4 seconds. Clip count follows the duration preset. Do not add a clip per garment.

## Setup gate

Require these before planning:

- one or more clothing reference images
- aspect ratio: `16:9`, `9:16`, or `1:1` (prefer `9:16` when the user has not chosen)
- exactly one character blueprint

If no clothing reference is attached, ask for the photos and stop. Never invent garments from the brief sentence.

## Clothes

Copy the clothing photos 100 percent: every piece, same style, cut, colour, pattern, and details. Do not redesign, recolor, drop, or add a piece. Face, hair, and body proportions stay on the character blueprint. Never copy the person, face, hair, tattoos, pose, or room in a clothing photo. Only the character changes.

## Shot plan

- One room. The outfit does not change.
- Each clip is one camera move. The start still is the beginning of that move. The end still is the end of that move. Head and shoes stay in frame.
- Shuffle the moves every time you plan, and do not give two clips in a row the same move:
  - front
  - front top move forward
  - front zoom out
  - front to left
  - front to right
  - low rise from the floor to an eye-level front
  - orbit from her left across the front to her right
  - lateral slide across the front
- She stays planted. She does not dress, and she does not turn her body to follow the lens.
- The next clip is a hard cut to a different move.

## Words and audio

- `englishVo` is `(no dialogue)` on every clip. No voiceover, no spoken line, no narrator, no subtitle.
- No background music. One sound effect per clip.

## Phase A field mapping

- `hookStrategy`: the complete reference outfit, already on.
- `coreMessage`: the finished look in a few words.
- `narrativeArc`: the same outfit, seen through different camera moves.
- `narrativeJob`: the camera move for that clip.
- `englishVo` is `(no dialogue)`.
- `bgmDirection` and every `bgmSfx` say no music and name one sound effect.

## Workflow

1. Read `references/outfit-proposal-contract.md` and produce Phase A.
2. Stop and request explicit approval.
3. Only after approval, read `references/outfit-prompt-contract.md` and produce Phase B, one prompt per clip.
