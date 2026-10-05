# Omni Flash Production Prompt Contract

Use this contract only after explicit approval of the current Phase A.

## Production package order

Deliver these sections in order:

1. Global continuity block
2. $N$ standalone English prompts (each 3–8 seconds, max 8s)
3. Stitching guide (linear assembly only — no loop bridge)
4. Voice continuity note (no BGM)

## Global continuity block

State the current aspect ratio, locked whiteboard-doodle character design, white / black / light blue / yellow / brown / green / gray palette in ordinary descriptive language, narrator identity, audio arc, and continuity strategy. Treat this block as a review summary; each prompt still repeats all critical locks.

## Standalone prompt order

Write every prompt in this order:

1. Output specification: approximately 3–8 seconds (maximum 8 seconds), chosen aspect ratio, 720p target, 24 FPS, synchronized audio
2. Background lock: clean solid white whiteboard canvas in 2D hand-drawn doodle style; no chalkboard or dark inversion
3. Character lock: If a character reference image (visual guideline) was provided, repeat the comprehensive extracted character description from that image (hair style, head shape and proportions, facial features, body build, wardrobe, colors, line weight) so the character remains 100% visually consistent across different actions, poses, and scenes. If no reference image was provided, use the default locked 2D hand-drawn male everyman with pale peach skin, oversized circular round head (chibi / bobblehead proportions), bald head with exactly three small vertical sprouting twig-like hair tufts on the crown (strictly ordered in height from left to right: highest/tallest on the left, shortest in the middle, and second highest on the right; each tuft branching into 3–4 tiny spiky prongs at the tip), two simple solid black dot eyes, thin curved expressive black eyebrows, completely nose-less design (no nose), small expressive black line mouth, simple C-shaped ear, casual pyjamas for men in light blue with a clean square grid pattern (matching light blue square-pattern pyjama shirt and pyjama pants), solid black rounded shoes, slender tubular filled limbs, bold black irregular outlines, flat solid fills with no shading, and stable cartoon proportions
4. Palette and semantic roles expressed only with ordinary color names such as white, black, light blue, warm yellow, brown, green, and gray
5. Composition strategy for the chosen ratio
6. First-frame state inherited from the previous clip (or opening hook entrance for Clip 1)
7. Timed visual beats scaled to clip duration (e.g., `[0–3s]`, `[3–6s]`, `[6–8s]` or `[0–2s]`, `[2–4s]`), enforcing a visual change every 1.5–2.5 seconds (micro punch-in, camera push, doodle morph, icon pop, tag snap)
8. Exact audio-only English dialogue in quotation marks
9. Identical narrator description, emotion, and delivery (strictly locked as the user-selected adult male or female voice speaking the chosen voiceover language)
10. No background music / BGM / score. Short synchronized SFX only (whoosh, pop, ding). Voice-only mix.
11. Final-frame transition state inherited by the next clip (or a clean resting payoff on the last clip — never a loop seam back to Clip 1)
12. Negative constraints, including no voiceover captions, no teal sunburst world, no glasses hero, and no technical color notation

Make each prompt understandable without the global block or any other prompt.

## Style language

Use this wording to request density without character drift:

> rapid scene changes, kinetic doodle transformations, and frequent visual events, while preserving an identical character locked to the visual guideline reference image (or default whiteboard everyman), the same facial features, clothing, black hand-drawn outlines, filled body proportions, and strict temporal consistency

Avoid `rapid style changes`, which can invite model changes to drawing style, facial features, or character design.

## Dual-keyframe interpolation (Wan 3.0)

Start and end storyboard images are one continuous shot. The video prompt must interpolate smoothly across the FULL duration: first half stays with the start state; second half slides and morphs element-by-element into the end state. Do not hold the start pose then snap or hard-cut to the end image in the last frames. With no character, keep them at roughly the same screen position and scale. When a character is in the frames, animate the one action already drawn between the two stills: a push that moves a drawn element away, a pull that brings a drawn element closer, a jump with feet leaving the ground, or a point aimed at the camera. Do not turn it into a walk between two standing poses. Most clips stay on the same side. Cross the frame left-to-right or right-to-left only when the stills already show that rare lateral move. Match the camera angle in the stills (side, above, front, behind with a turn, toward, or away). Let the pushed or pulled element move. Do not repeat the previous clip's action or slide the body upward.

## Timed visual sequence

Translate the approved storyboard row into connected events matching its 3–8 second duration. State where the character begins, what the explanation graph shows, which nodes / arrows / labels change, how the camera moves, and what fills or exits the final frame. Slide or light the graph's parts element-by-element rather than only moving handheld props.

Enforce **The 2-Second Visual Rule**: ensure a visible transformation, camera punch, or graphic event occurs roughly every 2 seconds. Use at least 3–4 content-relevant visual devices per prompt. In Clip 1, explicitly choreograph the stacked hook opener (e.g. walk-up reveal, off-camera slide, or sudden prop reveal). Do not introduce new narrative claims during prompt expansion.

## Dialogue and visual text

The VO is spoken by an unseen off-screen narrator. The on-screen character never speaks or lip-syncs. With a character in frame, the mouth shows a facial expression while the body does this clip's one action: push, pull, jump, or point toward the camera. That action differs from the previous clip. A full left-to-right or right-to-left cross happens only when the stills already show it. The camera follows the stills' angle. The drawn element moves with a push or pull. Do not repeat the previous clip's action and do not replace the action with a walk between two standing poses. Quote the approved English VO exactly once as audio-only dialogue. Instruct the model not to add, omit, paraphrase, repeat, or reorder the spoken line. Beat lettering is added by the still prompt — do not dump a second full transcript into the video prompt.

Allow on-canvas beat titles, diagram labels, node names, and arrow names already named in the storyboard. Forbid photoreal UI type, logos, watermarks, palette labels, and production annotations. Put longer optional phrases in a separate post-production overlay list outside the prompts.

## Palette notation

Use ordinary descriptive color names such as white, black, medium blue, warm yellow, brown, green, or gray. Never put hexadecimal, RGB, HSL, Pantone, or other technical color notation in a generation prompt. Models may reproduce prominent notation literally as unwanted interface text.

Describe backgrounds as a clean solid white whiteboard canvas with hand-drawn black outlines and flat marker fills. Explicitly forbid teal sunburst worlds, chalkboard inversion, photoreal lighting, heavy gradients, vignette, bloom fog, color grading into unrelated palettes, and three-dimensional background depth. Do not use a color code for any palette color.

## Audio contract

Repeat the same narrator specification in all prompts: lock the narrator as a warm, engaging adult voice of the gender the user selected (male or female), speaking the chosen voiceover language. Never switch gender. State delivery changes without changing voice identity. No background music, BGM, score, or underscore — spoken line plus short synced SFX only.

Synchronize effects to visible events such as impacts, transformations, energy releases, steps, wipes, or object movement.

## Negative contract

Forbid:

- photorealism and unwanted 3D rendering
- teal sunburst worlds, glasses-wearing geometric heroes, or chalkboard inversion
- hollow stick figures, faceless characters, or line-only limbs without clothing
- noses of any kind when using default everyman (character must strictly remain nose-less)
- full head of hair, realistic hair, or changing the three twig-like hair tufts when using default everyman (must stay highest, shortest, second highest from left to right)
- changing clothing, colors, or character appearance from the locked visual guidelines or reference image
- the opposite narrator gender, voice drift, or changing narrator identity (must remain the user-selected adult voice)
- missing facial features or missing clothing when the locked everyman is visible
- extra limbs, malformed anatomy, disconnected body parts, or changed proportions
- broken or drifting art style across clips
- unexplained colors outside the white / black / light blue / yellow / brown / green / gray doodle world
- unintended characters or irrelevant spectacle
- extra subtitle bands, photoreal UI type, technical color notation, palette labels, logos, or watermarks
- altered, omitted, repeated, reordered, or added dialogue

## Stitching guide

List all clips in order. For every cut, repeat the exact ending state and matching opening state. Include any trim, short audio crossfade, or match-cut note needed for assembly. The final clip must end on a clean resting payoff — never detail a loop seam back to Clip 1.

## Audio continuity note

Independent text-only generations may vary in voice. Recommend, in order:

1. Reuse the same voice or audio reference when the interface supports it.
2. Repeat the identical narrator gender and language description in every prompt.
3. For maximum consistency, generate synchronized SFX only — never add a BGM track during assembly.

## Motion detail

- The timed visual sequence names, per beat, the action, the expression change, and the camera start and end framing.
- Be exact: which hand, which direction, which prop or diagram cell, how far.
- Lighting stays constant and matches both keyframes.
- Never re-describe a character's appearance or outfit; it follows the keyframes.
- Never name clothing, layers, or gear (no "winter coat", "boots", "backpack"). Say only that each character keeps exactly the outfit in the first and last frames.

## Phase B checks

- The user approved the current Phase A.
- Exactly $N$ standalone prompts matching Phase A are present.
- Every prompt specifies 3–8 seconds duration (maximum 8 seconds).
- Each prompt repeats ratio, locked everyman, white-canvas doodle world, palette, voice, audio, transition, and negative locks.
- Each prompt has timed beats and enforces the 2-second visual change rule with at least 3–4 relevant visual devices.
- Clip 1 choreographs stacked hooks (spoken + visual/motion/SFX).
- Every ending matches the next opening. The last clip ends on a clean resting payoff (never bridges back to Clip 1).
- Dialogue exactly matches the approved narration.
- Dialogue matches the approved narration as audio. Do not add a second subtitle band; beat lettering comes from the stills. Beat titles and diagram labels named in the storyboard stay.
- Standalone prompts contain no hexadecimal, RGB, HSL, Pantone, or other technical color notation.
- In-world text may include a short beat title plus diagram labels, node names, and arrow names; longer overlay phrases are listed separately for post-production.
- No prompt requests a teal sunburst world, glasses hero, or chalkboard inversion.
