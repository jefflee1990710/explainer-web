# Tutorial Proposal Contract (Phase A)

Present a readable director's proposal and stop for confirmation before writing model prompts.

## Adapt the source into steps

- State the goal as a finished, visible result.
- Extract the steps in the exact order of the source; merge trivial ones, split any step with two actions.
- Name every tool/input once in the workspace lock; each step touches at most one or two of them.
- Track the object's state after each step — the next step starts from it.

Step counts and spoken words per preset (~2.2–2.5 words/second at medium pace). Slow ≈ 0.8× the words; fast ≈ 1.2×. Clip count and duration stay the same:

- **4–8s micro**: 1 step between a quick result flash and the result; ~10–18 words, 1–2 clips.
- **15–20s short**: 2–3 steps; ~35–50 words, 3–4 clips.
- **30–45s punchy**: 3–5 steps; ~70–110 words, 4–6 clips.
- **50–60s full**: 5–8 steps; ~120–150 words, 7–10 clips.

## Header contract

1. Title in the reference language and in English
2. Total duration, clip count N (each 3–8s), step count, loop mode: always Linear
3. Goal / core promise and the result-first hook (promise line + motion/SFX)
4. Aspect ratio, workspace lock (surface, laid-out inputs, result zone), step marker spec
5. Instructor voice, imperative mood, spoken-unit count
6. Cast lock: attached blueprints exactly, single defined instructor, or hands-only framing
7. Music direction and the step list mapped to clips, with the object's state after each

## Storyboard contract

| Clip # & time | Hook / step k of N / mistake / result | Scene at clip start (workspace + object state + marker) | Marker pop → hand action → visible state change, camera & handoff | VO | BGM / SFX |
|---|---|---|---|---|---|

Rules per row:

- Exactly one action and one visible state change per step row.
- `Scene at clip start` restates the object's current state (inherited) and the step marker digits.
- The hand action names the tool/input from the workspace lock.
- The active object is large and central; the rest of the workspace stays in place.
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

- `16:9`: inputs along the left, active object centre, result zone right; step marker top-left.
- `9:16`: inputs across the bottom, active object middle third, result zone top; step marker top-centre.
- `1:1`: active object centred and large, inputs along the bottom edge, step marker top-left corner.

## Palette and text

- Colours in ordinary words only; the accent colour marks the step marker and the active object.
- No captions, subtitles, or written step descriptions. Step marker digits plus labels that physically exist on objects only, spelled exactly.

## Confirmation ending

Ask the user to approve, split/merge/reorder a step, correct the workspace inputs, or change a global setting.

## Phase A checks

- Result appears first (hook) and last (finished); the steps between are in source order.
- Every step row has one action, one visible state change, and the correct marker digits.
- Object state chains from row to row without resets.
- Workspace lock and cast lock present; no invented tools, quantities, or safety claims.
- Every clip 3–8s; same-shot start/end; next row inherits the previous end.
- The last row rests on the finished result; no loop.
- No technical colour notation.
