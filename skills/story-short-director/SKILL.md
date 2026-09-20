---
name: directing-story-shorts
description: Use when turning a message, anecdote, brand value, or lesson into a short animated STORY (a protagonist with a goal, an obstacle, a turn, and a resolution) for Reels, TikToks, Shorts, or landing pages.
---

# Directing Story Shorts

## Core contract

Turn one source into a confirmed director's proposal (Phase A) and then standalone per-clip video prompts (Phase B). Each clip runs 3–8 seconds (maximum 8 seconds). Clip count follows the story beats and the duration preset (e.g. 2–3 clips for a 15s vignette, 4–6 clips for a 30–45s arc, 7–10 clips for a 60s story). The story carries the source's message through what happens to a character — never through a lecture.

## Setup gate

Require these before planning:

- source material (the message, lesson, or anecdote to dramatise)
- aspect ratio: `16:9`, `9:16`, or `1:1`
- optional: cast / character reference images (the protagonist and supporting cast)

If required items are missing, ask for them in one concise message and stop. Never select an aspect ratio silently. Do not re-ask choices already supplied.

## Visual world

The rendering rules (canvas, look, palette, lettering, motion) come from the **Visual style** block appended below this skill. Do not invent a different medium.

- **Cast lock**: if character references / blueprints are attached, every character MUST follow them exactly across all clips (face, hair, wardrobe, accessories, proportions). Say so in `characterLock`; never re-describe or restyle them. If no reference is given, define ONE simple protagonist in `characterLock` (silhouette, two wardrobe colours, one signature prop) and keep it identical in every clip.
- Emotion is carried by pose, gesture, eyes, and staging — not by on-screen text.
- Keep environments minimal and reusable: one or two locations, each described with the same three anchor props whenever it returns.

## Story architecture

Every proposal follows a three-act spine, compressed to the duration:

1. **Hook (Clip 1, first 2s)**: open in the middle of the action or on a striking image of the want/problem — never on an establishing shot or a greeting.
2. **Want & obstacle**: make the protagonist's goal visible as an object or destination; put a concrete obstacle between them.
3. **Escalation**: at least one attempt that fails or backfires; stakes rise.
4. **Turn**: the insight that maps to the source's message — the protagonist changes approach.
5. **Resolution**: the goal reached (or reframed) in a single clear image.
6. **Button**: a final beat that lands the message emotionally — a look, a gesture, a small callback prop. It rests; it never loops back to the opening.

The message is shown, then optionally spoken once in the last clip. Do not speak the moral before the turn.

## Narration and dialogue

- Default voice: a warm adult narrator in the requested voiceover language, third person, past or present tense — choose one and keep it.
- Short character lines are allowed as audio-only dialogue (one or two per clip at most), written as `NAME: "line"`. Never mix narrator and dialogue in the same sentence.
- Allocate ~7–20 spoken words per clip. Silence is allowed for one beat (the turn or the button) — say `(no VO — music only)` in the VO field when used.
- Narration is audio-only. Never caption, subtitle, or transcribe it on screen. In-world text is limited to short props that belong to the scene (a sign, a letter, a screen), spelled exactly as written.

## Phase A field mapping

The structured output has fixed fields; fill them as follows:

- `hookStrategy`: the in-medias-res or striking-image opener plus the audio/motion device used in second 0–2.
- `coreMessage`: the one-sentence lesson the story dramatises.
- `narrativeArc`: the six beats above mapped to clip numbers.
- `narrator`: voice identity, tense, tone.
- `visualWorld`: the one or two locations with their anchor props.
- `characterLock`: cast lock statement (see Visual world).
- `palette`: ordinary colour words only; one accent colour tied to the want/goal object.
- `bgmDirection`: the emotional curve (e.g. curious → tense → release → warm).
- Each clip row: `narrativeJob` = which beat; `explainerScene` = what we SEE at the start of the clip (character, pose, props, location); `motionCamera` = the modest continuation within the same shot and the camera; `englishVo` = narration / dialogue in the chosen language; `bgmSfx` = music state + 1–2 synced SFX.

## Clip continuity

- Each clip's start and end are the SAME SHOT: the end is a modest continuation (pose, prop, expression, small camera move). New locations begin at a clip boundary, not inside a clip.
- The next clip's opening inherits the previous clip's end state and environment.
- Every visual beat must change something meaningful every 1.5–2.5 seconds (gesture, prop, camera push) — but in service of the emotion, not spectacle.
- The final clip ends on the button and rests. Never bridge back to Clip 1; never plan a loop.

## Workflow

1. Read `references/story-proposal-contract.md` and produce Phase A in the user's language, with the VO in the chosen voiceover language.
2. Stop after the director's proposal and request explicit approval.
3. On a change of ratio, cast, story spine, or narration, recompose Phase A and request approval again.
4. Only after approval, read `references/story-prompt-contract.md` and produce Phase B per clip.

## Output rules

- 3–8 seconds per clip; every prompt states its duration.
- Name colours only with ordinary words; never hexadecimal, RGB, HSL, or Pantone.
- Do not invent facts, quotes, statistics, or product claims that are not in the source.
- Do not add on-screen captions, subtitles, logos, watermarks, or UI text.
- Never end on a loop; the final clip resolves and rests.
