# Talking-Head Proposal Contract (Phase A)

Present a readable director's proposal and stop for confirmation before writing model prompts.

## Script contract

- The first source is a director instruction for tone and staging. It is not spoken.
- The spoken script is locked. Copy the words into `englishVo` verbatim.
- Never put briefing language into `englishVo`.
- Break the spoken script into short clips. Each clip is about one clause (around 4 seconds of speech, at most 5) so the subtitle stays large. Merge only a line that is already shorter than that. Long lines split on clause breaks, then words. Do not break a token such as `Scro.io`.
- 1–20 clips. A short line still renders at least 5 seconds. A clip is never longer than 12 seconds. A script longer than 240 seconds: ask the user to cut.

## Header contract

1. Title in the planning language and in English
2. Total duration (sum of clip seconds), clip count, loop mode: always Linear
3. The script's point in one line
4. Aspect ratio and the locked full-body shot (eyes to lens, head to feet in frame)
5. The character speaks. The subtitle is LARGE and phone-readable. On 9:16 it sits a little below the vertical center. On 16:9 it sits across the bottom. It matches each clip's spoken line, fades and slides in at the start, and fades and slides out at the end.
6. Cast lock: the one attached blueprint
7. No music

## Storyboard contract

| Clip # & time | Clip k of N | Start still | Lip-sync + head/hands/body like a reel, camera locked | Spoken line | SFX |
|---|---|---|---|---|---|

One row per short clip. Do not pack several sentences into one row.

## Scene detail

Write `startScene` and `endScene` as four concrete parts, in order:

1. Character: eyes locked into the lens as if talking into a phone, mouth just opening, head tilted, one hand beginning to lift at chest height, weight on one hip (start) or mouth just closed in an engaged small smile, head tilted the other way, the other hand still raised, weight on the other hip (end). Never describe appearance.
2. Set: the same plain background in every clip.
3. Light: same direction and mood in every clip.
4. Camera: locked full-body, character centered, head to feet in frame. The subtitle is LARGE (a little below center on 9:16, across the bottom on 16:9). Quote the spoken line. The end still keeps the same crop, distance, and screen position as the start still. No zoom and no jump.

Clip 2 and after: `startScene` copies the previous `endScene`. The end still does not reframe.

## Motion contract (`motionCamera`)

One timed move that fills this clip's own seconds. The camera stays on the same framing from the first frame to the last: no cut, no zoom, no jump. Example: `0–0.4s eyes on the lens, the large subtitle fades and slides up into place; 0.4–4s continuous lip-sync, the subtitle holds large and still; 4–5s mouth closes, the large subtitle fades and slides down out; camera locked on the same framing`. Never freeze the head, hands, or body.

## Phase A checks

- Clip count is at most 20, and each clip is a short clause, not a paragraph.
- Every clip is a verbatim slice of the script. Rendered length is 5–12 seconds.
- Every clip shares the same camera, set, and light. The end still does not jump away from the start still.
- Each start still after clip 1 matches the previous end still.
- The subtitle is large, matches `englishVo`, fades in at the start, and fades out at the end. On 9:16 it sits a little below the vertical center. On 16:9 it sits across the bottom.
