---
name: directing-two-character-qa
description: Use when turning an article, FAQ, explainer copy, or a topic into a short animated TWO-CHARACTER Q&A (one asks, one answers) for Reels, TikToks, Shorts, onboarding, or support content.
---

# Directing Two-Character Q&A Shorts

## Core contract

Turn one source into a confirmed director's proposal (Phase A) and then standalone per-clip video prompts (Phase B). The two characters do all the talking: there is NO narrator and NO third-person voiceover. Each clip runs 3–8 seconds (maximum 8 seconds). Clip count follows the number of question/answer exchanges and the duration preset (e.g. 2–3 clips for a 15s single exchange, 4–6 clips for 30–45s, 7–10 clips for 60s). Questions carry curiosity; answers carry the payload. The viewer learns by overhearing.

## Setup gate

Require these before planning:

- source material (the topic and the facts the answers may use)
- aspect ratio: `16:9`, `9:16`, or `1:1`
- exactly TWO cast / character reference images — the asker and the answerer. Never one, never three. If fewer or more than two are attached, stop and ask the user to attach exactly two.

If required items are missing, ask for them in one concise message and stop. Never select an aspect ratio silently. Do not re-ask choices already supplied. Do not invent a third character or a replacement hero.

## Visual world

The rendering rules (canvas, look, palette, and motion) come from the **Visual style** block appended below this skill. Do not invent a different medium. Lettering comes only from the selected text style, never from the visual style or from this skill.

- **Two-character lock**: the ASKER (curious, reactive, stands for the viewer) and the ANSWERER (calm, knowledgeable). Exactly two blueprints are attached — assign one role to each and follow them exactly. Never invent a third person. Never restyle attached blueprints.
- **Fixed staging**: the two characters keep the same left/right (or top/bottom for `9:16`) positions for the whole video. The asker on one side, the answerer on the other. Never swap sides.
- Visual aids appear BETWEEN or ABOVE them: a prop, a simple diagram, an object that morphs to illustrate the answer. Aids are the only thing allowed to change dramatically.
- Reactions are the retention engine: the asker's face and posture must visibly react to every answer.

## Q&A architecture

1. **Hook (Clip 1, first 2s)**: the asker blurts the most surprising or relatable question, already mid-gesture (leaning in, holding the problem object). No greetings, no "today we'll talk about".
2. **Exchanges**: each clip is ONE exchange or ONE half of an exchange — a question (3–5s) or an answer (5–8s). Every answer reveals one idea and raises the next question naturally.
3. **Escalation**: questions get sharper ("but what if…", "then why…"); the answerer uses a prop or diagram to show, not tell.
4. **Payoff**: the biggest "aha" answer comes in the last third.
5. **Button**: the asker's satisfied reaction plus one short closing line from either character. Both rest in their positions. Never loop back to the first question.

## Dialogue — no narrator

- There is NO narrator, host, or third-person voiceover. Never add an unseen explainer voice.
- All speech is character dialogue in the chosen dialogue language, written as `NAME: "line"` with each attached character's name. One or two speakers per clip; a clip may contain a question and its short answer if both fit in 8 seconds.
- `narrator` must start with `No narrator — characters speak.` Then paste each supplied voice lock verbatim, one speaker per sentence. A speaker without their own lock uses the project voice lock verbatim. Do not invent a timbre and do not leave a speaker out. Keep that block identical in every clip.
- ~7–20 spoken words per clip total at medium speaking pace. Slow ≈ 0.8× those words with pauses; fast ≈ 1.2× with fewer pauses. Clip duration stays the same. Questions are short (≤10 words at medium); answers may run longer.
- Dialogue is audio-only. Never caption or subtitle it. In-world text only on props or diagrams the answerer uses (one to three words, exactly spelled).
- Only use facts from the source. If the asker raises a question the source does not answer, the answerer must not invent one — pick a different question.

## Phase A field mapping

- `hookStrategy`: the opening question and the asker's motion/prop device in second 0–2.
- `coreMessage`: the one answer the viewer should remember.
- `narrativeArc`: the exchange ladder (Q1 → A1 → Q2 → …) mapped to clips, with the "aha" marked.
- `narrator`: `No narrator — characters speak.` followed by each supplied voice lock pasted verbatim.
- `visualWorld`: the fixed staging (who stands where), the setting, and the aid zone.
- `characterLock`: two-character lock statement.
- `palette`: ordinary colour words; one accent for visual aids.
- `bgmDirection`: SFX-only reminder (no background music), with a reaction SFX lift at the "aha".
- Each clip row: `narrativeJob` = which exchange / role (question or answer); `explainerScene` = both characters' poses and the aid state at t=0; `motionCamera` = gestures, reaction, aid change within the same shot, camera, and whose mouth moves; `englishVo` = character dialogue only (`NAME: "line"`) in the chosen dialogue language; `bgmSfx` = 1–2 reaction/aid SFX, no music.
- On a question clip only the asker's mouth lip-syncs. On an answer clip only the answerer's mouth lip-syncs. The listener's mouth stays closed.

## Clip continuity

- Start and end of each clip are the SAME SHOT: same camera, same character positions; only gestures, expressions, and the visual aid change.
- The next clip inherits both characters' poses and the aid state from the previous end.
- A visible change every 1.5–2.5 seconds: a gesture, a reaction, an aid pop or morph, a small camera push toward whoever is speaking.
- The last clip ends with both at rest after the button. Never bridge back to Clip 1.

## Workflow

1. Read `references/qa-proposal-contract.md` and produce Phase A scene descriptions and the dialogue in the chosen language setting.
2. Stop and request explicit approval.
3. On a change of ratio, cast roles, question ladder, or wording, recompose Phase A and request approval again.
4. Only after approval, read `references/qa-prompt-contract.md` and produce Phase B per clip.

## Output rules

- 3–8 seconds per clip; each prompt states its duration.
- Colours in ordinary words only; never hexadecimal, RGB, HSL, or Pantone.
- No invented facts; no answers the source does not support.
- No narrator or voiceover; only the two characters speak.
- No captions, subtitles, speech bubbles with transcribed dialogue, or UI text.
- The final clip rests; never a loop.
