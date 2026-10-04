# Director's Proposal Contract

Use this contract for Phase A. Present a readable production proposal and stop for confirmation before writing model prompts.

## Rewrite the source

Create one natural English narration scaled to the chosen duration and pacing:
- **15–20s Short / Listicle**: ~35–50 English words (~2–4 clips).
- **30–45s Punchy Breakdown**: ~70–110 English words (~4–6 clips).
- **50–60s Full Explainer**: ~120–150 English words (~7–10 clips).
- **4–8s Micro short**: ~10–20 English words (1–2 clips). End on a clean resting payoff — never a seamless loop.

Target pacing is ~2.2–2.5 words per second.

- Preserve the source's core claim, names, numbers, and factual meaning.
- **Hook Stacking**: Combine at least 2 hook types simultaneously in second 0–2 (spoken hook + visual opener + SFX).
- **Delay the Payoff**: Build progressive curiosity; withhold the ultimate answer/payoff until the late clips or final call to action.
- Remove repetition, filler words, breath gaps, and secondary branches to eliminate drop-off points.
- Prefer clear spoken English to literal translation.
- Simplify wording before increasing speaking speed.
- Do not invent research, statistics, quotations, product claims, or factual details.

Write planning explanations, including every scene description (`explainerScene`, `startScene`, `endScene`, `motionCamera`), in the language setting supplied with the request. Write the voiceover in that same spoken language. Leave the reference translation empty.

## Header contract

Present these items in order:

1. English title and reference-language title
2. Target total duration, clip count $N$ (each clip 3–8s, max 8s), and loop mode (always Linear — endings always end)
3. Core message, Opening Hook Stacking strategy (Spoken Hook + Visual Hook Opener from `references/traffic-and-hooks.md`)
4. Chosen aspect ratio and locked whiteboard-doodle visual world
5. Narrator identity, speaking pace, English word count, and estimated duration
6. Locked character specifications (extracted from provided reference image guideline, or default everyman) and semantic palette, named in ordinary language
7. BGM direction, emotional turn, tone, and narrative arc

The narrator is always an unseen off-screen voice speaking in the third person. Never write the voiceover as the on-screen character talking ("Hi, I'm Scro", "I am…"); the character is a silent demonstrator who reacts to a diagram or props. The narrator may name the character or product ("Meet Scro. Scro turns…").

Lock the narrator voice: always use a warm, engaging adult male voice speaking natural American English. Infer tone from the source when the user did not specify it. Never use a female narrator. Do not invent a new hero, skin tone, wardrobe, or chalkboard inversion.

## Narrative patterns & archetypes

Choose the pattern or viral archetype that fits the source (see `references/traffic-and-hooks.md`):

- Motivational: strong hook → recognition → escalation → reframe → action → payoff and CTA
- Educational: surprising hook → setup → mechanism → consequence → practical meaning → takeaway
- Commercial: pain point → consequence → product reveal → mechanism → proof or use case → benefit and CTA
- Rapid Contrarian Tool Stack: "Stop Doing X, Do Y" → rapid punchy cuts dismantling old habits
- Data / Workflow Unmasking: secret mechanism → reveal public access → instant leverage
- High-Velocity Listicle: rapid 3-second beats ("Want A? Use 1. Want B? Use 2.")
- Frictionless Replacement: challenge complexity → introduce simple automation → proof

## Storyboard contract

Produce $N$ approximately 3–8 second rows (maximum 8 seconds per row):

| Clip # & Time (3–8s) | Narrative & retention job | Explainer scene | Motion, camera (2s visual rule), & transition | English VO | Reference translation | BGM / SFX |
|---|---|---|---|---|---|---|

Give each row a different narrative job. Allocate approximately 7–20 English words per row at medium speaking pace depending on clip length (3–8s). Slow ≈ 0.8×; fast ≈ 1.2×. Keep sentence boundaries tight and natural.

## Visual-density recipe

Build every row with timed beats scaled to its 3–8 second duration:
- For 6–8s clips: use 3 beats (e.g., `0–3s` premise, `3–6s` transformation/escalation, `6–8s` climax & transition).
- For 3–5s clips: use 2 beats (e.g., `0–2s` entry/motion hook, `2–4s` punch & handoff).

Enforce **The 2-Second Visual Rule**: guarantee a perceptible visual change (micro punch-in, camera shift, doodle morph, icon pop, tag snap, or gesture change) every 1.5–2.5 seconds.

Use at least 3–4 relevant devices per row:

- expressive doodle performance with face, floating `!?` / `?`, and simple body language
- an explanation graph as the primary graphic for every topic (comparison, before/after, cause→effect, numbered steps, labeled parts, flow, chart)
- environmental transformation on the white canvas (boxes, bins, arrows, floating props)
- concrete visual metaphor such as yellow tags, handwritten labels, cardboard boxes, or morphing objects
- diagram labels, node names, arrows, sparkle, or price-style tag
- particles, glow, scribble burst, or light
- camera push, pull, pan, orbit, shake, or tracking move
- foreground wipe or object crossing the lens
- match cut, shape morph, or motion-matched transition
- interaction with another matching-style figure or oversized object

Make every effect clarify or intensify the spoken idea; omit unrelated spectacle.

**Diagram-first explanation**: for every topic, the canvas includes an explanation graph. With no character, the graph is the main subject and metaphor props are only a fallback. When a character is attached, also add extra drawn objects, icons, arrows, and doodles that explain the idea. Write a fresh performance for each clip and do not repeat the previous clip: sometimes the character stands on the left, sometimes on the right; they may run, jump, point, pull, or push a drawn element; the head may turn left or right. Start and end stills are the two resting poses (different body, face, head direction, side, and shot size). The run, jump, point, pull, push, head turn, zoom, and drawings appearing belong in motion. Never a near-empty canvas with one floating label.

## Palette and text

Keep the character strictly locked across all rows: if a character reference image was provided, follow its exact visual guidelines (hair style, face shape, features, body shape, clothing, colors, line weight); if not provided, keep the locked default male everyman (bald round head with three vertical twig-like hair tufts ordered from left to right as highest, shortest, and second highest; dot eyes, no nose, casual light blue square-pattern pyjamas, black shoes), and white-canvas doodle world consistent. Use warm yellow for tags, highlights, and strange/value reveals; light blue for pyjamas (or character clothing color); green for arrows and positive tags; brown for cardboard boxes; gray for metal bins, discs, and neutral props; black for outlines and handwritten labels. Do not introduce a teal sunburst world, glasses-wearing geometric hero, chalkboard inversion, or drift character appearance across scenes.

Name colors only with ordinary descriptive language. Do not use hexadecimal, RGB, HSL, Pantone, or other technical color notation anywhere in the proposal or production prompts.

Allow on-canvas beat text: one short beat title that names this clip's idea, plus diagram labels, node names, and arrow names, each spelled inside 「」 in startScene and endScene. Do not dump the full voiceover into those fields — the still prompt adds startVo / endVo lettering separately. After the storyboard, optionally list longer two-to-five-word English overlays for post-production, including their target clips and safe placement; never carry those longer overlays into the video-generation prompts.

## Scene detail

Write every scene field (`startScene`, `endScene`, `explainerScene`) as four concrete parts, in order:

1. Character: expression, pose, action, and eyeline of each on-screen character. Never describe appearance, hair, or outfit — that follows the character reference.
2. Set: location, the explanation graph as the main subject (nodes, arrows, labels, numbers), plus any props, foreground / midground / background.
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
- The start and end still of one clip share the same light. With no character they also share the same camera. When a character is on screen, shot size may change because the camera zooms, and they may finish on the other side because they ran or jumped. The head may face the other way. Do not reuse the previous clip's side or action.
- When on-canvas voiceover lettering is on, add a midpoint beat where the start line wipes off and the end line writes on in the same spot. Keep that lettering out of the start and end still text; the still prompt adds it from the VO beats.

Before returning, compare each clip's start and end still item by item: every difference appears in `motionCamera`, and every object `motionCamera` touches already exists in the start still or enters in a beat.

Wardrobe lock: every character wears exactly their blueprint outfit in every clip, whatever the setting or weather. Never plan a costume change, weather gear (coats, gloves, hats, boots), or body-worn props (backpacks, harnesses, clip-on mics, helmets) — in scenes or in `visualWorld`. Hand-held props are fine. Pick settings that work in that outfit.

## Composition by aspect ratio

- `16:9`: use left-center-right staging, lateral tracking, horizontal match cuts, and deliberate negative space. Reserve clean space for optional post-production overlays when useful.
- `9:16`: use foreground/background depth, vertical reveals, stacked motion, foreground passes, and interface-safe overlay space.
- `1:1`: keep action compact and center-weighted. Use short travel paths and avoid crucial events at extreme edges.

Changing ratio requires new staging, camera paths, transition geometry, and overlay-safe negative space. Do not invert to a chalkboard or redesign the locked character when only the ratio changes.

## Continuity

End each row with a visible interface that the next row inherits: a pose, moving object, filled frame, travel direction, shape, or camera motion. The final row must end on a clean resting payoff — never match seamlessly back into Clip 1. Name both sides of every adjacent connection in the proposal.

## Confirmation ending

End Phase A by asking the user to:

- approve the current proposal and generate the $N$ Omni Flash prompts;
- revise a named scene or narration passage; or
- change a global setting such as aspect ratio, voice, or pacing.

Do not include final model prompts. A global change invalidates approval and requires a revised Phase A. Do not offer chalkboard inversion or a different hero as a standard option.

## Phase A checks

- Source and aspect ratio are known; chalkboard inversion is not requested.
- Every clip is 3–8 seconds (no clip exceeds 8 seconds).
- Clip 1 stacks at least two hooks (spoken + visual/motion/SFX).
- Payoff is delayed to sustain viewer retention across clips.
- Storyboard rows have distinct narrative purposes.
- Every row contains timed beats, at least 3–4 visual devices, audio, and a transition.
- The voiceover is a third-person off-screen narrator; no line is the on-screen character speaking or introducing themself.
- When a character is on screen, clips do not repeat the same performance: left and right staging alternate, actions vary (run, jump, point, pull, push), the head turns left or right, and each clip adds a fresh visual idea.
- Every start and end still has at least 3 explanatory props that the character actively uses.
- Visual change occurs approximately every 1.5–2.5 seconds (2-Second Rule).
- Every difference between each clip's start and end still has a timed beat in `motionCamera` showing its on-camera cause.
- The locked everyman, white-canvas doodle world, and yellow tag accents remain consistent.
- No technical color notation is present.
- Any proposed text is clearly separated as a post-production overlay and absent from generated scenes.
- Every adjacent pair has a named continuity connection.
- The ending returns to the central message on a clean resting payoff — never a loop bridge back to Clip 1.
- No unsupported factual detail was added.
