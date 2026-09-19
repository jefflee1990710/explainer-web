# Omni Flash Production Prompt Contract

Use this contract only after explicit approval of the current Phase A.

## Production package order

Deliver these sections in order:

1. Global continuity block
2. $N$ standalone English prompts (each 3–8 seconds, max 8s)
3. Stitching guide (including loop bridge if infinite loop)
4. Voice and music continuity note

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
9. Identical narrator description, emotion, and delivery (strictly locked as a warm, engaging adult male voice speaking natural American English)
10. BGM, synchronized SFX (accent noises like whoosh, pop, ding), and voice-first mixing
11. Final-frame transition state inherited by the next clip (or loop seam connecting back to Clip 1)
12. Negative constraints, including no voiceover captions, no teal sunburst world, no glasses hero, and no technical color notation

Make each prompt understandable without the global block or any other prompt.

## Style language

Use this wording to request density without character drift:

> rapid scene changes, kinetic doodle transformations, and frequent visual events, while preserving an identical character locked to the visual guideline reference image (or default whiteboard everyman), the same facial features, clothing, black hand-drawn outlines, filled body proportions, and strict temporal consistency

Avoid `rapid style changes`, which can invite model changes to drawing style, facial features, or character design.

## Dual-keyframe interpolation (Wan 3.0)

Start and end storyboard images are the SAME SHOT. The video prompt must interpolate smoothly across the FULL duration: first half stays with the start state; second half slides and morphs element-by-element into the end state. Do not hold the start pose then snap or hard-cut to the end image in the last frames. Keep the character at roughly the same screen position and scale.

## Timed visual sequence

Translate the approved storyboard row into connected events matching its 3–8 second duration. State where the character begins, what changes, how the camera moves, which yellow tag, handwritten label, box, or arrow carries meaning, and what fills or exits the final frame.

Enforce **The 2-Second Visual Rule**: ensure a visible transformation, camera punch, or graphic event occurs roughly every 2 seconds. Use at least 3–4 content-relevant visual devices per prompt. In Clip 1, explicitly choreograph the stacked hook opener (e.g. walk-up reveal, off-camera slide, or sudden prop reveal). Do not introduce new narrative claims during prompt expansion.

## Dialogue and visual text

Quote the approved English VO exactly once as audio-only dialogue. Instruct the model not to add, omit, paraphrase, repeat, reorder, caption, subtitle, or visually transcribe the spoken line.

Allow short in-world handwritten all-caps marker labels that belong to the scene (headlines, tags, arrows, bin names). Forbid photoreal UI type, logos, watermarks, palette labels, production annotations, and any on-screen transcript of the voiceover. Put longer optional phrases in a separate post-production overlay list outside the prompts.

## Palette notation

Use ordinary descriptive color names such as white, black, medium blue, warm yellow, brown, green, or gray. Never put hexadecimal, RGB, HSL, Pantone, or other technical color notation in a generation prompt. Models may reproduce prominent notation literally as unwanted interface text.

Describe backgrounds as a clean solid white whiteboard canvas with hand-drawn black outlines and flat marker fills. Explicitly forbid teal sunburst worlds, chalkboard inversion, photoreal lighting, heavy gradients, vignette, bloom fog, color grading into unrelated palettes, and three-dimensional background depth. Do not use a color code for any palette color.

## Audio contract

Repeat the same narrator specification in all prompts: strictly lock the narrator as a warm, engaging adult male voice speaking natural American English. Never switch to a female voice. State delivery changes without changing voice identity. Keep narration dominant over BGM and effects.

Synchronize effects to visible events such as impacts, transformations, energy releases, steps, wipes, or object movement.

## Negative contract

Forbid:

- photorealism and unwanted 3D rendering
- teal sunburst worlds, glasses-wearing geometric heroes, or chalkboard inversion
- hollow stick figures, faceless characters, or line-only limbs without clothing
- noses of any kind when using default everyman (character must strictly remain nose-less)
- full head of hair, realistic hair, or changing the three twig-like hair tufts when using default everyman (must stay highest, shortest, second highest from left to right)
- changing clothing, colors, or character appearance from the locked visual guidelines or reference image
- female narrator voice, voice drift, or changing narrator identity (must strictly remain the locked adult male voice)
- missing facial features or missing clothing when the locked everyman is visible
- extra limbs, malformed anatomy, disconnected body parts, or changed proportions
- broken or drifting art style across clips
- unexplained colors outside the white / black / light blue / yellow / brown / green / gray doodle world
- unintended characters or irrelevant spectacle
- voiceover captions, subtitles, photoreal UI type, technical color notation, palette labels, logos, or watermarks
- altered, omitted, repeated, reordered, or added dialogue

## Stitching guide

List all clips in order. For every cut, repeat the exact ending state and matching opening state. Include any trim, short audio crossfade, or match-cut note needed for assembly. For infinite loop mode, detail how the final frame of the last clip aligns with the opening frame of Clip 1.

## Audio continuity note

Independent text-only generations may vary in voice and music. Recommend, in order:

1. Reuse the same voice or audio reference when the interface supports it.
2. Repeat the identical narrator description in every prompt.
3. For maximum consistency, generate synchronized SFX and add one continuous external English voiceover and BGM track during assembly.

## Phase B checks

- The user approved the current Phase A.
- Exactly $N$ standalone prompts matching Phase A are present.
- Every prompt specifies 3–8 seconds duration (maximum 8 seconds).
- Each prompt repeats ratio, locked everyman, white-canvas doodle world, palette, voice, audio, transition, and negative locks.
- Each prompt has timed beats and enforces the 2-second visual change rule with at least 3–4 relevant visual devices.
- Clip 1 choreographs stacked hooks (spoken + visual/motion/SFX).
- Every ending matches the next opening (or bridges back to Clip 1 for loop mode).
- Dialogue exactly matches the approved narration.
- Dialogue is explicitly audio-only and is never displayed as captions or subtitles.
- Standalone prompts contain no hexadecimal, RGB, HSL, Pantone, or other technical color notation.
- In-world text is limited to short handwritten all-caps marker labels; longer overlay phrases are listed separately for post-production.
- No prompt requests a teal sunburst world, glasses hero, or chalkboard inversion.
