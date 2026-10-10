# Two-Character Q&A Proposal Contract (Phase A)

Present a readable director's proposal and stop for confirmation before writing model prompts.

## Adapt the source into a question ladder

- List the 2–5 questions a curious viewer would actually ask about the source, in the order that builds curiosity. Start with the most surprising or relatable one.
- Each answer uses only facts in the source and reveals ONE idea.
- Put the biggest "aha" in the last third.
- Assign roles: ASKER (viewer stand-in) and ANSWERER (expert). Fix their screen sides.

Spoken words scale with the preset (~2.2–2.5 words/second at medium pace). Slow ≈ 0.8×; fast ≈ 1.2×. Clip count and duration stay the same:

- **4–8s micro**: ~10–18 words, 1–2 clips — one question, one answer.
- **15–20s short**: ~35–50 words, 2–4 clips — 1–2 exchanges.
- **30–45s punchy**: ~70–110 words, 4–6 clips — 2–3 exchanges.
- **50–60s full**: ~120–150 words, 7–10 clips — 3–5 exchanges.

## Header contract

1. Title in the reference language and in English
2. Total duration, clip count N (each 3–8s), loop mode: always Linear
3. Core answer and the hook question (+ the asker's motion/prop device)
4. Aspect ratio, setting, fixed staging (who is on which side), aid zone
5. Dialogue language, "No narrator — characters speak." plus each supplied voice lock pasted verbatim (the project voice lock for a speaker without their own). Do not invent a timbre. Total spoken-unit count.
6. Two-character lock: attached blueprints exactly (with role assignment), or the two defined characters
7. SFX direction (no background music) and the exchange ladder mapped to clips

## Storyboard contract

| Clip # & time | Exchange / role | Scene at clip start (both characters + aid) | Gesture, reaction, aid change, camera & handoff | Dialogue (NAME: "line") | SFX |
|---|---|---|---|---|---|

Rules per row:

- Name which exchange and whether the row is a question, an answer, or a short Q+A.
- `Scene at clip start` always lists both characters with their fixed sides, poses, and the visual aid state at t=0.
- The asker visibly reacts in every answer row (lean, eyebrow, step back, prop grab). Their mouth stays closed while the answerer speaks.
- `motionCamera` names the speaker. That character's mouth lip-syncs every syllable of their line. The listener's mouth stays closed.
- Aids are the only elements allowed to appear, morph, or vanish; characters never swap sides or leave.
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
- When on-canvas voiceover lettering is on, write each still's spoken line into that still as Subtitle (spell exactly): "<that beat>". The still paints that sentence. Add a midpoint beat where the start line wipes off and the end line writes on in the same spot.

Before returning, compare each clip's start and end still item by item: every difference appears in `motionCamera`, and every object `motionCamera` touches already exists in the start still or enters in a beat.

Wardrobe lock: every character wears exactly their blueprint outfit in every clip, whatever the setting or weather. Never plan a costume change, weather gear (coats, gloves, hats, boots), or body-worn props (backpacks, harnesses, clip-on mics, helmets) — in scenes or in `visualWorld`. Hand-held props are fine. Pick settings that work in that outfit.

## Composition by aspect ratio

- `16:9`: asker left third, answerer right third, aid in the centre.
- `9:16`: answerer upper half, asker lower half (or both mid-frame facing each other), aid between them.
- `1:1`: both in the lower two thirds facing each other, aid above.

## Palette and text

- Colours in ordinary words only; one accent colour for the visual aid.
- No captions, subtitles, or speech bubbles containing the dialogue. Aid labels only (one to three words), spelled exactly.

## Confirmation ending

Ask the user to approve, swap a question, change a role assignment, or change a global setting.

## Phase A checks

- Roles and fixed sides stated; two-character lock present; no restyling of attached blueprints.
- No narrator: every spoken line is `NAME: "line"` from the asker or the answerer, in the dialogue language.
- Every answer traces to the source; no invented facts.
- Hook is a question mid-gesture, not a greeting.
- "Aha" lands in the last third; the button rests both characters.
- Every clip 3–8s; same-shot start/end; next row inherits the previous end.
- The last row does not loop to the first question.
- No technical colour notation.
