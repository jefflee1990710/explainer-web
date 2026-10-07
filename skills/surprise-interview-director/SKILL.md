---
name: directing-surprise-interviews
description: Use when one character opens on a surprised close-up, then sits facing the camera and explains a concept like an interview.
---

# Directing Surprise Interviews

## Core contract

Turn a concept or a spoken script into a confirmed proposal (Phase A) and one video prompt per clip (Phase B). Exactly one character. Clip 1 is a surprised close-up. Every later clip is that same person seated, facing the camera, explaining the concept.

Each clip is 3–8 seconds. Clip 1 is 3–4 seconds. Clip count follows the duration preset.

## Setup gate

Require these before planning:

- source material: the concept to explain, or a spoken script
- aspect ratio: `16:9`, `9:16`, or `1:1`
- exactly one character blueprint

If any required item is missing, ask in one concise message and stop. Never pick an aspect ratio silently.

## Shot plan

1. **Clip 1 — surprise hook (3–4s).** The person stays right-side up. The camera starts above the head, looking down, then drops downward while it snaps a zoom-in onto the face. Sharp and clear, no blur, and do not flip the picture. The expression moves into a clear surprise. One short hook line.
2. **Clip 2 — seated interview.** Medium shot. The same character is now sitting, facing the lens, and starts the explanation. This is the only framing change in the video. Do not copy the close-up into this clip's start.
3. **Clip 3 and after.** The interview continues. `startScene` copies the previous clip's `endScene`. Same chair, same background, same light. Only the mouth, a small nod, and the hands change.

One idea per interview clip. The last clip ends with the character at rest in the chair.

## Words

- If the user pasted a script, copy those sentences in order into `englishVo`. The first sentence is the hook. Do not rewrite them.
- If the user gave only a concept, write the interview lines. The hook is one short line. Later lines explain, one point each.
- The character speaks every line to the camera. No second voice.
- On-canvas type is a shock poster on every clip. Ultra-bold condensed sans-serif. Body words are white. Numbers, prices, and percents are mustard yellow. The payoff phrase is black type on a thick mustard-yellow dry-brush stroke, slightly tilted. Clip 1 places it huge at the top. Every later clip places the same design smaller at the bottom, as the subtitle, and keeps it pinned there for the whole clip. Not a white subtitle bar. The camera stays locked and does not zoom out. Letters stay upright and sharp. Spell the spoken line exactly. Do not add a "shock hook" label.

## Audio

No background music.

## Phase A field mapping

- `clipCount` follows the preset, with clip 1 reserved for the surprise. `loopMode` is always linear.
- `hookStrategy`: the surprised close-up and the short hook line.
- `coreMessage`: the concept in one line.
- `narrativeArc`: surprise close-up → seated interview points → rest.
- Each row: `narrativeJob` is `surprise` for clip 1 and `interview k of N` after that. `englishVo` is that clip's spoken line.

## Workflow

1. Read `references/surprise-proposal-contract.md` and produce Phase A.
2. Stop and request explicit approval.
3. Only after approval, read `references/surprise-prompt-contract.md` and produce Phase B, one prompt per clip.
