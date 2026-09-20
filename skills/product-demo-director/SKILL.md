---
name: directing-product-demos
description: Use when turning product copy, a feature list, a landing page, or launch notes into a short animated PRODUCT DEMO or UNBOXING video (pain point → reveal → key features in use → result) for ads, Reels, product pages, or launch posts.
---

# Directing Product Demos and Unboxings

## Core contract

Turn one source into a confirmed director's proposal (Phase A) and then standalone per-clip video prompts (Phase B). Each clip runs 3–8 seconds (maximum 8 seconds). Clip count follows the number of features worth showing and the duration preset (e.g. 2–3 clips for a 15s teaser, 4–6 clips for a 30–45s demo, 7–10 clips for a 60s walkthrough). Show the product doing the job; do not list adjectives.

## Setup gate

Require these before planning:

- source material (product name, what it is, the features / benefits to show, target user)
- aspect ratio: `16:9`, `9:16`, or `1:1`
- optional: cast / character reference images (the presenter or the user of the product)

If required items are missing, ask for them in one concise message and stop. Never select an aspect ratio silently. Do not re-ask choices already supplied.

## Visual world

The rendering rules (canvas, look, palette, lettering, motion) come from the **Visual style** block appended below this skill. Do not invent a different medium.

- **Product lock**: define the product ONCE in `visualWorld` as a fixed prop spec — shape, size relative to the character, two colours in ordinary words, one distinguishing detail (a dial, a strap, a logo mark drawn as a simple shape) — and repeat that exact description in every clip row that shows it. The product never changes shape, colour, or proportion between clips. If the source has no visual description, invent a simple, plausible one and state that it is a placeholder for the user to confirm.
- **Cast lock**: if character references / blueprints are attached, the presenter/user MUST follow them exactly across all clips; say so in `characterLock` and never restyle them. If none, define ONE simple presenter in `characterLock` and keep it identical.
- Hands and the product are the stars: frame them large; the presenter's face is secondary.
- Environment: one clean surface or context appropriate to the product, reused in every clip.

## Demo architecture

1. **Hook (Clip 1, first 2s)**: the pain point as a visible moment, or the product box / silhouette entering frame with a motion + SFX hit. Never open on a logo card.
2. **Reveal / unboxing**: the product appears fully for the first time in one satisfying beat (lid off, cloth pulled, slide-in). Say the product name here.
3. **Feature in use ×1–4**: one clip per feature. Each clip = a hand action → an immediate visible result. Say the benefit, not the spec sheet.
4. **Proof or contrast**: before/after, side-by-side, or a quick stress moment where the product holds up.
5. **Result & CTA**: the user with the finished outcome; one short call to action (visit, try, pre-order) as spoken VO. The product rests in frame, clean and centred.

Order features by desire: the most wanted feature comes last before the result. Keep claims to those present in the source.

## Narration

- Default: a confident, friendly adult presenter voice in the requested voiceover language, second person ("you"). First-person presenter lines are allowed if the cast is the presenter.
- ~7–20 spoken words per clip; benefit language ("so you can…") over spec language.
- Narration is audio-only. Never caption or subtitle it. In-world text is allowed only as part of the product or packaging (the product name on the box, a button label) — short, exactly spelled.

## Phase A field mapping

- `hookStrategy`: the pain-point moment or box-entrance plus the motion/SFX device in second 0–2.
- `coreMessage`: the single promise (what the product lets the user do).
- `narrativeArc`: hook → reveal → features (list them) → proof → result/CTA, mapped to clips.
- `narrator`: voice identity, person, tone.
- `visualWorld`: the environment AND the product lock spec.
- `characterLock`: cast lock statement.
- `palette`: ordinary colour words; the product's two colours are the accent.
- `bgmDirection`: upbeat, clean, with a reveal hit and a resolving end.
- Each clip row: `narrativeJob` = which demo beat / which feature; `explainerScene` = what is visible at t=0 (hand, product state, surface); `motionCamera` = the action and its visible result within the same shot; `englishVo` = spoken line; `bgmSfx` = music + the SFX synced to the product action.

## Clip continuity

- Start and end of each clip are the SAME SHOT; the end shows the result of the action (lid off, light on, item sorted). No cuts inside a clip.
- The next clip inherits the product state and placement from the previous end.
- A visible change every 1.5–2.5 seconds: hand move, product state change, camera push, result pop.
- The last clip ends on the product at rest with the outcome visible. Never loop back to the box or Clip 1.

## Workflow

1. Read `references/demo-proposal-contract.md` and produce Phase A in the user's language, VO in the chosen voiceover language.
2. Stop and request explicit approval.
3. On a change of ratio, product spec, feature order, or narration, recompose Phase A and request approval again.
4. Only after approval, read `references/demo-prompt-contract.md` and produce Phase B per clip.

## Output rules

- 3–8 seconds per clip; each prompt states its duration.
- Colours in ordinary words only; never hexadecimal, RGB, HSL, or Pantone.
- Never invent features, specs, prices, awards, or reviews absent from the source.
- No captions, subtitles, watermarks, or floating UI text.
- The final clip resolves and rests; never a loop.
