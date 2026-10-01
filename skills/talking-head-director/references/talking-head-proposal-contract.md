# Talking-Head Proposal Contract (Phase A)

Present a readable director's proposal and stop for confirmation before writing model prompts.

## Script contract

- Split the source into sentences. One sentence is one clip.
- Do not rewrite the words.
- 1–20 clips. More than 20: stop and ask the user to cut sentences.
- A sentence whose spoken length exceeds 12 seconds: stop and ask the user to shorten it. Do not break it into two clips.

## Header contract

1. Title in the planning language and in English
2. Total duration (sum of clip seconds), clip count = sentence count, loop mode: always Linear
3. The script's point in one line
4. Aspect ratio and the single locked shot (medium close-up, eyes to lens)
5. The character speaks; bottom subtitles match each sentence
6. Cast lock: the one attached blueprint
7. No music

## Storyboard contract

| Clip # & time | Sentence k of N | Start still | Mouth + nod, camera locked | Spoken sentence | SFX |
|---|---|---|---|---|---|

Exactly one row per sentence.

## Scene detail

Write `startScene` and `endScene` as four concrete parts, in order:

1. Character: eyes into the lens, mouth just opening (start) or just closed (end). Never describe appearance.
2. Set: the same plain background in every clip.
3. Light: same direction and mood in every clip.
4. Camera: locked medium close-up. Name the bottom subtitle and quote the sentence.

Clip 2 and after: `startScene` copies the previous `endScene`.

## Motion contract (`motionCamera`)

One timed move that fills this clip's own seconds, for example `0–4s mouth speaks the sentence with a small nod; camera locked`. No cuts. The subtitle does not change mid-clip.

## Phase A checks

- Clip count equals the sentence count and is at most 20.
- Every clip is one verbatim sentence, 1–12 seconds.
- Every clip shares the same camera, set, and light.
- Each start still after clip 1 matches the previous end still.
- The bottom subtitle matches `englishVo`.
