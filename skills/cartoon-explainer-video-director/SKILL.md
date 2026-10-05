---
name: directing-cartoon-explainer-videos
description: Use when turning copy, notes, articles, or topics into high-retention English whiteboard-doodle cartoon explainer videos, short-form viral animation shorts (Reels, TikToks, Shorts), or Gemini Omni Flash prompt packages.
---

# Directing Cartoon Explainer Videos

## Core contract

Turn one source into a confirmed director's proposal (Phase A) and then standalone prompts (Phase B) for Gemini Omni Flash clips. Each clip runs approximately 3–8 seconds (maximum 8 seconds per clip). Clip count is determined dynamically by the content narrative and pacing (e.g., 2–4 clips for 15s quick hacks, 4–6 clips for 30s breakdowns, 8–12 clips for 60s stories, or 1–2 clips for micro shorts). Preserve the source's meaning while engineering high retention, dual hook stacking, and a delayed clean payoff — never a seamless loop callback.

## Setup gate

Require these before planning:

- source material
- aspect ratio: `16:9`, `9:16`, or `1:1`
- optional: character reference image (visual guideline)

If required items are missing, ask for them in one concise message and stop. Never select an aspect ratio silently. Do not re-ask choices already supplied. Do not ask for light/dark theme or chalkboard inversion—the visual world is locked.

Urgency, generation cost, client pressure, and requests to "pick normal settings" do not waive this gate.

## Locked visual world

Every Phase A proposal and Phase B prompt must preserve this identical whiteboard-doodle design. Match the locked style frames in `references/style-frames/`.

- **Character Visual Guideline Lock**: If a character reference image is provided by the user, the video character MUST strictly follow that image as the visual guideline. Extract the complete visual description from the image (hair style, face size, face shape, facial features, body shape/proportions, wardrobe, and line style) and lock it across all scenes and clips, ensuring the exact same character is maintained across different actions and settings. If no image is provided, fall back to the default locked everyman below.
- Whiteboard explainer animation: 2D hand-drawn cartoon on a clean solid white canvas, as if sketched with a digital marker.
- Bold black outlines with slightly irregular, organic stroke weight. Lines are not perfectly straight. Flat marker-style color fills sit slightly inside the outlines and may look a little scribbled. Almost no shading.
- Default locked male everyman (used when no reference image is provided): pale peach skin, oversized circular round head (chibi / bobblehead proportions), bald head with exactly three small vertical sprouting twig-like hair tufts on the crown (strictly ordered in height from left to right: highest/tallest on the left, shortest in the middle, and second highest on the right; each tuft branching into 3–4 tiny spiky prongs at the tip), two simple solid black dot eyes, thin curved expressive black eyebrows, completely nose-less design (no nose), small expressive black line mouth, simple C-shaped ear, casual pyjamas for men in light blue with a square grid pattern (matching light blue square-pattern pyjama shirt and pyjama pants), solid black rounded shoes, and thin tubular filled limbs with bold black outlines and flat solid fills with no shading. Never glasses. Never a nose. Never a full head of hair. Never a polo shirt or formal clothes. Never a teal geometric hero. Never hollow stick-figure limbs.
- When a full body is needed, keep the same doodle proportions and clothing. Never invent a replacement hero.
- Palette: white canvas, black ink, light blue, warm yellow, brown, green, and gray. Light blue is for the character's square-pattern pyjamas (or adapted to the provided reference character's palette). Warm yellow is for tags, highlights, and strange/value reveals. Green is for arrows and positive tags. Brown is for cardboard boxes. Gray is for metal bins, discs, and neutral props.
- Storytelling language: for every topic, an explanation graph is the main subject — comparison, before/after, cause→effect, numbered steps, labeled parts, flow or cycle, or a simple chart. Metaphor props (cardboard boxes, bins, arrows, floating objects, price-style tags) are a fallback, plus short handwritten all-caps marker labels. A soft pale-yellow glow is allowed only for a strange or magical reveal.
- Prefer drawing the idea as a labeled graph on the canvas. Icon-based metaphors and object morphs are the fallback when a graph would hide the idea. Do not build a teal sunburst world, do not invert into a dark chalkboard, and do not switch to polished outline-free vector art.
- Forbid photorealism, unwanted 3D, painterly shading, perfect CAD geometry, and replacement heroes.

## Workflow

1. Read `references/traffic-and-hooks.md` and `references/storyboard-template.md` and produce Phase A in the language setting: scene descriptions and the voiceover both use that language.
2. Stop after the director's proposal and request explicit approval.
3. If the user changes ratio, narration, scene structure, or global staging, recompose Phase A and request approval again.
4. Only after approval of the current Phase A, read `references/omni-flash-prompt-contract.md` and produce Phase B.
5. Use `references/examples.md` only when a concrete end-to-end example would resolve ambiguity.

Topic approval, schedule pressure, or approval of an older draft is not approval of the current Phase A.

## Output rules

- Each clip must target 3–8 seconds (maximum 8 seconds per clip). Allocate approximately 7–20 English VO words per clip (~2.5 words/second) at medium speaking pace. Slow ≈ 0.8× those words with pauses; fast ≈ 1.2× with fewer pauses. Clip duration stays the same.
- Apply the 2-Second Visual Rule: ensure a noticeable visual change (punch-in, camera shift, doodle morph, icon pop, tag snap) every 1.5–2.5 seconds within each clip.
- Stack at least 2 hook types simultaneously in Clip 1 (first 1–2 seconds) using visual openers from `references/traffic-and-hooks.md`.
- Enforce delayed payoff: do not reveal the core punchline in the opening clip; build tension and deliver near the finale.
- Keep character design, clothing, proportions, white-canvas doodle world, and narrator consistent.
- Name palette colors only with ordinary descriptive words such as white, black, medium blue, warm yellow, brown, green, or gray. Never place hexadecimal, RGB, HSL, Pantone, or other technical color notation inside a model prompt.
- Make each model prompt self-contained, specifying 3–8 seconds duration (max 8s), and repeat all critical locks.
- Quote exact dialogue. Do not alter, repeat, or dump a second transcript of the spoken line into the scene fields — the still prompt adds the beat lettering. Beat titles and diagram labels belong on the canvas.
- Always narrated: an unseen off-screen narrator speaks every line in the third person. The on-screen character never speaks, never introduces themself, and is never the narrator — no first-person lines in the character's voice ("Hi, I'm Scro", "I am…"). The narrator may name the character or product ("Meet Scro. Scro turns…").
- The character never speaks. With no character, they may point, stand aside, or handle a prop.
- When a character is attached, every clip is a fresh performance and must not repeat the previous clip's move or camera. Each clip has exactly one primary body action, picked by what that clip's line means, and not one used in either of the previous two clips. The actions: push (send out — the element moves away from the body to its destination), pull (bring in — it moves toward the body), stack (add — a block goes on top), lift (increase — raised overhead), place (put in the right spot — lowered into its slot), toss (remove — thrown toward a bin), plug (connect — seated in its socket), sketch an arrow (cause and effect — drawn from node A to node B), flip a card (compare — side A to side B), turn the dial (adjust — pointer low to high), stretch (break down — a small chart pulled wide), squeeze (simplify — a messy pile pressed into one block), magnify (look closer — a node enlarged in the lens), jump (breakthrough — both feet leave the ground, never slide upward), and point toward the camera (call to action — fingertip aimed at the viewer, not at a side graphic). Use jump and point toward the camera at most once each per video. A different standing position, a few steps, or a walk is not a new action. Alternate the starting side: if one clip starts on the viewer's left, the next starts on the viewer's right (the first clip's side is free, not always left). About 80% of clips keep the character on that same side for the whole clip. Only about 20% of clips cross the frame, either left to right or right to left, and those rare crosses do not all go the same direction. Camera angle changes every clip: from the character's left side, from above, from the front, or from behind as they turn around, plus depth (toward or away). Start and end are the before and after of that one action, not two standing poses; the travel lives in the motion field, and the first beat names the action word. When the action moves an element, both stills name the same element, where it sits against the hands, and its destination (a slot, bin, stack, socket, or graph node). The end still keeps that element visible at its new place; never write that it vanished or sank entirely inside something. The motion plays in three beats: a short anticipation, the action, then a brief follow-through where the element settles and the graph responds. Clip 1 opens already moving, from the wound-up pose of its action.
- Visual density is an explanation graph plus, when a character is on screen, extra drawn objects, icons, arrows, and doodles that appear to explain the idea. The character interacts with those drawings. Never a near-empty canvas with one floating label.
- On-canvas beat text is allowed: one short beat title that names this clip's idea, plus diagram labels, node names, and arrow names, drawn in the same doodle hand. Do not generate photoreal UI type, logos, watermarks, or a second full transcript of the voiceover in the scene fields (the still prompt adds the beat lettering). Put any longer optional overlay in a separate post-production note.
- Match every clip ending to the next clip opening. The final clip must end on a clean resting payoff — never bridge Clip N back to Clip 1 or plan an infinite / seamless loop.
- Do not invent unsupported facts, statistics, quotations, or product claims.

## Revision rules

Recompose rather than rename:

- `16:9`: stage action across left, center, and right; use lateral tracking and negative space.
- `9:16`: use depth, stacked motion, vertical reveals, and interface-safe placement.
- `1:1`: use compact central composition and shorter travel paths.

A global change to ratio, narration, or scene structure invalidates prior approval. Do not offer chalkboard inversion or character redesign as a normal revision path.

## Final check

Apply the checklist in the loaded reference. Repair any failed condition before responding.
