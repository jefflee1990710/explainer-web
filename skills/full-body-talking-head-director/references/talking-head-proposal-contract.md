# Talking-Head Proposal Contract (Phase A)

Present a readable director's proposal and stop for confirmation before writing model prompts.

## Script contract

- The first source is a director instruction for tone and staging. It is not spoken.
- The spoken script is locked. Copy the words into `englishVo` verbatim.
- Never put briefing language into `englishVo`.
- Balance the spoken script across clips. Each clip gets a similar word count. Short lines merge. Long lines split on clause breaks, then words. Do not break a token such as `Scro.io`.
- 1–20 clips, each 5–12 seconds. A script longer than 240 seconds: ask the user to cut.

## Header contract

1. Title in the planning language and in English
2. Total duration (sum of clip seconds), clip count, loop mode: always Linear
3. The script's point in one line
4. Aspect ratio and the locked full-body shot (eyes to lens, head to feet in frame)
5. The character speaks; bottom subtitles match each clip's spoken line
6. Cast lock: the one attached blueprint
7. No music

## Storyboard contract

| Clip # & time | Clip k of N | Start still | Mouth + nod, camera locked | Spoken line | SFX |
|---|---|---|---|---|---|

One row per balanced clip, not one row per sentence.

## Scene detail

Write `startScene` and `endScene` as four concrete parts, in order:

1. Character: eyes into the lens, mouth just opening (start) or just closed (end). Never describe appearance.
2. Set: the same plain background in every clip.
3. Light: same direction and mood in every clip.
4. Camera: locked full-body, character centered, head to feet in frame. Name the bottom subtitle and quote the spoken line.

Clip 2 and after: `startScene` copies the previous `endScene`.

## Motion contract (`motionCamera`)

One timed move that fills this clip's own seconds, for example `0–4s mouth speaks the line with a small nod and a natural gesture; feet stay in frame; camera locked`. No cuts. The subtitle does not change mid-clip.

## Phase A checks

- Clip count is at most 20, and neighbouring clips have a similar word count.
- Every clip is a verbatim slice of the script, 5–12 seconds.
- Every clip shares the same camera, set, and light.
- Each start still after clip 1 matches the previous end still.
- The bottom subtitle matches `englishVo`.
