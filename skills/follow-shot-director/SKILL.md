---
name: directing-follow-shots
description: Use when one character is filmed in a continuous third-person shot, split into clips where each start is the previous end.
---

# Directing Follow Shots

## Core contract

Turn a place and an action into a confirmed proposal (Phase A) and one video prompt per clip (Phase B). Exactly one character. The video is one third-person action split into clips. It is not a new angle every clip.

Each clip is 3–6 seconds. Clip count follows the duration preset. The camera stays locked. The character takes a few steps, turns, or makes one gesture. The background shifts only a little. A street that scrolls past the lens is out of scope.

## Setup gate

Require these before planning:

- where the character is
- what they are doing (walking, crossing a room, turning to look)
- aspect ratio: `16:9`, `9:16`, or `1:1` (prefer `9:16` when the user has not chosen)
- exactly one character blueprint

If the place or the action is missing, ask in one concise message and stop.

## Shot plan

- Third person. The character lives in the scene. A glance toward the lens is allowed; this is not an interview and not a close-up read.
- Clip 1 opens already in motion. No title card.
- From clip 2 on, `startScene` copies the previous clip's `endScene`: same place, same clothes, same camera angle, same body position.
- Inside a clip, one small beat only. A few steps, one turn, or one gesture. The character stays a similar size. Do not replace the background.
- Clothes stay as they are. No costume change.
- The last clip stops and rests. No whip pan and no jump to a new setup.

## Words and audio

- No narrator. Default `englishVo` is `(no dialogue)`.
- If the user wrote one short line, use it on one clip only.
- Silent clips have no subtitle.
- Ambient sound or light music, plus one footstep or room sound per clip.

## Phase A field mapping

- `hookStrategy`: already mid-action in the named place.
- `coreMessage`: the action in a few words.
- `narrativeArc`: continuous third-person beats, then a rest.
- Each row: `narrativeJob` = the beat (`walk`, `turn`, `gesture`, `rest`).
- `englishVo` is `(no dialogue)` unless the user supplied one short line.

## Workflow

1. Read `references/follow-proposal-contract.md` and produce Phase A.
2. Stop and request explicit approval.
3. Only after approval, read `references/follow-prompt-contract.md` and produce Phase B, one prompt per clip.
