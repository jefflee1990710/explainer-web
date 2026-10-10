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

1. Character: seated, eyes locked into the lens like a real phone video filmed at home, mouth just opening, one hand holding a small homemade microphone close to the mouth (start) or mouth just closed in a small real smile, the same microphone still near the mouth (end). Never describe appearance. Never stand them up.
2. Set: the same seat beside a bookshelf in every clip. Books at the shoulder. No pictures pasted on the frame.
3. Light: soft natural indoor daylight, the same in every clip.
4. Camera: locked seated medium shot, head, torso, and the homemade microphone in frame. The subtitle is LARGE (a little below center on 9:16, across the bottom on 16:9). Quote the spoken line. The end still keeps the same crop, distance, and screen position as the start still. The microphone stays in the same hand. No zoom and no jump.

Clip 2 and after: `startScene` copies the previous `endScene`. The end still does not reframe.

## Motion contract (`motionCamera`)

One timed move that fills this clip's own seconds. The camera stays on the same framing from the first frame to the last: no cut, no zoom, no jump. The microphone stays in the same hand. Example: `0–0.4s seated, eyes on the lens, microphone already near the mouth, the large subtitle fades and slides up into place; 0.4–4s continuous lip-sync, the subtitle holds large and still; 4–5s mouth closes, the large subtitle fades and slides down out; camera locked on the same framing`. Never freeze the head, the mic hand, or the shoulders. Never stand up.

## Phase A checks

- Clip count is at most 20, and each clip is a short clause, not a paragraph.
- Every clip is a verbatim slice of the script. Rendered length is 5–12 seconds.
- Every clip shares the same camera, set, and light. The end still does not jump away from the start still.
- Each start still after clip 1 matches the previous end still. The microphone stays in the same hand.
- The subtitle is large, matches `englishVo`, fades in at the start, and fades out at the end. On 9:16 it sits a little below the vertical center. On 16:9 it sits across the bottom.
