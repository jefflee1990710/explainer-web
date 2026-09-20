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

Use the user's language for planning explanations. Keep the voiceover in English and give a reference translation in the user's language.

## Header contract

Present these items in order:

1. English title and reference-language title
2. Target total duration, clip count $N$ (each clip 3–8s, max 8s), and loop mode (always Linear — endings always end)
3. Core message, Opening Hook Stacking strategy (Spoken Hook + Visual Hook Opener from `references/traffic-and-hooks.md`)
4. Chosen aspect ratio and locked whiteboard-doodle visual world
5. Narrator identity, speaking pace, English word count, and estimated duration
6. Locked character specifications (extracted from provided reference image guideline, or default everyman) and semantic palette, named in ordinary language
7. BGM direction, emotional turn, tone, and narrative arc

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

Give each row a different narrative job. Allocate approximately 7–20 English words per row depending on clip length (3–8s) while keeping sentence boundaries tight and natural.

## Visual-density recipe

Build every row with timed beats scaled to its 3–8 second duration:
- For 6–8s clips: use 3 beats (e.g., `0–3s` premise, `3–6s` transformation/escalation, `6–8s` climax & transition).
- For 3–5s clips: use 2 beats (e.g., `0–2s` entry/motion hook, `2–4s` punch & handoff).

Enforce **The 2-Second Visual Rule**: guarantee a perceptible visual change (micro punch-in, camera shift, doodle morph, icon pop, tag snap, or gesture change) every 1.5–2.5 seconds.

Use at least 3–4 relevant devices per row:

- expressive doodle performance with face, floating `!?` / `?`, and simple body language
- environmental transformation on the white canvas (boxes, bins, arrows, floating props)
- concrete visual metaphor such as yellow tags, handwritten labels, cardboard boxes, or morphing objects
- diagram, arrow, sparkle, or price-style tag
- particles, glow, scribble burst, or light
- camera push, pull, pan, orbit, shake, or tracking move
- foreground wipe or object crossing the lens
- match cut, shape morph, or motion-matched transition
- interaction with another matching-style figure or oversized object

Make every effect clarify or intensify the spoken idea; omit unrelated spectacle.

## Palette and text

Keep the character strictly locked across all rows: if a character reference image was provided, follow its exact visual guidelines (hair style, face shape, features, body shape, clothing, colors, line weight); if not provided, keep the locked default male everyman (bald round head with three vertical twig-like hair tufts ordered from left to right as highest, shortest, and second highest; dot eyes, no nose, casual light blue square-pattern pyjamas, black shoes), and white-canvas doodle world consistent. Use warm yellow for tags, highlights, and strange/value reveals; light blue for pyjamas (or character clothing color); green for arrows and positive tags; brown for cardboard boxes; gray for metal bins, discs, and neutral props; black for outlines and handwritten labels. Do not introduce a teal sunburst world, glasses-wearing geometric hero, chalkboard inversion, or drift character appearance across scenes.

Name colors only with ordinary descriptive language. Do not use hexadecimal, RGB, HSL, Pantone, or other technical color notation anywhere in the proposal or production prompts.

Allow short in-world handwritten all-caps marker labels that belong to the scene (headlines, tags, arrows, bin names). Never transcribe the voiceover as captions or subtitles. After the storyboard, optionally list longer two-to-five-word English overlays for post-production, including their target clips and safe placement; never carry those longer overlays into the video-generation prompts.

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
- Visual change occurs approximately every 1.5–2.5 seconds (2-Second Rule).
- The locked everyman, white-canvas doodle world, and yellow tag accents remain consistent.
- No technical color notation is present.
- Any proposed text is clearly separated as a post-production overlay and absent from generated scenes.
- Every adjacent pair has a named continuity connection.
- The ending returns to the central message on a clean resting payoff — never a loop bridge back to Clip 1.
- No unsupported factual detail was added.
