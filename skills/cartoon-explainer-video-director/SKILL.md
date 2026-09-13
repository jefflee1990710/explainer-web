---
name: directing-cartoon-explainer-videos
description: Use when turning copy, notes, articles, or topics into high-retention English whiteboard-doodle cartoon explainer videos, short-form viral animation shorts (Reels, TikToks, Shorts), or Gemini Omni Flash prompt packages.
---

# Directing Cartoon Explainer Videos

## Core contract

Turn one source into a confirmed director's proposal (Phase A) and then standalone prompts (Phase B) for Gemini Omni Flash clips. Each clip runs approximately 3–8 seconds (maximum 8 seconds per clip). Clip count is determined dynamically by the content narrative and pacing (e.g., 2–4 clips for 15s quick hacks, 4–6 clips for 30s breakdowns, 8–12 clips for 60s stories, or 1–2 clips for micro-loops). Preserve the source's meaning while engineering high retention, dual hook stacking, and a delayed payoff or seamless loop callback.

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
- Storytelling language: left-to-right narrative flow, cardboard boxes, bins, arrows, floating objects, price-style tags, sparkles, and short handwritten all-caps marker labels. A soft pale-yellow glow is allowed only for a strange or magical reveal.
- Prefer icon-based metaphors, object morphs, and handwritten labels for meaning. Do not build a teal sunburst world, do not invert into a dark chalkboard, and do not switch to polished outline-free vector art.
- Forbid photorealism, unwanted 3D, painterly shading, perfect CAD geometry, and replacement heroes.

## Workflow

1. Read `references/traffic-and-hooks.md` and `references/storyboard-template.md` and produce Phase A in the user's language, with English VO and a reference translation.
2. Stop after the director's proposal and request explicit approval.
3. If the user changes ratio, narration, scene structure, or global staging, recompose Phase A and request approval again.
4. Only after approval of the current Phase A, read `references/omni-flash-prompt-contract.md` and produce Phase B.
5. Use `references/examples.md` only when a concrete end-to-end example would resolve ambiguity.

Topic approval, schedule pressure, or approval of an older draft is not approval of the current Phase A.

## Output rules

- Each clip must target 3–8 seconds (maximum 8 seconds per clip). Allocate approximately 7–20 English VO words per clip (~2.5 words/second).
- Apply the 2-Second Visual Rule: ensure a noticeable visual change (punch-in, camera shift, doodle morph, icon pop, tag snap) every 1.5–2.5 seconds within each clip.
- Stack at least 2 hook types simultaneously in Clip 1 (first 1–2 seconds) using visual openers from `references/traffic-and-hooks.md`.
- Enforce delayed payoff: do not reveal the core punchline in the opening clip; build tension and deliver near the finale.
- Keep character design, clothing, proportions, white-canvas doodle world, and narrator consistent.
- Name palette colors only with ordinary descriptive words such as white, black, medium blue, warm yellow, brown, green, or gray. Never place hexadecimal, RGB, HSL, Pantone, or other technical color notation inside a model prompt.
- Make each model prompt self-contained, specifying 3–8 seconds duration (max 8s), and repeat all critical locks.
- Treat narration as audio-only. Quote exact dialogue and forbid alteration, repetition, captions, subtitles, or visual transcription of the spoken line.
- Allow short in-world handwritten all-caps marker labels (headlines, tags, arrows, bin names). Keep them brief and drawn in the same doodle hand. Do not generate photoreal UI type, logos, watermarks, or a full transcript of the voiceover. Put any longer optional overlay in a separate post-production note.
- Match every clip ending to the next clip opening (or bridge Clip N back to Clip 1 for infinite loops).
- Do not invent unsupported facts, statistics, quotations, or product claims.

## Revision rules

Recompose rather than rename:

- `16:9`: stage action across left, center, and right; use lateral tracking and negative space.
- `9:16`: use depth, stacked motion, vertical reveals, and interface-safe placement.
- `1:1`: use compact central composition and shorter travel paths.

A global change to ratio, narration, or scene structure invalidates prior approval. Do not offer chalkboard inversion or character redesign as a normal revision path.

## Final check

Apply the checklist in the loaded reference. Repair any failed condition before responding.
