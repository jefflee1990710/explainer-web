---
name: directing-listicle-shorts
description: Use when turning a list article, a set of tips, tools, mistakes, or reasons into a short animated LISTICLE video ("N things…", one item per clip, best saved for last) for Reels, TikToks, Shorts, or carousels-turned-video.
---

# Directing Listicle Shorts

## Core contract

Turn one source into a confirmed director's proposal (Phase A) and then standalone per-clip video prompts (Phase B). Each clip runs 3–8 seconds (maximum 8 seconds). Clip count = 1 intro clip (optional for micro) + one clip per item + 0–1 outro clip, bounded by the duration preset (e.g. 3 items for 15–20s, 4–5 items for 30–45s, 6–8 items for 60s). Each item is one clear image and one clear line; the list order is a retention device.

## Setup gate

Require these before planning:

- source material (the list, or the topic and the items to include)
- aspect ratio: `16:9`, `9:16`, or `1:1`
- optional: cast / character reference images (the host)

If required items are missing, ask for them in one concise message and stop. Never select an aspect ratio silently. Do not re-ask choices already supplied.

## Visual world

The rendering rules (canvas, look, palette, lettering, motion) come from the **Visual style** block appended below this skill. Do not invent a different medium.

- **Cast lock**: if character references / blueprints are attached, the host MUST follow them exactly across all clips; say so in `characterLock`, never restyle. If none, define ONE simple host in `characterLock` and keep it identical. The host may be absent from some item clips if the item is better shown as an object.
- **Item number device**: every item clip carries a short in-world number marker (`1`, `2`, `3` … or `#1`) drawn as a prop in the style (a tag, a card, a badge, a chalk numeral). Same device, same position, every item. Digits only — the item title is spoken, not written.
- **Item image**: each item is ONE concrete object or mini-scene that stands for it. Consistent scale and placement clip to clip so the list reads as a set.
- Keep the setting constant; only the item image and the number change.

## Listicle architecture

1. **Hook (Clip 1, first 2s)**: state the count and the promise mid-motion ("5 things…", "3 mistakes…") while the number device or first item slams in. Optional micro-tease of the last item ("…and #5 is the one everyone gets wrong"). No greetings.
2. **Items**: one clip per item; the number pops first, then the item image appears/morphs, then the line lands. Order for retention: strong first, weakest in the middle, BEST LAST. If items are counted down, say so and keep the direction consistent.
3. **Optional mid-list pattern break**: for 6+ items, one item clip may change camera or scale to reset attention.
4. **Payoff item**: the last item gets the most vivid image and the longest beat.
5. **Outro (optional, ≤5s)**: the full set visible at once (the numbers lined up) and one closing line or CTA. The set rests. Never loop to item 1.

## Narration

- Default: an energetic but clear adult host voice in the requested voiceover language, second person.
- Rhythm: each item line follows the same grammatical shape ("Number one: … . Number two: …" or "Want X? Do Y."). Parallel structure is the listicle's music.
- ~7–20 spoken words per clip; item lines ≤15 words.
- Narration is audio-only. Never caption or subtitle it. On-screen text is limited to the number device and, at most, one short label that is part of the item image (one to two words, spelled exactly).

## Phase A field mapping

- `hookStrategy`: the count-and-promise line plus the slam-in device in second 0–2.
- `coreMessage`: what the viewer gains by knowing all N items.
- `narrativeArc`: item order with the retention reasoning (why this first, why that last), mapped to clips.
- `narrator`: voice identity and the parallel sentence shape.
- `visualWorld`: the constant setting, the number device spec (shape, colour, position), and item image scale.
- `characterLock`: cast lock statement.
- `palette`: ordinary colour words; one accent colour reserved for the number device.
- `bgmDirection`: driving beat with a hit on every number pop and a lift on the last item.
- Each clip row: `narrativeJob` = hook / item k of N / outro; `explainerScene` = the setting, host (if present), number device state, and item image at t=0; `motionCamera` = number pop → item appear/morph → settle, camera; `englishVo` = the line; `bgmSfx` = beat + number-pop SFX.

## Clip continuity

- Start and end of each clip are the SAME SHOT; within a clip the number pops and the item image forms. New item images arrive at clip boundaries by inheriting the previous end (the previous item slides off or shrinks into a row as the next number arrives).
- A visible change every 1.5–2.5 seconds: number pop, item appear, item morph, camera punch.
- The last clip ends with the set (or the last item) at rest. Never bridge back to Clip 1.

## Workflow

1. Read `references/listicle-proposal-contract.md` and produce Phase A in the user's language, VO in the chosen voiceover language.
2. Stop and request explicit approval.
3. On a change of ratio, item set, order, or wording, recompose Phase A and request approval again.
4. Only after approval, read `references/listicle-prompt-contract.md` and produce Phase B per clip.

## Output rules

- 3–8 seconds per clip; each prompt states its duration.
- Colours in ordinary words only; never hexadecimal, RGB, HSL, or Pantone.
- Items come only from the source; do not pad the list.
- No captions, subtitles, item titles written on screen, or UI text beyond the number device.
- The final clip rests; never a loop.
