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
4. Aspect ratio and the shot named by the director visual (eyes to lens)
5. The character speaks. The subtitle is LARGE and phone-readable. On 9:16 it sits a little below the vertical center. On 16:9 it sits across the bottom. It matches each clip's spoken line, fades and slides in at the start, and fades and slides out at the end.
6. Cast lock: the one attached blueprint
7. No music

## Storyboard contract

| Clip # & time | Clip k of N | Start still | Lip-sync + head/hands/body like a reel, camera locked | Spoken line | SFX |
|---|---|---|---|---|---|

One row per short clip. Do not pack several sentences into one row.

## Scene detail

Write `startScene` and `endScene` as four concrete parts, in order:

1. Character: seated, eyes locked into the lens, mouth just opening (start) or mouth just closed in a small real smile (end). Both hands stay inside the frame. No microphone. Never describe appearance. Never stand them up. Do not send an arm out of the frame.
2. Set: the same sofa in every clip. A bookshelf behind the head. No pictures pasted on the frame.
3. Light: ordinary daylight from a window to one side, the same in every clip. No studio light.
4. Camera: a phone fixed on a phone tripod. The lens is 24mm at f/1.8, the face sharp and the background a little soft. Head and torso in frame. The subtitle is LARGE (a little below center on 9:16, across the bottom on 16:9). Quote the spoken line. The end still keeps the same crop, distance, and screen position as the start still. No zoom and no jump. Not arm's length.

Clip 2 and after: `startScene` copies the previous `endScene`. The end still does not reframe.

## Motion contract (`motionCamera`)

One timed move that fills this clip's own seconds. The phone stays on the tripod: no cut, no zoom, no jump. Example: `0–0.4s seated, eyes on the lens, both hands in frame, the large subtitle fades and slides up into place; 0.4–4s continuous lip-sync, both hands gesture, the subtitle holds large and still; 4–5s mouth closes, the large subtitle fades and slides down out; camera stays locked, 24mm at f/1.8`. Never freeze the head, the hands, or the shoulders. Never stand up.

## Phase A checks

- Clip count is at most 20, and each clip is a short clause, not a paragraph.
- Every clip is a verbatim slice of the script. Rendered length is 5–12 seconds.
- Every clip shares the same camera, set, and light. The end still does not jump away from the start still.
- Each start still after clip 1 matches the previous end still. The microphone stays in the same hand.
- The subtitle is large, matches `englishVo`, fades in at the start, and fades out at the end. On 9:16 it sits a little below the vertical center. On 16:9 it sits across the bottom.
