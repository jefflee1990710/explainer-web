---
name: directing-step-by-step-tutorials
description: Use when turning a how-to article, recipe, setup guide, workflow, or process into a short animated STEP-BY-STEP TUTORIAL (show the result first, then one step per clip, then the finished result) for Reels, TikToks, Shorts, onboarding, or help centres.
---

# Directing Step-by-Step Tutorials

## Core contract

Turn one source into a confirmed director's proposal (Phase A) and then standalone per-clip video prompts (Phase B). Each clip runs 3–8 seconds (maximum 8 seconds). Clip count = 1 result-first hook clip + one clip per step + 1 finished-result clip, bounded by the duration preset (e.g. 2–3 steps for 15–20s, 3–5 steps for 30–45s, 5–8 steps for 60s). Every step must be doable and visible; the viewer should be able to follow along with the sound off — though narration is still audio-only.

## Setup gate

Require these before planning:

- source material (the goal and the steps, tools, or inputs)
- aspect ratio: `16:9`, `9:16`, or `1:1`
- optional: cast / character reference images (the instructor or the learner's hands)

If required items are missing, ask for them in one concise message and stop. Never select an aspect ratio silently. Do not re-ask choices already supplied.

## Visual world

The rendering rules (canvas, look, palette, lettering, motion) come from the **Visual style** block appended below this skill. Do not invent a different medium.

- **Cast lock**: if character references / blueprints are attached, the instructor MUST follow them exactly across all clips; say so in `characterLock`, never restyle. If none, define ONE simple instructor in `characterLock` (or hands-only framing) and keep it identical.
- **Workspace lock**: define ONE workspace in `visualWorld` (surface, the tools/inputs laid out, the "result zone") and keep it identical. Objects only change state; they do not teleport.
- **Step marker**: every step clip carries a short in-world step number (`STEP 1`, `STEP 2` …) as a prop in the style, same position each time. The step's action is spoken, not written.
- **State continuity**: the object being built/made/configured carries its state from clip to clip (what was cut stays cut; what was toggled stays toggled).

## Tutorial architecture

1. **Result-first hook (Clip 1, first 2s)**: show the FINISHED result in motion or in use with the promise line ("Here's how to … in N steps"). Then the result slides aside and the empty workspace with laid-out inputs is revealed. No greetings.
2. **Steps**: one clip per step. Each step = the step marker pops → one hand action on a named object → one visible state change. If a step needs two actions, split it or choose the more important one.
3. **Common mistake (optional, one clip)**: for 4+ steps, one clip may show the wrong way briefly (a small red-orange cross prop) then the right way. Only if the source mentions it.
4. **Finished result**: the completed object in the result zone, in use if applicable; one closing line (what the viewer can now do, or a short CTA). It rests. Never loop back to Step 1 or the hook.

## Narration

- Default: a calm, clear adult instructor voice in the requested voiceover language, imperative mood ("Cut…", "Tap…", "Add…").
- Each step line: verb + object + one qualifier, ≤12 words. ~7–20 spoken words per clip.
- Narration is audio-only. Never caption or subtitle it. On-screen text is limited to the step marker and labels that exist on the objects themselves (a button label, a jar label), one to two words, spelled exactly.

## Phase A field mapping

- `hookStrategy`: result-first reveal + the promise line + the motion/SFX device in second 0–2.
- `coreMessage`: what the viewer will be able to do after the video.
- `narrativeArc`: hook → steps (list them) → (mistake) → finished result, mapped to clips.
- `narrator`: voice identity, imperative mood, tone.
- `visualWorld`: workspace lock (surface, laid-out inputs, result zone) and step marker spec.
- `characterLock`: cast lock statement (or hands-only framing).
- `palette`: ordinary colour words; one accent colour for the step marker and the current active object.
- `bgmDirection`: steady, unobtrusive; a soft hit on each step marker; warm resolve at the finished result.
- Each clip row: `narrativeJob` = hook / step k of N / mistake / result; `explainerScene` = the workspace and the object's state at t=0 plus the step marker; `motionCamera` = step marker pop → hand action → visible state change, camera; `englishVo` = the step line; `bgmSfx` = music + the action SFX.

## Clip continuity

- Start and end of each clip are the SAME SHOT; the end shows the object's new state. No cuts inside a clip.
- The next clip inherits the workspace and the object's state from the previous end. Never reset the workspace mid-video.
- A visible change every 1.5–2.5 seconds: step marker pop, hand enters, action, state change, small camera push on the active object.
- The last clip ends on the finished result at rest. Never bridge back to Clip 1.

## Workflow

1. Read `references/tutorial-proposal-contract.md` and produce Phase A in the user's language, VO in the chosen voiceover language.
2. Stop and request explicit approval.
3. On a change of ratio, step set, order, workspace, or wording, recompose Phase A and request approval again.
4. Only after approval, read `references/tutorial-prompt-contract.md` and produce Phase B per clip.

## Output rules

- 3–8 seconds per clip; each prompt states its duration.
- Colours in ordinary words only; never hexadecimal, RGB, HSL, or Pantone.
- Steps come only from the source; do not invent tools, quantities, settings, or safety claims.
- No captions, subtitles, or written step descriptions beyond the step marker.
- The final clip resolves on the finished result; never a loop.
