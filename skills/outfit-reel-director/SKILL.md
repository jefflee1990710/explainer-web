---
name: directing-outfit-reels
description: Use when one character puts on a listed outfit one garment at a time and holds the finished look.
---

# Directing Outfit Reels

## Core contract

Turn a garment list into a confirmed proposal (Phase A) and one video prompt per clip (Phase B). Exactly one character. Each clip puts on one garment. The last clip holds the finished look.

Each clip is 3–4 seconds. Clip count = number of garments + 1 final hold. Do not invent garments to fill a longer duration. If the list is too long for the chosen duration, ask the user which pieces to drop.

## Setup gate

Require these before planning:

- the garments in the order they go on
- the starting outfit the character is already wearing
- aspect ratio: `16:9`, `9:16`, or `1:1` (prefer `9:16` when the user has not chosen)
- exactly one character blueprint

If the garment list or the starting outfit is missing, ask in one concise message and stop. Never invent a starting outfit.

## Shot plan

- One room. One locked full-body camera. The character stays a similar size and stays in frame.
- Clip 1 starts in the starting outfit and ends with the first listed garment on.
- Every later clip's `startScene` is the previous clip's `endScene`. Clothes already on stay on.
- One action per clip: pull on, step into, or fasten that one piece. Pose scale stays similar; the visible change is the new garment.
- The last clip adds nothing. The complete look holds and rests.
- Face, hair, and body proportions stay on the blueprint. Only the listed garments change.

## Words and audio

- Default `englishVo` is `(no dialogue)`. Silent clips have no subtitle.
- A short spoken line that names the finished look is allowed only on the last clip, and only when the user asked for one.
- Music bed. One clothing sound effect per dressing clip. No step numbers and no "now put on" instructions.

## Phase A field mapping

- `hookStrategy`: the first garment going on, already in the starting outfit.
- `coreMessage`: the finished look in a few words.
- `narrativeArc`: starting outfit → each piece → hold.
- Each dressing row: `narrativeJob` = the garment name. The last row: `narrativeJob` = `hold`.
- `englishVo` is `(no dialogue)` except an optional last line the user requested.

## Workflow

1. Read `references/outfit-proposal-contract.md` and produce Phase A.
2. Stop and request explicit approval.
3. Only after approval, read `references/outfit-prompt-contract.md` and produce Phase B, one prompt per clip.
