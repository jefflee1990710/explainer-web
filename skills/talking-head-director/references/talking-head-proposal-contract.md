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
4. Aspect ratio and the shot named by the director visual (eyes to lens)
5. The character speaks. On 9:16 the subtitle sits a little below the vertical center. On 16:9 it sits across the bottom. It matches each clip's spoken line.
6. Cast lock: the one attached blueprint
7. No music

## Storyboard contract

| Clip # & time | Clip k of N | Start still | Lip-sync + head/hands/body like a reel, camera locked | Spoken line | SFX |
|---|---|---|---|---|---|

One row per balanced clip, not one row per sentence.

## Scene detail

Write `startScene` and `endScene` as four concrete parts, in order:

1. Character: seated, eyes locked into the lens like a real phone video filmed at home, mouth just opening, one hand holding a small homemade microphone close to the mouth (start) or mouth just closed in a small real smile, the same microphone still near the mouth (end). Never describe appearance. Never stand them up.
2. Set: the same seat beside a bookshelf in every clip. Books at the shoulder. No pictures pasted on the frame.
3. Light: soft natural indoor daylight, the same in every clip.
4. Camera: locked seated medium shot, head, torso, and the homemade microphone in frame. Name the subtitle place (a little below center on 9:16, across the bottom on 16:9) and quote the spoken line.

Clip 2 and after: `startScene` copies the previous `endScene`.

## Motion contract (`motionCamera`)

One timed move that fills this clip's own seconds, for example `0–0.4s seated, inhale, blink, eyes on the lens, homemade microphone already near the mouth; 0.4–4s continuous lip-sync with a live real-person face, head tilting and nodding, shoulders rocking, the microphone staying near the mouth; 4–5s mouth closes into a small real smile; camera locked`. No cuts. The subtitle does not change mid-clip. Never freeze the head, the mic hand, or the shoulders. Never stand up.

## Phase A checks

- Clip count is at most 20, and neighbouring clips have a similar word count.
- Every clip is a verbatim slice of the script, 5–12 seconds.
- Every clip shares the same camera, set, and light.
- Each start still after clip 1 matches the previous end still.
- The subtitle matches `englishVo`. On 9:16 it sits a little below the vertical center. On 16:9 it sits across the bottom.
