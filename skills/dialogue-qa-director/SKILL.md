---
name: directing-two-character-qa
description: Use when turning an article, FAQ, explainer copy, or a topic into a short animated TWO-CHARACTER Q&A (one asks, one answers) for Reels, TikToks, Shorts, onboarding, or support content.
---

# Directing Two-Character Q&A Shorts

## Core contract

Turn one source into a confirmed director's proposal (Phase A) and then standalone per-clip video prompts (Phase B). Each clip runs 3–8 seconds (maximum 8 seconds). Clip count follows the number of question/answer exchanges and the duration preset (e.g. 2–3 clips for a 15s single exchange, 4–6 clips for 30–45s, 7–10 clips for 60s). Questions carry curiosity; answers carry the payload. The viewer learns by overhearing.

## Setup gate

Require these before planning:

- source material (the topic and the facts the answers may use)
- aspect ratio: `16:9`, `9:16`, or `1:1`
- optional: cast / character reference images — ideally TWO characters (asker and answerer)

If required items are missing, ask for them in one concise message and stop. Never select an aspect ratio silently. Do not re-ask choices already supplied.

## Visual world

The rendering rules (canvas, look, palette, lettering, motion) come from the **Visual style** block appended below this skill. Do not invent a different medium.

- **Two-character lock**: the ASKER (curious, reactive, stands for the viewer) and the ANSWERER (calm, knowledgeable). If two blueprints are attached, assign one role to each and follow them exactly; if one blueprint is attached, it is the ANSWERER and you define a simple ASKER; if none, define both simply in `characterLock` (silhouette, two wardrobe colours each, one signature prop each) and keep them identical across clips. Never restyle attached blueprints.
- **Fixed staging**: the two characters keep the same left/right (or top/bottom for `9:16`) positions for the whole video. The asker on one side, the answerer on the other. Never swap sides.
- Visual aids appear BETWEEN or ABOVE them: a prop, a simple diagram, an object that morphs to illustrate the answer. Aids are the only thing allowed to change dramatically.
- Reactions are the retention engine: the asker's face and posture must visibly react to every answer.

## Q&A architecture

1. **Hook (Clip 1, first 2s)**: the asker blurts the most surprising or relatable question, already mid-gesture (leaning in, holding the problem object). No greetings, no "today we'll talk about".
2. **Exchanges**: each clip is ONE exchange or ONE half of an exchange — a question (3–5s) or an answer (5–8s). Every answer reveals one idea and raises the next question naturally.
3. **Escalation**: questions get sharper ("but what if…", "then why…"); the answerer uses a prop or diagram to show, not tell.
4. **Payoff**: the biggest "aha" answer comes in the last third.
5. **Button**: the asker's satisfied reaction plus one short closing line from either character. Both rest in their positions. Never loop back to the first question.

## Dialogue

- All speech is character dialogue, written as `NAME: "line"`. One or two speakers per clip; a clip may contain a question and its short answer if both fit in 8 seconds.
- Distinct voices: describe both in `narrator` (e.g. "ASKER — light, quick, upward inflection; ANSWERER — warm, steady, lower"). Keep them identical in every clip.
- ~7–20 spoken words per clip total. Questions are short (≤10 words); answers may run longer.
- Dialogue is audio-only. Never caption or subtitle it. In-world text only on props or diagrams the answerer uses (one to three words, exactly spelled).
- Only use facts from the source. If the asker raises a question the source does not answer, the answerer must not invent one — pick a different question.

## Phase A field mapping

- `hookStrategy`: the opening question and the asker's motion/prop device in second 0–2.
- `coreMessage`: the one answer the viewer should remember.
- `narrativeArc`: the exchange ladder (Q1 → A1 → Q2 → …) mapped to clips, with the "aha" marked.
- `narrator`: both voice identities.
- `visualWorld`: the fixed staging (who stands where), the setting, and the aid zone.
- `characterLock`: two-character lock statement.
- `palette`: ordinary colour words; one accent for visual aids.
- `bgmDirection`: light, conversational, with a lift at the "aha".
- Each clip row: `narrativeJob` = which exchange / role (question or answer); `explainerScene` = both characters' poses and the aid state at t=0; `motionCamera` = gestures, reaction, aid change within the same shot, camera; `englishVo` = the dialogue lines with speaker names; `bgmSfx` = music + reaction/aid SFX.

## Clip continuity

- Start and end of each clip are the SAME SHOT: same camera, same character positions; only gestures, expressions, and the visual aid change.
- The next clip inherits both characters' poses and the aid state from the previous end.
- A visible change every 1.5–2.5 seconds: a gesture, a reaction, an aid pop or morph, a small camera push toward whoever is speaking.
- The last clip ends with both at rest after the button. Never bridge back to Clip 1.

## Workflow

1. Read `references/qa-proposal-contract.md` and produce Phase A in the user's language, dialogue in the chosen voiceover language.
2. Stop and request explicit approval.
3. On a change of ratio, cast roles, question ladder, or wording, recompose Phase A and request approval again.
4. Only after approval, read `references/qa-prompt-contract.md` and produce Phase B per clip.

## Output rules

- 3–8 seconds per clip; each prompt states its duration.
- Colours in ordinary words only; never hexadecimal, RGB, HSL, or Pantone.
- No invented facts; no answers the source does not support.
- No captions, subtitles, speech bubbles with transcribed dialogue, or UI text.
- The final clip rests; never a loop.
