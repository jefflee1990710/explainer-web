# Tutorial Proposal Contract (Phase A)

Present a readable director's proposal and stop for confirmation before writing model prompts.

## Adapt the source into steps

- State the goal as a finished, visible result.
- Extract the steps in the exact order of the source; merge trivial ones, split any step with two actions.
- Name every tool/input once in the workspace lock; each step touches at most one or two of them.
- Track the object's state after each step — the next step starts from it.

Step counts and spoken words per preset (~2.2–2.5 words/second):

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
