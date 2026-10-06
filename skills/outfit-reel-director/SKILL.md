---
name: directing-outfit-reels
description: Use when one character puts on clothes from a reference image, one garment at a time, starting in a modest white athletic tank and shorts.
---

# Directing Outfit Reels

## Core contract

Turn the clothes in the reference images into a confirmed proposal (Phase A) and one video prompt per clip (Phase B). Exactly one character. Each clip puts on one garment. The last clip holds the finished look.

Each clip is 3–4 seconds. Clip count = number of new reference garments + 1 final hold. Do not invent garments to fill a longer duration. If the photos show too many pieces for the chosen duration, ask the user which pieces to drop.

## Setup gate

Require these before planning:

- one or more clothing reference images
- aspect ratio: `16:9`, `9:16`, or `1:1` (prefer `9:16` when the user has not chosen)
- exactly one character blueprint

The start is always a modest white athletic base already on: a plain white fitted tank that covers the torso, plus matching white tight shorts. Do not ask for a starting outfit. Never write shorts-only, a bare torso, underwear, a garment held at chest level, or pulling a top over the head. If no clothing reference is attached, ask for the photos and stop. Never invent garments from the brief sentence.

## Shot plan

- One room. One locked full-body camera. The character stays a similar size and stays in frame.
- Clip 1 starts already wearing the white tank and white tight shorts. If the first reference top is a similar white tank, skip it — the base tank already stands in — and put on the next distinct piece.
- Read the clothing photos. Put on only the distinct pieces they show, copied for cut, colour, and details. Name the reference id in the scene.
- A reference bottom replaces the white tight shorts. Do not wear both. Other pieces stay on. The torso stays covered in every still.
- Every later clip's `startScene` is the previous clip's `endScene`.
- One action per clip: pull on, step into, or fasten that one piece at the waist or feet. Pose scale stays similar; the visible change is the new garment.
- The last clip adds nothing. The complete look holds and rests.
- Face, hair, and body proportions stay on the character blueprint. Never copy the person, face, hair, tattoos, pose, or room in a clothing photo. Only the clothes change.

## Words and audio

- Default `englishVo` is `(no dialogue)`. Silent clips have no subtitle.
- A short spoken line that names the finished look is allowed only on the last clip, and only when the user asked for one.
- Music bed. One clothing sound effect per dressing clip. No step numbers and no "now put on" instructions.

## Phase A field mapping

- `hookStrategy`: the first distinct reference garment going on, already in the white tank and shorts.
- `coreMessage`: the finished look in a few words.
- `narrativeArc`: white athletic base → each reference piece → hold.
- Each dressing row: `narrativeJob` = the garment name. The last row: `narrativeJob` = `hold`.
- `englishVo` is `(no dialogue)` except an optional last line the user requested.

## Workflow

1. Read `references/outfit-proposal-contract.md` and produce Phase A.
2. Stop and request explicit approval.
3. Only after approval, read `references/outfit-prompt-contract.md` and produce Phase B, one prompt per clip.
