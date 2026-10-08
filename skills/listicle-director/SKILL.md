---
name: directing-listicle-shorts
description: Use when turning a list article, a set of tips, tools, mistakes, or reasons into a short animated LISTICLE video ("N things…", one item per clip, best saved for last) for Reels, TikToks, Shorts, or carousels-turned-video.
---

# Directing Listicle Shorts

## Core contract

Turn one source into a confirmed director's proposal (Phase A) and then standalone per-clip video prompts (Phase B). Always make a numbered list. Each clip runs 3–8 seconds (maximum 8 seconds). Show the items one by one: one item per clip until the item count passes the duration ceiling. Only then put 2 items on a middle clip, or 3 if pairs would still pass the ceiling. Never more than 3 on one clip. The last clip always shows the full list. Each item is one clear image and one clear line; the list order is a retention device.

## Setup gate

Require these before planning:

- source material (the list, or the topic and the items to include)
- aspect ratio: `16:9`, `9:16`, or `1:1`
- optional: cast / character reference images (the host)

If required items are missing, ask for them in one concise message and stop. Never select an aspect ratio silently. Do not re-ask choices already supplied.

## Visual world

The rendering rules (canvas, look, palette, and motion) come from the **Visual style** block appended below this skill. Do not invent a different medium. Lettering comes only from the selected text style, never from the visual style or from this skill.

- **Cast lock**: if character references / blueprints are attached, the host MUST follow them exactly across all clips; say so in `characterLock`, never restyle. If none, define ONE simple host in `characterLock` and keep it identical. The host may be absent from some item clips if the item is better shown as an object.
- **On-canvas item (required)**: the hook is a clean empty frame with one large count only. An item clip shows ONLY the item it introduces — its number, a short title (the name, not the spoken sentence), and one object — with empty space around them. The last clip is a clean full list of those short titles, evenly spaced on an empty background. Do not caption the spoken sentence.
- **Item number device**: every item clip also carries a short in-world number marker (`1`, `2`, `3` … or `#1`) drawn as a prop in the style (a tag, a card, a badge, a chalk numeral). Same device, same position, every item.
- **Item image**: each item is ONE concrete object or mini-scene that stands for it. Consistent scale and placement clip to clip so the list reads as a set.
- Keep the setting constant; only the item image and the number change.

## Listicle architecture

1. **Hook (Clip 1)**: a clean, clear frame. One large count ("5", "3") on an empty background. No items, no checklist, no extra props, no tease of a later item, and no caption of the spoken sentence. Leave most of the frame empty. On a 2-clip micro, the hook may be the first item.
2. **Items**: one clip per item until the list passes the duration ceiling. Only then combine 2 items on a middle clip, revealed one by one inside that clip. Use 3 on a clip only when pairs would still pass the ceiling. Never more than 3. Item 1 and the last item each stay alone when there are at least two item clips. The number pops first, then the item image appears, then the line lands. Order for retention: strong first, weakest in the middle, BEST LAST.
3. **Optional mid-list pattern break**: for 6+ items, one item clip may change camera or scale to reset attention.
4. **Payoff item**: the last item gets the most vivid image and the longest beat, still on its own clip.
5. **Full list (required, last clip, ≤5s)**: a clean, clear numbered list of the short titles only, evenly spaced on an empty background. No host, no extra props, no long sentences. `narrativeJob` is `full list`. The set rests. Never loop to item 1. Do not drop this clip to save length.

## Narration

- Default: an energetic but clear adult host voice in the requested voiceover language, second person.
- Rhythm: each item line follows the same grammatical shape ("Number one: … . Number two: …" or "Want X? Do Y."). Parallel structure is the listicle's music.
- ~7–20 spoken words per clip at medium speaking pace. Slow ≈ 0.8× those words with pauses; fast ≈ 1.2× with fewer pauses. Clip duration stays the same. Item lines ≤15 words at medium.
- Spoken lines are audio-only. The hook shows only the count. An item clip shows that item's number and short title. The last clip shows the short titles as a clean list. Do not caption the spoken sentence.

## Phase A field mapping

- `hookStrategy`: the count-and-promise line plus the slam-in device in second 0–2.
- `coreMessage`: what the viewer gains by knowing all N items.
- `narrativeArc`: item order with the retention reasoning (why this first, why that last), mapped to clips.
- `narrator`: voice identity and the parallel sentence shape.
- `visualWorld`: the constant setting, the number device spec (shape, colour, position), and item image scale.
- `characterLock`: cast lock statement.
- `palette`: ordinary colour words; one accent colour reserved for the number device.
- `bgmDirection`: driving beat with a hit on every number pop and a lift on the last item.
- Each clip row: `narrativeJob` = hook / item k of N / items k–m of N / full list; `explainerScene` = the setting, host (if present), number device state, and item image at t=0; `motionCamera` = number pop → item appear → settle, camera; `englishVo` = the line (packed clips join lines with ` | `); `bgmSfx` = beat + number-pop SFX.

## Clip continuity

- Start and end of each clip are the SAME SHOT; within a clip the number pops and the item image forms. The previous item leaves the frame at the clip boundary. Do not keep earlier items visible beside the current one. The full list appears only on the last clip.
- A visible change every 1.5–2.5 seconds: number pop, item appear, item morph, camera punch.
- The last clip is the full list at rest. Never bridge back to Clip 1.

## Workflow

1. Read `references/listicle-proposal-contract.md` and produce Phase A scene descriptions and the VO in the chosen language setting.
2. Stop and request explicit approval.
3. On a change of ratio, item set, order, or wording, recompose Phase A and request approval again.
4. Only after approval, read `references/listicle-prompt-contract.md` and produce Phase B per clip.

## Output rules

- 3–8 seconds per clip; each prompt states its duration.
- Colours in ordinary words only; never hexadecimal, RGB, HSL, or Pantone.
- Items come only from the source; do not pad the list and do not drop items.
- An item still shows only that item. The last still shows the full list. Do not add a second caption of the full voiceover.
- The final clip shows the full list and rests; never a loop.
