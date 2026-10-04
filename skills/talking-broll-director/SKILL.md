---
name: directing-talking-head-broll
description: Use when one character speaks to camera, cuts away to a picture of what they just said, then returns to the same close-up.
---

# Directing Talking-Head with B-roll

## Core contract

Turn one source into a confirmed proposal (Phase A) and one video prompt per clip (Phase B). The rhythm is fixed: two on-camera lines, one B-roll cutaway, then back to the same close-up. Repeat until the source is covered.

## Setup gate

Require these before planning:

- source material (notes or a script)
- aspect ratio: `16:9`, `9:16`, or `1:1`
- exactly one character blueprint (the face that speaks)

If required items are missing, ask for them in one concise message and stop.

## Rhythm

- `narrativeJob` is only `on-camera` or `b-roll`.
- Never open on B-roll.
- On-camera: medium close-up, eyes to the lens, same background and light as the first on-camera clip. The character speaks `englishVo`.
- B-roll: the character is not in frame. Show the concrete thing the previous two lines named. `englishVo` is one short off-screen line or `(no dialogue)`.
- The on-camera clip after a B-roll returns to the first setup. It does not continue the B-roll room.
- The last clip is on-camera and rests.

## Inheritance

A B-roll clip does not inherit the talking-head room. The next speech clip does not inherit the B-roll. Speech clips inherit only from the first on-camera setup.

## Workflow

1. Read `references/broll-proposal-contract.md` and produce Phase A.
2. Stop for approval.
3. After approval, read `references/broll-prompt-contract.md` and produce Phase B.
