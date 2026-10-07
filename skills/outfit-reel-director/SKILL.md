---
name: directing-outfit-reels
description: Use when one character puts on clothes from a reference image, one garment at a time, starting in a white crew-neck tank and knee-length athletic shorts.
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

The start is always a modest athletic base already on: an opaque white crew-neck tank covering the shoulders and torso, plus white knee-length athletic shorts, hands at the sides. Do not ask for a starting outfit. Do not write a garment held in the hands, at the chest, at the thighs, or pulled over the head. If no clothing reference is attached, ask for the photos and stop. Never invent garments from the brief sentence.

## Shot plan

- One room. Each clip is a new locked full-body angle (front, 3/4 left, 3/4 right, or slightly-low 3/4 for shoes and socks). Within a clip the camera stays locked. Across clips the angle changes.
- Clip 1 starts already wearing the white tank and white knee-length athletic shorts, standing with hands at the sides, facing camera. If the first reference top is a similar white tank, skip it — the base tank already stands in — and put on the next distinct piece.
- Read the clothing photos. Put on only the distinct pieces they show, copied for cut, colour, and details. Name the reference id in the scene.
- A reference bottom replaces the white knee-length athletic shorts. Do not wear both. Other pieces stay on. Every still is fully dressed.
- Clip 2 and after: clothes already on continue. Do not copy the previous camera or a facing-forward stance. Start stills are a new angle on the clothes already on, not mid-dressing.
- One dressing action per clip, with real body motion: weight shift, look down, 3/4 turn, arms sliding into sleeves, or a step into shoes. Never leave her frozen facing camera with only the hands moving. Never pull a bottom up from the thighs. The torso stays covered; a new bottom is already at the natural waist and the previous shorts vanish underneath.
- The last clip adds nothing. The complete look holds and rests.
- Face, hair, and body proportions stay on the character blueprint. Never copy the person, face, hair, tattoos, pose, or room in a clothing photo. Only the clothes change.

## Words and audio

- Default `englishVo` is `(no dialogue)`. Silent clips have no subtitle.
- A short spoken line that names the finished look is allowed only on the last clip, and only when the user asked for one.
- Music bed. One clothing sound effect per dressing clip. No step numbers and no "now put on" instructions.

## Phase A field mapping

- `hookStrategy`: the first distinct reference garment going on, already in the white tank and knee-length athletic shorts.
- `coreMessage`: the finished look in a few words.
- `narrativeArc`: white athletic base → each reference piece → hold.
- Each dressing row: `narrativeJob` = the garment name. The last row: `narrativeJob` = `hold`.
- `englishVo` is `(no dialogue)` except an optional last line the user requested.

## Workflow

1. Read `references/outfit-proposal-contract.md` and produce Phase A.
2. Stop and request explicit approval.
3. Only after approval, read `references/outfit-prompt-contract.md` and produce Phase B, one prompt per clip.
