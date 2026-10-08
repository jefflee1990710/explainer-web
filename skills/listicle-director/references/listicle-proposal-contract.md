# Listicle Proposal Contract (Phase A)

Present a readable director's proposal and stop for confirmation before writing model prompts.

## Adapt the source into a list

- Extract every distinct item. Do not drop items to fit a shorter preset. Merge only exact duplicates.
- Always show them one by one. One item per clip until the item count passes the ceiling below.
- Above that ceiling, put 2 items on a middle clip. Use 3 on a clip only when pairs would still pass the ceiling. Never more than 3 on one clip. If 3 per clip still passes the ceiling, keep 3 per clip and let the clip count run over the preset.
- Item 1 and the last item each stay on their own clip when there are at least two clips.
- Order: strong first, weakest middle, best last. State the reasoning in the arc.
- Give every item the same sentence shape.

Ceilings and spoken words (~2.2–2.5 words/second at medium pace). Slow ≈ 0.8× the words; fast ≈ 1.2×. One item per clip stays inside these ceilings:

- **4–8s micro**: ceiling 2 clips.
- **15–20s short**: ceiling 4 clips; ~35–50 words when the list fits.
- **30–45s punchy**: ceiling 6 clips; ~70–110 words when the list fits.
- **50–60s full**: ceiling 10 clips; ~120–150 words when the list fits.
- **Auto**: ceiling 12 clips, one item each until then.

## Header contract

1. Title in the reference language and in English
2. Total duration, clip count N (each 3–8s), item count, loop mode: always Linear
3. Core promise and the hook (count-and-promise line + slam-in device)
4. Aspect ratio, constant setting, number device spec (shape, colour, position), item image scale
5. Host voice, sentence shape, spoken-unit count
6. Cast lock: attached blueprints exactly, or the single defined host
7. Music direction and the item order with retention reasoning

## Storyboard contract

| Clip # & time | Hook / item k of N / outro | Scene at clip start | Number pop → item appear/morph → settle, camera & handoff | VO | BGM / SFX |
|---|---|---|---|---|---|

Rules per row:

- One item per row unless this row is a packed middle clip (`items k-m of N`). A packed row joins those item lines in the VO with ` | ` and still shows them one by one: start highlights the first, end highlights the last.
- `Scene at clip start` repeats the number device spec and states that the previous item has left the frame. Do not leave a visible checklist of the other items.
- The item image is one concrete object or mini-scene; keep scale and placement consistent across items.
- The last item row has the most vivid image and the longest beat, and it is not the last clip.
- The last clip is always `full list`: every item title visible at once, one closing line, the set at rest.
- A visible change every 1.5–2.5 seconds.

## Scene detail

Write every scene field as four concrete parts, in order:

1. Character: expression, pose, action, and eyeline of each on-screen character. Never describe appearance, hair, or outfit — that follows the character reference.
2. Set: location, set dressing, props, foreground / midground / background.
3. Light: light direction, colour temperature, mood.
4. Camera: shot size, camera angle, composition, and each character's screen position.

Prefer specific nouns (a chipped blue mug, warm window light from the left) over generic ones.

## Motion contract (`motionCamera` / 鏡頭動作)

`motionCamera` is the transition script from the start still to the end still. The video model only gets those two frames plus this text, so it must explain how one becomes the other.

Write it as timed beats (`0–2s …; 2–5s …`). Each beat states: time window → who or what moves → from where to where → how (picked up, set down, slid in from the frame edge, written on, wiped off) → the expression change and the camera framing.

- Every difference between the start and end still gets a beat that shows its cause on camera: pose, each hand, eyeline, expression, and every prop or label that moves, appears, disappears, or changes state.
- A prop that is in the end still but not in the start still is either added to the start still, or enters on camera in a beat (placed by a hand, slides in from the frame edge).
- A prop that is in the start still but not in the end still leaves on camera in a beat (put away, moved off frame, covered).
- Name each hand by the character's own left or right, and keep the same hand on the same prop from the start still through `motionCamera` to the end still.
- The start and end still of one clip share the same light and the same camera; a mood change comes from expression and props.
- When on-canvas voiceover lettering is on, add a midpoint beat where the start line wipes off and the end line writes on in the same spot. Keep that lettering out of the start and end still text; the still prompt adds it from the VO beats.

Before returning, compare each clip's start and end still item by item: every difference appears in `motionCamera`, and every object `motionCamera` touches already exists in the start still or enters in a beat.

Wardrobe lock: every character wears exactly their blueprint outfit in every clip, whatever the setting or weather. Never plan a costume change, weather gear (coats, gloves, hats, boots), or body-worn props (backpacks, harnesses, clip-on mics, helmets) — in scenes or in `visualWorld`. Hand-held props are fine. Pick settings that work in that outfit.

## Composition by aspect ratio

- `16:9`: number device top-left, the one item image centre-right, host (if present) left. No side list.
- `9:16`: number device top-centre, the one item image in the middle third, host in the lower third. No side list.
- `1:1`: number device top-left corner, the one item image centred. No side list.
- Hook: one large count, empty background, nothing else.
- The last clip only: a clean numbered list of the short titles, evenly spaced, empty background, no host and no extra props.

## Palette and text

- Colours in ordinary words only; the accent colour is reserved for the number device.
- The hook shows only the count. An item clip shows only that item's number and short title (the name, not the spoken sentence). The last clip shows those short titles in a clean list. No extra invented labels.

## Confirmation ending

Ask the user to approve, drop/add/reorder an item, or change a global setting.

## Phase A checks

- Item count matches the preset and the hook line.
- Every item has a concrete visual stand-in and a parallel-shaped line.
- Best item is last; order reasoning stated.
- Number device spec present and consistent; digits only.
- Every clip 3–8s; same-shot start/end; next row inherits the previous end.
- The last row is `full list`, every title readable; no loop.
- No padding beyond the source; no technical colour notation.
