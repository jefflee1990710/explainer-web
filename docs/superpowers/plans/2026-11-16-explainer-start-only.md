# Explainer Start-Only Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 三個 Explainer 導演只畫首幀，Phase B 依 `motionCamera` 把首幀演向文字裡的 `endScene`。

**Architecture:** 三個導演的 `behavior.keyframeMode` 改成現成的 `"start-only"`，`dualBeat` 維持 `true`。`clipSkipsEndStill` 因此不再排隊尾幀、不再把尾幀送給 MiniMax。各導演檔自己改 Phase B 動作規則；`phaseBSystemPrompt` 與 `clipPhaseBUserPrompt` 的 Explainer 分支改成「只附首幀，`endScene` 是文字落地狀態」。

**Tech Stack:** TypeScript、`node:test` + `tsx`、Next.js、OpenCut inspector、`pipeline-models.md`。

**Spec:** `docs/superpowers/specs/2026-11-16-explainer-start-only-design.md`

## Global Constraints

- 範圍只有 `cartoon-explainer-video-director`、`paper-cutout-explainer-video-director`、`papercraft-diorama-director`。
- `dualBeat` 維持 `true`。Phase A 仍寫 `startScene`、`endScene`、`explainerScene`、`motionCamera`。
- 不新增 keyframe 模式。不取消已排隊的尾幀任務，不退已扣的尾幀 credits。
- 三個導演的動作提示詞各自寫在自己的 rule 檔，不共用同一段物理描述。
- 動作提示詞長度維持 350–800 字、最長 1,000。角色嘴閉合，眼睛和手留在教學物件上。
- 測試用 `npx tsx --test <file>`。不呼叫 Higgsfield、OpenRouter 或 Google 生圖。
- 同一輪更新 `pipeline-models.md` 與 `AGENTS.md`。

## File Structure

- `src/service/director/catalog/cartoon-explainer-video-director.ts` — 白板 `keyframeMode`。
- `src/service/director/catalog/paper-cutout-explainer-video-director.ts` — 剪紙 `keyframeMode`。
- `src/service/director/catalog/papercraft-diorama-director.ts` — 摺紙 `keyframeMode`。
- `src/service/director/rules/cartoon-explainer-video-director.ts` — 白板 Phase A 落地句與 Phase B 動作規則。
- `src/service/director/rules/paper-cutout-explainer-video-director.ts` — 剪紙 Phase A 落地句與 Phase B 動作規則。
- `src/service/director/rules/papercraft-diorama-director.ts` — 摺紙 Phase A 落地句與 Phase B 動作規則。
- `src/service/director/run-phase-b.ts` — Explainer 的 `phaseBSystemPrompt`。
- `src/service/director/phase-b-clip-prompt.ts` — Explainer 的 user prompt 合約與 `phaseBLetteringLock`。
- `src/service/director/skill-rules.ts` — `cartoonNarratorVideoLock` 的白板／剪紙／摺紙句子。
- `src/service/opencut/messages.ts` — seed clip 的 `singleFrame`。
- `src/service/scro-video/timeline-seed.ts` — 寫入 `singleFrame`，並讓 diff 看得到它。
- `src/opencut/embed/scro-video-ai-entry.tsx` — `singleFrame` 時收起尾幀卡片。
- `pipeline-models.md`、`AGENTS.md` — 模型說明改成只畫首幀。
- 對應的 `*.test.ts` 只改斷言，不改產片程式的其他導演。

---

### Task 1: 三個導演改成 start-only

**Files:**
- Modify: `src/service/director/catalog/cartoon-explainer-video-director.ts`（`keyframeMode`）
- Modify: `src/service/director/catalog/paper-cutout-explainer-video-director.ts`（`keyframeMode`）
- Modify: `src/service/director/catalog/papercraft-diorama-director.ts`（`keyframeMode`）
- Test: `src/service/director/catalog/catalog.test.ts`
- Test: `src/service/director/explainer-family.test.ts`
- Test: `src/service/clip-stage.test.ts`
- Test: `src/service/clip/clip-context.test.ts`

**Interfaces:**
- Consumes: `IDirector.behavior.keyframeMode`、`clipSkipsEndStill`、`clipDrawsNoEndStill`、`clipFrameCost`、`clipStateFor`、`framesWithClip`
- Produces: 這三個 slug 的 `keyframeMode === "start-only"`。`clipDrawsNoEndStill(project, n)` 為 `true`。`clipFrameCost` 回 `FRAME_COST`（4）。只有首幀完成時 `clipStateFor(...).stage === "frames_ready"`。`framesWithClip` 對白板只回 `["start"]`。

- [ ] **Step 1: 把會失敗的斷言改成 start-only**

在 `catalog.test.ts` 把這三行的期望值改成 `"start-only"`：

```ts
assert.equal(DIRECTORS_BY_SLUG["cartoon-explainer-video-director"].behavior.keyframeMode, "start-only");
assert.equal(DIRECTORS_BY_SLUG["paper-cutout-explainer-video-director"].behavior.keyframeMode, "start-only");
assert.equal(DIRECTORS_BY_SLUG["papercraft-diorama-director"].behavior.keyframeMode, "start-only");
```

`dualBeat` 的 `true` 斷言留著。

在 `explainer-family.test.ts` 把紙剪與摺紙的 `keyframeMode` 期望改成 `"start-only"`。

在 `clip-stage.test.ts` 把白板測試改成：只有首幀完成就是 `frames_ready`，費用是 4；沒有任何畫格時不是 `frames_ready`。摺紙只留首幀也是 `frames_ready`，費用 4。

```ts
test("explainer directors need the start still only", () => {
  const p = project({
    skillSlug: "cartoon-explainer-video-director",
    styleId: "realistic",
    frames: [frame(1, "start", "completed")],
  });
  assert.equal(clipStateFor(p, 1).stage, "frames_ready");
  assert.equal(clipStateFor(p, 1).frameCost, 4);

  const missing = project({
    skillSlug: "cartoon-explainer-video-director",
    styleId: "realistic",
    frames: [],
  });
  assert.notEqual(clipStateFor(missing, 1).stage, "frames_ready");

  const diorama = project({
    skillSlug: "papercraft-diorama-director",
    styleId: "papercraft-diorama",
    frames: [frame(1, "start", "completed")],
  });
  assert.equal(clipStateFor(diorama, 1).stage, "frames_ready");
  assert.equal(clipStateFor(diorama, 1).frameCost, 4);
});
```

刪掉同一個測試裡舊的「白板只有首幀是 `no_frames`、費用 8」以及「摺紙要兩張才 `frames_ready`、費用 8」。`one-take-director` 那段留著。

在 `clip-context.test.ts` 把 Clip 3 摺紙改成：

```ts
assert.equal(clipDrawsNoEndStill(project, 3), true);
assert.equal(clipFrameCost(project, 3), FRAME_COST);
```

同一個檔案裡 `framesWithClip` 對 Clip 2（`cartoon-explainer-video-director`）的期望改成：

```ts
assert.deepEqual(
  clip2Frames.map((f) => f.position),
  ["start"],
);
```

- [ ] **Step 2: 跑測試，確認現在失敗**

Run: `npx tsx --test src/service/director/catalog/catalog.test.ts src/service/director/explainer-family.test.ts src/service/clip-stage.test.ts src/service/clip/clip-context.test.ts`

Expected: FAIL。`keyframeMode` 仍是 `"start-end"`，白板只有首幀時 stage 不是 `frames_ready`。

- [ ] **Step 3: 只改三個 catalog 的 keyframeMode**

三個檔案的 `behavior.keyframeMode` 從 `"start-end"` 改成 `"start-only"`。`dualBeat: true` 和其他 behavior 不動。

- [ ] **Step 4: 再跑 Step 2 的測試**

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/service/director/catalog/cartoon-explainer-video-director.ts src/service/director/catalog/paper-cutout-explainer-video-director.ts src/service/director/catalog/papercraft-diorama-director.ts src/service/director/catalog/catalog.test.ts src/service/director/explainer-family.test.ts src/service/clip-stage.test.ts src/service/clip/clip-context.test.ts
git commit -m "$(cat <<'EOF'
feat(director): draw explainer clips from the start still only

EOF
)"
```

---

### Task 2: 三個導演各自的動作規則

**Files:**
- Modify: `src/service/director/rules/cartoon-explainer-video-director.ts`
- Modify: `src/service/director/rules/paper-cutout-explainer-video-director.ts`
- Modify: `src/service/director/rules/papercraft-diorama-director.ts`
- Test: `src/service/director/rules/rules.test.ts`

**Interfaces:**
- Consumes: `DirectorRuleModule.phaseASceneDetailBlock`、`phaseAKeyframeDeltaBlock`、`phaseBMotionRules`、`phaseBDetailRules`
- Produces: 三個 `phaseBMotionRules()` 都含 `There is no end image and no last frame`，並保留該導演的鏡頭句。`phaseBDetailRules()` 寫「written endScene」，不再寫 `Start frame to the End frame`。

- [ ] **Step 1: 在 rules.test.ts 加上三個導演的斷言**

`rules.test.ts` 已經 import `getDirectorRuleModule`。找到現有的 papercraft `phaseBDetailRules` 斷言：

```ts
assert.match(papercraftRules.phaseBDetailRules({}), /State A -> State B|Start frame to the End frame/i);
assert.doesNotMatch(papercraftRules.phaseBDetailRules({}), /start-only/i);
```

改成：

```ts
assert.match(papercraftRules.phaseBDetailRules({}), /written endScene/i);
assert.match(papercraftRules.phaseBMotionRules({}), /There is no end image and no last frame/);
assert.match(papercraftRules.phaseBMotionRules({}), /diorama camera/i);
assert.doesNotMatch(papercraftRules.phaseBMotionRules({}), /first\/last frames/);
```

在同一個檔案新增：

```ts
test("explainer motion rules attach the start still and land on the written endScene", () => {
  const whiteboard = getDirectorRuleModule("cartoon-explainer-video-director");
  const cutout = getDirectorRuleModule("paper-cutout-explainer-video-director");
  const papercraft = getDirectorRuleModule("papercraft-diorama-director");

  assert.match(whiteboard.phaseBMotionRules({}), /There is no end image and no last frame/);
  assert.match(whiteboard.phaseBMotionRules({}), /CAMERA LOCK \(2D PLANAR\)/);
  assert.match(whiteboard.phaseBMotionRules({}), /written endScene/);
  assert.doesNotMatch(whiteboard.phaseBMotionRules({}), /first\/last frames/);

  assert.match(cutout.phaseBMotionRules({}), /There is no end image and no last frame/);
  assert.match(cutout.phaseBMotionRules({}), /locked stationary square-on camera/i);
  assert.match(cutout.phaseBMotionRules({}), /written endScene/);
  assert.doesNotMatch(cutout.phaseBMotionRules({}), /first\/last frames/);

  assert.match(
    whiteboard.phaseASceneDetailBlock({ realistic: false, hasCharacter: true }),
    /written landing/i,
  );
  assert.match(papercraft.phaseAKeyframeDeltaBlock({}), /written landing/i);
});
```

- [ ] **Step 2: 跑測試，確認失敗**

Run: `npx tsx --test src/service/director/rules/rules.test.ts`

Expected: FAIL。現有句子仍是 `first/last frames` 或 `Start frame to the End frame`。

- [ ] **Step 3: 改三個 rule 檔，物理規則不互相複製**

白板 `EXPLAINER_DUAL_KEYFRAME_MOTION_RULES` 整段換成：

```ts
const EXPLAINER_START_STILL_MOTION_RULES = [
  "Only the START still (State A) is attached as the first frame. There is no end image and no last frame. endScene is the written State B landing the motion reaches. Never call the start still a reference image.",
  "LENGTH & FOCUS (STRICT): write a short, focused visual-only prompt (350–800 characters, max 1,000 characters). Do NOT write voice locks, narrator/audio/SFX rules, wardrobe essays, lighting descriptions, or long negative lists.",
  "CAMERA LOCK (2D PLANAR) & CHARACTER (1 short clause): keep the 2D planar camera locked and steady on the canvas (no zoom, pan, tilt, or cut); silent closed-lip character stays in their presenter corner with eyes and hands following each active element.",
  "ELEMENT MOTION (State A -> written State B): across the FULL duration, follow motionCamera beat by beat. Describe how the character's hand/gaze and each changing diagram element or label move from the attached start still toward the written endScene with natural continuous ease-in-out motion (glide smoothly in/out, unfold flat, peel/tear open, draw stroke-by-stroke, or flip cleanly along an edge — do not hold State A frozen and snap on the final frames, and avoid jerky speed jumps).",
  "Whiteboard cardboard physics & SCAFFOLD LOCK / TITLE PLATE: fixed canvas/board, axes, grid, and unchanged 「」 labels stay locked in place without morphing or dissolving; only the changing diagram pieces and presenter hand/gaze move cleanly. If endScene changes a 「」 label, change it by one mid-clip in-place flip or tear.",
].join(" ");
```

`phaseBMotionRules` 回傳這個常數。`phaseBDetailRules` 改成：

```ts
return "Detail: first state the locked stationary camera in one short clause, then list element-by-element across timed beats (e.g. 0.0–2.0s …; 2.0–4.0s …) how the character's hand/gaze and each changing diagram element or label move from the attached start still toward the written endScene. Keep lips closed with no lip-sync, and never re-describe character appearance, outfit, lighting, background texture, or spoken voiceover.";
```

Phase A 這句：

`endScene is the opening still after motionCamera has finished`

改成：

`endScene is the written landing after motionCamera has finished. It is not a generated still.`

剪紙 `PAPER_CUTOUT_DUAL_KEYFRAME_MOTION_RULES` 用自己的句子，不要 import 白板常數：

```ts
const PAPER_CUTOUT_START_STILL_MOTION_RULES = [
  "Only the START still (State A) is attached as the first frame. There is no end image and no last frame. endScene is the written State B landing the motion reaches. Never call the start still a reference image.",
  "LENGTH & FOCUS (STRICT): write a short, focused visual-only prompt (350–800 characters, max 1,000 characters). Do NOT write voice locks, narrator/audio/SFX rules, wardrobe essays, lighting descriptions, or long negative lists.",
  "CAMERA & CHARACTER (1 short clause): 100% locked stationary square-on camera (no zoom, pan, tilt, or cut); silent closed-lip character stays in their presenter corner with eyes and hands following each active element.",
  "ELEMENT MOTION (State A -> written State B): across the FULL duration, follow motionCamera beat by beat. Describe how the character's hand/gaze and each changing diagram cutout or label move from the attached start still toward the written endScene with natural continuous ease-in-out motion (glide smoothly in/out, unfold flat, peel/tear open, draw stroke-by-stroke, or flip cleanly along an edge — do not hold State A frozen and snap on the final frames, and avoid jerky speed jumps).",
  "Cutout physics & SCAFFOLD LOCK / TITLE PLATE: the chosen board, axes, grid, and unchanged 「」 labels stay locked in place without morphing or dissolving; cutout pieces stay rigid. If endScene changes a 「」 label, change it by one mid-clip in-place flip or tear.",
].join(" ");
```

剪紙的 `phaseBDetailRules` 與 Phase A 的 `opening still` 句子，用和白板相同的「written endScene / written landing」替換，但保留剪紙自己的檔案內容，不要從白板檔 import。

摺紙 `PAPERCRAFT_DUAL_KEYFRAME_MOTION_RULES` 換成：

```ts
const PAPERCRAFT_START_STILL_MOTION_RULES = [
  "Only the START still (State A) is attached as the first frame. There is no end image and no last frame. endScene is the written State B landing the motion reaches. Never call the start still a reference image.",
  "LENGTH & FOCUS (STRICT): write a short, focused visual-only prompt (350–800 characters, max 1,000 characters). Do NOT write voice locks, narrator/audio/SFX rules, wardrobe essays, lighting descriptions, or long negative lists.",
  "CAMERA & CHARACTER (1 short clause): keep the diorama camera steady on the cardstock set (no jump cut); if a 3D cardstock miniature character figurine is present, keep their lips softly closed (zero lip-sync) with eyes and hands on the cardstock props.",
  "ELEMENT MOTION (State A -> written State B): across the FULL duration, follow motionCamera beat by beat. Describe how each 3D folded cardstock prop, mechanism, label, and optional figurine hand/gaze moves from the attached start still toward the written endScene with natural continuous ease-in-out motion (receipt ribbon feeding smoothly, embossed coins sliding into an envelope, box lid sliding open, or balance scale tipping and settling — rigid 300gsm cardstock pieces never morph, melt, or dissolve).",
].join(" ");
```

`phaseBDetailRules` 改成：

```ts
return "Detail: first state the steady diorama camera and silent character (if present) in one short clause, then list element-by-element across timed beats (e.g. 0.0–2.0s …; 2.0–4.0s …) how each cardstock prop, mechanism, label, and optional figurine hand/gaze move from the attached start still toward the written endScene. Keep lips closed with no lip-sync, and never re-describe character appearance, outfit, lighting, or spoken voiceover.";
```

`phaseASceneDetailBlock` 的 motionCamera 句改成：`motionCamera describes the physical papercraft mechanism animating from the start still (startScene) toward the written landing (endScene) across timed beats. endScene is not a generated still.`

`phaseAKeyframeDeltaBlock` 改成：`startScene is the opening cardstock still and endScene is the written landing on the same locked diorama camera and set. endScene is not a generated still. Keep cardstock geometry rigid across the clip.`

- [ ] **Step 4: 再跑 rules.test.ts**

Run: `npx tsx --test src/service/director/rules/rules.test.ts`

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/service/director/rules/cartoon-explainer-video-director.ts src/service/director/rules/paper-cutout-explainer-video-director.ts src/service/director/rules/papercraft-diorama-director.ts src/service/director/rules/rules.test.ts
git commit -m "$(cat <<'EOF'
feat(director): write explainer motion toward the planned landing

EOF
)"
```

---

### Task 3: Phase B 系統提示、user prompt、字卡鎖

**Files:**
- Modify: `src/service/director/run-phase-b.ts`（`phaseBSystemPrompt` 的 `diagramExplainer` 分支，約 95–118 行）
- Modify: `src/service/director/phase-b-clip-prompt.ts`（`phaseBLetteringLock` 的 diagram 分支，以及 `clipPhaseBUserPrompt` 的兩個 OUTPUT CONTRACT）
- Test: `src/service/director/phase-b-clip-prompt.test.ts`

**Interfaces:**
- Consumes: Task 2 的 `phaseBMotionRules()` 文字。`phaseBSystemPrompt(input, languageLabel, languageSublabel)`。`clipPhaseBUserPrompt`。`phaseBLetteringLock({ skillSlug, durationSeconds })`。
- Produces: Explainer 的系統提示含 `There is no end image` 與 `written endScene`。User prompt 的 OUTPUT CONTRACT 只附 `first_frame`。`phaseBLetteringLock` 對三個 Explainer 不再寫 `last frame`。

- [ ] **Step 1: 改 phase-b-clip-prompt.test.ts 的現有斷言**

`explainer dual-keyframe motion...` 這個測試改成：

```ts
test("explainer motion attaches the start still and lands on the written endScene", () => {
  const prompt = clipPhaseBUserPrompt({ ...base, phaseA: proposal(), clipNumber: 2, smoothMotion: true });
  assert.match(prompt, /There is no end image and no last frame/);
  assert.match(prompt, /written endScene/);
  assert.match(prompt, /CAMERA LOCK \(2D PLANAR\)/);
  assert.match(prompt, /Only the first frame is attached/);
  assert.doesNotMatch(prompt, /first\/last frames/);
  assert.doesNotMatch(prompt, /last_frame \(End\) are attached/);
});
```

`phaseBSystemPrompt uses concise...` 這個測試：刪掉 `assert.match(system, /dual-keyframe image-to-video/)`。改成：

```ts
assert.match(system, /There is no end image/);
assert.match(system, /written endScene/);
assert.match(system, /locked stationary square-on camera/i);
assert.match(system, /natural continuous ease-in-out motion/i);
assert.match(system, /350–800 characters/);
assert.doesNotMatch(system, /END image is attached as the last frame/);
```

其餘 `doesNotMatch`（snapping、jitter、Clean spoken voice）留著。

`papercraft-diorama Phase B user prompt...` 保留 `DIORAMA CAMERA`、`350–800`、`doesNotMatch CAMERA LOCK (2D PLANAR)`。把 `State A -> State B` 改成：

```ts
assert.match(prompt, /There is no end image and no last frame/);
assert.match(prompt, /written endScene/);
assert.match(prompt, /Only the first frame is attached/);
```

`diagram explainer lettering...` 加上：

```ts
assert.match(lock, /There is no last-frame image/);
assert.doesNotMatch(lock, /last frame/);
assert.match(paper, /There is no last-frame image/);
```

`workflow-promo` 的 `fixedLettering` 斷言不要改。

- [ ] **Step 2: 跑測試，確認失敗**

Run: `npx tsx --test src/service/director/phase-b-clip-prompt.test.ts`

Expected: FAIL。系統提示仍寫 dual-keyframe，user prompt 仍寫 `last_frame`。

- [ ] **Step 3: 改兩個 prompt 函式**

`run-phase-b.ts` 的 diagram 分支開頭這句：

```ts
Each clip is dual-keyframe image-to-video: the approved START image is attached as the first frame and the approved END image is attached as the last frame. Describe ONLY the motion that smoothly transitions each element from the first frame to the last frame. Never call those stills a reference image.
```

換成：

```ts
Each clip is image-to-video from the approved START image only. That image is attached as the first frame. There is no end image. endScene is the written landing the motion reaches; write that landing into the motion, and do not treat it as a frame the model can see. Never call the start still a reference image.
```

`phase-b-clip-prompt.ts` 的 diagram `phaseBLetteringLock` 回傳改成：

```ts
return "On-canvas lettering: keep the concise 「」 labels and optional short beat headline sharp, spelled cleanly, and anchored as drawn on the first frame. There is no last-frame image. If endScene names a different short label, change it by one in-place flip or tear. Do not morph, scramble, or invent extra full-sentence text or captions. This is in-world board lettering, not a subtitle.";
```

`clipPhaseBUserPrompt` 摺紙 OUTPUT CONTRACT 裡的 `Both first_frame (Start) and last_frame (End) are attached. ... from Start to End` 改成：

```ts
"OUTPUT CONTRACT: Write ONE concise visual-only motion prompt (target 350–800 characters, max 1,000 characters). Only the first frame is attached. There is no last frame. Lead with one short steady-diorama-camera & silent-figurine clause, then describe how each 3D folded cardstock prop, mechanism, label, and optional figurine hand/gaze moves from the attached start still toward the written endScene across the clip duration. Do not include Voice lock, Spoken audio, wardrobe, lighting, or negative checklists."
```

白板／剪紙那條 OUTPUT CONTRACT 同樣改成 `Only the first frame is attached. There is no last frame.`，動作改成 `from the attached start still toward the written endScene`。鏡頭句維持 `stationary camera & silent-character`。

- [ ] **Step 4: 再跑 phase-b-clip-prompt.test.ts**

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/service/director/run-phase-b.ts src/service/director/phase-b-clip-prompt.ts src/service/director/phase-b-clip-prompt.test.ts
git commit -m "$(cat <<'EOF'
feat(director): tell explainer Phase B there is no end still

EOF
)"
```

---

### Task 4: 管理預覽用的 video lock

**Files:**
- Modify: `src/service/director/skill-rules.ts`（`SNAP_MOTION`、`SMOOTH_MOTION`、`cartoonNarratorVideoLock`）
- Test: `src/service/director/skill-rules.test.ts`
- Test: `src/service/director/explainer-family.test.ts`

**Interfaces:**
- Consumes: `cartoonNarratorVideoLock(skillSlug, options)`。摺紙選項含 `backgroundId`。
- Produces: 三個 canvas 的 lock 都含 `There is no last-frame image`。摺紙 teal 底色鎖留著。Hailuo 仍只收 Phase B 寫出的 `clip.prompt`，這個函式不在送片時再貼一次。

- [ ] **Step 1: 改 video lock 測試**

`skill-rules.test.ts` 裡兩處：

```ts
assert.match(smoothVideo, /attached FIRST frame \(State A\) to the attached LAST frame \(State B\)/);
assert.match(video, /attached FIRST frame \(State A\) to the attached LAST frame \(State B\)/);
assert.doesNotMatch(video, /There is no end image/);
```

改成：

```ts
assert.match(smoothVideo, /There is no last-frame image/);
assert.match(smoothVideo, /written State B/);
assert.match(video, /There is no last-frame image/);
assert.match(video, /written State B/);
```

`slide briskly`、`flip briskly`、加速再減速的斷言留著。

`explainer-family.test.ts` 的 `tealVideo` 除了 teal 卡紙，再加上：

```ts
assert.match(tealVideo, /There is no last-frame image/);
```

- [ ] **Step 2: 跑測試，確認失敗**

Run: `npx tsx --test src/service/director/skill-rules.test.ts src/service/director/explainer-family.test.ts`

Expected: FAIL。lock 仍寫 attached LAST frame。

- [ ] **Step 3: 改 skill-rules.ts 的三個 canvas**

`SNAP_MOTION` 第一句從 `Interpolate smoothly and decisively from the attached FIRST frame (State A) to the attached LAST frame (State B)` 改成：

`Animate from the attached FIRST frame (State A) toward the written State B landing. There is no last-frame image.`

後面的 anticipation、滑入、摺開、撕開、畫出、翻轉、SCAFFOLD LOCK 留著。句中 `If the title words differ` 改成 `If the written State B title words differ from the first frame`。

`SMOOTH_MOTION` 第一句從 `Interpolate smoothly and continuously from the attached FIRST frame (State A) to the attached LAST frame (State B)` 改成同一句 `Animate from the attached FIRST frame (State A) toward the written State B landing. There is no last-frame image.`

`decelerate into a clean settle with fluid continuity on the exact LAST frame` 改成 `decelerate into a clean settle on the written State B`。

`Keep existing 「」 labels sharp while State A transitions into State B's 「」 labels from the LAST frame` 改成 `Keep existing 「」 labels sharp while the first frame moves toward the written State B labels`。

白板／剪紙的 `voice` 字串裡 `as State A in the first frame transforms into State B in the last frame` 改成 `as the first frame moves toward the written State B. There is no last-frame image`。

摺紙回傳從 `matching both attached keyframes (first_frame State A -> last_frame State B)` 改成：

```ts
return `Silent visual-only 3D papercraft diorama video (off-screen narrator voiceover is muxed externally): only the first frame is attached. There is no last-frame image. Keep the diorama camera steady on the set. ${dioramaChar} ${backdrop} Smoothly animate each folded 300gsm cardstock mechanism, prop, and 「」 label from the first frame toward the written State B landing while keeping cardstock geometry rigid (never morph, melt, or dissolve).`;
```

- [ ] **Step 4: 再跑 Step 2 的測試**

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/service/director/skill-rules.ts src/service/director/skill-rules.test.ts src/service/director/explainer-family.test.ts
git commit -m "$(cat <<'EOF'
feat(director): describe explainer motion without a last frame

EOF
)"
```

---

### Task 5: 編輯器收起重畫結尾

**Files:**
- Modify: `src/service/opencut/messages.ts`（`ScroVideoSeedClip`）
- Modify: `src/service/scro-video/timeline-seed.ts`（`buildSeedClips` 與 `diffScroSeedClips`）
- Modify: `src/opencut/embed/scro-video-ai-entry.tsx`
- Test: `src/service/scro-video/timeline-seed.test.ts`

**Interfaces:**
- Consumes: `clipDrawsNoEndStill(project, clipNumber): boolean`
- Produces: `ScroVideoSeedClip.singleFrame?: boolean`。`true` 時 inspector 不渲染尾幀按鈕。

- [ ] **Step 1: 先寫失敗測試**

在 `timeline-seed.test.ts` 現有的 paper-cutout seed 斷言後面加：

```ts
assert.equal(seeded[0]?.singleFrame, true);
assert.equal(seeded[1]?.singleFrame, true);
```

再加一個 talking-head 對照。用檔案裡已有的 `sampleProject` 形狀，把 `skillSlug` 設成 `talking-head-director`，兩段 clip。中間那段因為 `end-is-next-start` 是 `singleFrame: true`；最後一段要畫自己的尾幀，是 `singleFrame: false`。

```ts
const talking = buildSeedClips({
  ...sampleProject,
  skillSlug: "talking-head-director",
  phaseA: {
    clips: [
      { clipNumber: 1, durationSeconds: 5 },
      { clipNumber: 2, durationSeconds: 6 },
    ],
  },
});
assert.equal(talking[0]?.singleFrame, true);
assert.equal(talking[1]?.singleFrame, false);
```

`sampleProject` 已是 `ScroVideoSource`，展開後只要覆寫 `skillSlug` 與 `phaseA`。

- [ ] **Step 2: 跑測試，確認失敗**

Run: `npx tsx --test src/service/scro-video/timeline-seed.test.ts`

Expected: FAIL。`singleFrame` 是 `undefined`。

- [ ] **Step 3: 寫入 singleFrame，並讓 inspector 使用它**

`messages.ts` 的 `ScroVideoSeedClip` 加上：

```ts
/** This clip draws no end still of its own. The inspector hides Redraw end. */
singleFrame?: boolean;
```

`timeline-seed.ts` 的 `buildSeedClips` return 加上：

```ts
singleFrame: clipDrawsNoEndStill(project, view.clipNumber),
```

`clipDrawsNoEndStill` 從 `@/service/director/steady-stills` import（檔案裡若已有 `clipEndIsNextStart` 的 import，加在同一個 import）。

`diffScroSeedClips` 的比較加上 `before.singleFrame !== clip.singleFrame`。

`scro-video-ai-entry.tsx`：

```tsx
const singleFrameOnly = clip.inspectorKind === "talking-head" || clip.singleFrame === true;
```

尾幀按鈕的 `{!singleFrameOnly ? (` 維持原樣。Talking-head 本來就以 `inspectorKind` 收起尾幀，這行只是讓 Explainer 的 `singleFrame` 走同一條。

- [ ] **Step 4: 再跑 timeline-seed.test.ts**

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/service/opencut/messages.ts src/service/scro-video/timeline-seed.ts src/service/scro-video/timeline-seed.test.ts src/opencut/embed/scro-video-ai-entry.tsx
git commit -m "$(cat <<'EOF'
feat(editor): hide explainer redraw-end when the clip has no end still

EOF
)"
```

---

### Task 6: 模型文件

**Files:**
- Modify: `pipeline-models.md`（旁白解說列，以及 Explainer 畫面精簡字卡那一列）
- Modify: `AGENTS.md`（Images／Videos 裡白板、剪紙、摺紙那句）

**Interfaces:**
- Consumes: Task 1–3 的行為。首幀模型仍是 Google AI Studio `gemini-nano-banana-2.1`。影片仍是 OpenRouter `minimax/hailuo-3`。
- Produces: 兩份文件不再寫 Explainer 的 `start-end` 雙幀，也不再寫終點圖用 `gemini-3.8-flash` 寫 900 字提示詞。

- [ ] **Step 1: 確認舊句子還在**

Run: `rg -n "start-end dual keyframes|gemini-3.8-flash reads that clip's start image" AGENTS.md pipeline-models.md`

Expected: 兩份檔案都有 Explainer 雙關鍵幀／終點圖提示詞的句子。

- [ ] **Step 2: 改 AGENTS.md 那一句**

把白板、剪紙、摺紙從 `start-end` 雙關鍵幀到 `MiniMax H3 interpolates ... two frames` 的那一段，換成：

`Whiteboard, paper-cutout, and papercraft-diorama explainers use start-only keyframes. Phase A still writes startScene and endScene. Only the start still is drawn with Nano Banana 2.1 (gemini-nano-banana-2.1 on Google AI Studio), with concise 「」 keyword labels/headlines only (never full voiceover transcripts on canvas). MiniMax H3 on OpenRouter minimax/hailuo-3 receives that start frame only. Phase B writes the motion from motionCamera so the picture moves from the start still toward the written endScene on a locked camera, keeping those labels sharp.`

同一段後面「畫面字不能關」的句子留著。Talking-head、Simple、Story 的句子不要改。

- [ ] **Step 3: 改 pipeline-models.md 兩處**

旁白解說列裡 Explainer 系列的 `start-end` 雙關鍵幀與「MiniMax H3 在首尾幀間做實體過渡」改成：`start-only`。只畫首幀，Google AI Studio `gemini-nano-banana-2.1`。`minimax/hailuo-3` 只收首幀，Phase B 依 `motionCamera` 演向文字 `endScene`。`usesSteadyStills = true` 留著。

「Explainer 畫面精簡字卡與物理動效」那一列：刪掉終點圖兩步（`gemini-3.8-flash` 900 字、Nano Banana 畫終點圖）。改成只畫 `start`（State A）的精簡「」標籤；動態只收 `first_frame`，演向文字 State B。代碼欄拿掉 `writeEndFramePromptFromStart` 對這三個導演的描述。其他導演的 Seedream 與畫面字規則留著。

- [ ] **Step 4: 再確認舊句子不見、新句子在**

Run: `rg -n "start-only keyframes|written endScene" AGENTS.md pipeline-models.md`

Expected: 兩份檔案都有 `start-only` 與 `written endScene`。

Run: `rg -n "gemini-3.8-flash reads that clip's start image|start-end dual keyframes" AGENTS.md pipeline-models.md`

Expected: 沒有匹配。`gemini-3.8-flash` 若仍出現在 Phase A 分鏡列，那是分鏡模型，留著。

- [ ] **Step 5: Commit**

```bash
git add pipeline-models.md AGENTS.md
git commit -m "$(cat <<'EOF'
docs: record explainer clips as start-still plus planned motion

EOF
)"
```

---

## Self-Review

- Spec「只畫首幀、dualBeat 保留」：Task 1。
- Spec「Phase B 寫向 written endScene、三個導演各自的物理」：Task 2 與 Task 3。
- Spec「字卡以首幀為準」：Task 3 的 `phaseBLetteringLock`。
- Spec「管理預覽 lock 與 Phase B 一致，且不重複貼上 Hailuo」：Task 4。送片仍用 `clip.prompt`，Task 4 不改 `pipeline.ts`。
- Spec「已排隊尾幀不取消、不退款」：沒有取消或退款任務。
- Spec「編輯器收起重畫結尾」：Task 5。
- Spec「pipeline-models.md 與 AGENTS.md」：Task 6。
- 其他導演的 `start-end` / `end-is-next-start`：Task 1 只改三個 slug 的斷言，`one-take` 與 talking-head 測試留著。
