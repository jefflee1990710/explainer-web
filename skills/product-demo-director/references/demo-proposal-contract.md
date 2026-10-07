# Product Demo Proposal Contract (Phase A)

Present a readable director's proposal and stop for confirmation before writing model prompts.

## Adapt the source into a demo

- Name the product and the ONE promise it makes to the target user.
- Pick 1–4 features that visibly prove the promise. Drop features that cannot be shown as a hand action with a visible result.
- Write the product lock spec (shape, relative size, two colours, one distinguishing detail) before writing any clip.
- Use only claims present in the source.

Spoken words scale with the preset (~2.2–2.5 words/second at medium pace). Slow ≈ 0.8×; fast ≈ 1.2×. Clip count and duration stay the same:

- **4–8s micro**: ~10–18 words, 1–2 clips — reveal → one feature → result.
- **15–20s short**: ~35–50 words, 2–4 clips.
- **30–45s punchy**: ~70–110 words, 4–6 clips.
- **50–60s full**: ~120–150 words, 7–10 clips.

## Header contract

1. Title in the reference language and in English
2. Total duration, clip count N (each 3–8s), loop mode: always Linear
3. Core promise and the hook (pain-point moment or box entrance + motion/SFX)
4. Aspect ratio, environment, and the product lock spec
5. Presenter voice, person, tone, spoken-unit count
6. Cast lock: attached blueprints exactly, or the single defined presenter
7. Music direction and the demo arc (hook → reveal → features → proof → result/CTA)

## Storyboard contract

| Clip # & time | Demo beat / feature | Scene at clip start | Hand action → visible result, camera & handoff | VO | BGM / SFX |
|---|---|---|---|---|---|

Rules per row:

- One feature per row. Name the feature in `Demo beat` and the benefit in the VO.
- `Scene at clip start` repeats the product lock spec words for shape and colours whenever the product is visible.
- `Hand action → visible result` is the whole motion of the clip: what the hand does and what the product visibly does in response, ending in the resting state the next row inherits.
- Product large in frame; hands readable. Any face that appears is the selected character's face and hair, not the person in a reference photo.
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

Wardrobe lock: every character wears exactly their blueprint outfit in every clip, whatever the setting or weather. Never plan a costume change, weather gear (coats, gloves, hats, boots), or body-worn props (backpacks, harnesses, clip-on mics, helmets) — in scenes or in `visualWorld`. Hand-held props are fine. Pick settings that work in that outfit. If the user's instruction says the clothes follow a reference image, copy only those garments. Face and hair still stay on the blueprint. Do not copy the person in that photo.

## Composition by aspect ratio

- `16:9`: product centre-right, hand enters from the left; leave clean space on one side for post-production overlays.
- `9:16`: product in the middle third, hand from below; result pops above the product.
- `1:1`: product centred and large; hand from the bottom-left corner.

## Palette and text

- Colours in ordinary words only; the product's two colours are the only accents.
- No captions or subtitles. On-product or on-box text only (product name, a button label), one to three words, spelled exactly.

## Confirmation ending

Ask the user to approve, confirm or correct the product lock spec, reorder or swap a feature, or change a global setting.

## Phase A checks

- Product lock spec present and repeated consistently in every product row.
- Every feature row has a hand action and a visible result.
- The most desired feature is the last feature before the result.
- No invented claims; CTA is spoken, not written on screen.
- Every clip 3–8s; same-shot start/end; the next row inherits the previous end.
- The last row rests on the product with the outcome visible; no loop.
- No technical colour notation.
