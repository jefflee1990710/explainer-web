# Story Short Director Upgrade Design

**Date:** 2026-11-07

## Intent & Why
Upgrade `story-short-director` so that short narrative films never force a third-person narrator voiceover or clamp silent/action clips to 5 seconds. Instead, `story-short-director` uses `gemini-4-argon` for storyboard planning, bans third-person narration (only on-screen character dialogue `NAME: "line"` when the story calls for speech, or `(no dialogue)` for pure action), preserves director/user-planned clip durations (5–12s, expanded if spoken VO is longer), and renders video clips via `bytedance/seedance-2.0` on OpenRouter with a Voice-First pipeline (ElevenLabs VO synthesized first when dialogue is present, injecting lip-sync timing into the video prompt and muxing the VO track) and automatic fallback to `minimax/hailuo-3` (for realistic styles) or `alibaba/wan-3.0` (for non-realistic styles) if ByteDance's real-person face filter blocks a frame.

## Goals & Non-Goals
- **Goals:**
  1. Ban third-person narration in `story-short-director` (`speechMode: "lip-sync"`, `bansNarration: true`, `audioFirstLipSync: false`). Characters either stay silent (`(no dialogue)`) or speak their own dialogue on screen (`NAME: "line"`).
  2. Respect the director's / user's planned `durationSeconds` (5–12s) in Phase A and clip append for `story-short-director` instead of collapsing silent or short-line clips to 5 seconds, while still expanding if spoken dialogue requires more time.
  3. Route `story-short-director` storyboard generation (`storyboardModel(skillSlug)`) to `gemini-4-argon`.
  4. Route `story-short-director` video generation (`clipVideoModel`) to `bytedance/seedance-2.0` (`OPENROUTER_SEEDANCE_2_VIDEO_MODEL`), with Voice-First ElevenLabs VO synthesis + `expandVideoToVo` + timed lip-sync prompt when dialogue exists, and automatic fallback to `minimax/hailuo-3` (`2K`) for realistic styles when Seedance rejects a real-person face.
  5. Keep `pipeline-models.md` in sync with the system design.
- **Non-Goals:**
  - Changing any other director's rules, prompts, or models (`1 Director = 1 File` isolation).

## Approaches
1. **Isolated Director Rules + Targeted Model/Duration Routing (Chosen):**
   - Update `story-short-director` catalog behavior (`speechMode: "lip-sync"`, `bansNarration: true`) and isolated rule file (`src/service/director/rules/story-short-director.ts`) + legacy helper `storyShortDirectorBlock()`.
   - Add `skillSlug` parameter to `storyboardModel(skillSlug?)` so `story-short-director` uses `gemini-4-argon` while other directors remain on `gemini-3.8-flash`.
   - Add `preservePlannedDuration` option to `withSpokenClipDuration` / `withSpokenClipDurations` (enabled for `story-short-director`) so `durationSeconds` stays `Math.min(12, Math.max(5, plannedDuration, spokenDuration))`.
   - Update `clipVideoModel(styleOrId, skillSlug?)` to return `OPENROUTER_SEEDANCE_2_VIDEO_MODEL` (`bytedance/seedance-2.0`) when `skillSlug === "story-short-director"`, enable `expandVideoToVo` for `story-short-director` in `src/service/higgsfield/pipeline.ts`, and pass `fallbackModel` (`minimax/hailuo-3` for realistic, `alibaba/wan-3.0` otherwise) in `submitOpenRouterClipVideo`.
2. **Global Default Model Change (Rejected):**
   - Changing `STORYBOARD_MODEL` or `SEEDANCE_2_VIDEO_MODEL` globally would affect all directors and violate isolation.
