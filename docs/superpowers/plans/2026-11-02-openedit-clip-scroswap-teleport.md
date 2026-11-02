# OpenEdit Clip Scro Swap & Teleport Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 OpenEdit（OpenCut 內嵌剪輯器）的右側分鏡屬性面板中，讓使用者對已完成影片的分鏡片段一鍵開啟精簡視窗並套用 Scro Swap 換角或 Teleport 換場，完成後自動替換該分鏡成片與時間軸片段。

**Architecture:** 在 `JutsuJob` 與 `TeleportJob` 新增可選的 `targetVideoId`、`targetClipNumber`、`previousClipVideoUrl`，並讓 `TeleportJob` 支援專案的 `aspectRatio`（預設仍為 `"9:16"`）。當剪輯器精簡視窗送出時，Server Action 建立背景作業並將該分鏡 `ProjectClip` 設為 `status: "in_progress"` 與新的 `submittedAt`；作業完成時由 `settleTargetClipFromEngineJob` 將新 MP4 寫回該分鏡並觸發 OpenCut `scro-clip-updated` 原地替換時間軸片段；失敗時若存在 `previousClipVideoUrl` 則自動還原原影片。

**Tech Stack:** Next.js App Router、Server Actions（`"use server"`）、MongoDB、OpenCut embed bridge、Node test runner（`npx tsx --test`）。

**Spec:** `docs/superpowers/specs/2026-11-02-openedit-clip-scroswap-teleport-design.md`

## Global Constraints

- 只在分鏡 `stage === "video_ready"` 且有非空 `videoUrl` 時顯示並允許執行 Scro Swap 與 Teleport。
- 不支援尚未產生影片的分鏡，也不支援沒有 `scroClipNumber` 的一般上傳素材。
- 精簡視窗鎖定整段分鏡：`sectionStart = 0`、`sectionLength = Math.min(15, Math.max(2, Math.round(durationSeconds)))`、`keepSourceAudio = true`、`applyColorFix = true`。
- 不扣 credits。
- 進行中的目標分鏡 `ProjectClip.status` 必須設為 `"in_progress"`（不可設為 `"queued"`，避免被 `orphanQueuedClips` 誤判為孤兒），並更新 `submittedAt` 以保護不受舊 `generation_jobs` 覆蓋。
- 背景作業失敗或逾時時，若 `previousClipVideoUrl` 存在，必須還原該分鏡為 `status: "completed"` 與原本的 `previousClipVideoUrl`，同時記錄 `error`。
- 獨立 `/app/teleport` 建立時 `aspectRatio` 預設 `"9:16"`；從 OpenEdit 分鏡套用時傳入該專案的 `project.aspectRatio`。
- 測試與驗收嚴禁呼叫 Seedream、MiniMax、Hailuo、fal 或 Higgsfield。
- 新 UI 元件各自獨立檔案，有 `useEffect` / `useState` 頂部加 `"use client"`；只用 Server Actions，不加新 REST API。
- 同一實作回合同步更新 `pipeline-models.md` 與 `AGENTS.md`。

## File Map

| File | Responsibility |
| --- | --- |
| `src/service/opencut/messages.ts` | 擴充 `ScroOpenAiMessage["kind"]` 支援 `"scro-swap" \| "teleport"` |
| `src/service/opencut/messages.test.ts` | 驗證橋接訊息與 `canApplyClipJutsu` |
| `src/opencut/embed/scro-video-actions.ts` | `requestScroOpenAi` 支援 `"scro-swap" \| "teleport"` |
| `src/opencut/i18n/use-opencut-i18n.ts` | `inspector.scroSwap`、`inspector.teleport`、`inspector.relocateOrSwap` 多語文案 |
| `src/opencut/embed/scro-video-jutsu-actions.tsx` | 屬性面板上的 Scro Swap / Teleport 雙按鈕與純判斷函式 `canApplyClipJutsu` |
| `src/opencut/embed/scro-video-properties.tsx` | 在 `ScroVideoAiEntry` 下方渲染 `ScroVideoJutsuActions` |
| `src/model/jutsu-job.ts` | `JutsuJob`、`PublicJutsuJob`、`toPublicJutsuJob` 加入 `targetVideoId`、`targetClipNumber`、`previousClipVideoUrl` |
| `src/model/teleport-job.ts` | `TeleportJob`、`PublicTeleportJob`、`toPublicTeleportJob` 加入 `targetVideoId`、`targetClipNumber`、`previousClipVideoUrl` |
| `src/service/teleport/start-input.ts` | `TeleportStartInput` 與 `normalizeTeleportStart` 支援 `aspectRatio?: AspectRatio`（預設 `"9:16"`）與目標分鏡欄位 |
| `src/service/teleport/prompts.ts` | `buildTeleportScenePlatePrompt(scenePrompt, aspectRatio = "9:16")` |
| `src/service/teleport/teleport.test.ts` | 測試 `aspectRatio` 傳遞與目標欄位轉換 |
| `src/service/opencut/clip-jutsu-settle.ts` | 將 Scro Swap / Teleport 完成或失敗結果寫回 `videos.clips` 的共用服務與純計算函式 |
| `src/service/opencut/clip-jutsu.test.ts` | 測試目標分鏡寫回、失敗還原與啟動參數計算 |
| `src/service/jutsu/pipeline.ts` | `StartScroSwapInput` 支援目標分鏡欄位；完成／失敗／逾時時呼叫 `settleTargetClipFromEngineJob` |
| `src/service/teleport/pipeline.ts` | `seedreamWebp`、H3、Hailuo 使用 `job.aspectRatio`；完成／失敗／逾時時呼叫 `settleTargetClipFromEngineJob` |
| `src/service/opencut/clip-jutsu.ts` | `applyClipScroSwap` 與 `applyClipTeleport` 伺服器啟動邏輯 |
| `src/presentation/actions/opencut-clip-jutsu.ts` | `"use server"` 包裝：`applyClipScroSwapAction`、`applyClipTeleportAction` |
| `src/service/generation/actions.ts` | `refreshGenerationAction` 一併推進 `advanceJutsuJobs` 與 `advanceTeleportJobs` |
| `src/service/generation/task-list.ts` | `scroSwapTask`、`teleportTask` 與 `listTasks` 支援 `targetVideoId` |
| `src/presentation/components/app/projects/new/opencut-clip-scro-swap-dialog.tsx` | 剪輯器專用 Scro Swap 精簡視窗 |
| `src/presentation/components/app/projects/new/opencut-clip-teleport-dialog.tsx` | 剪輯器專用 Teleport 精簡視窗 |
| `src/presentation/components/app/projects/new/opencut-scro-ai-shell.tsx` | 管理並渲染 `OpenCutClipScroSwapDialog` 與 `OpenCutClipTeleportDialog` |
| `src/presentation/components/app/projects/new/opencut-direct-desk.tsx` | 處理 `scro-open-ai` 的 `"scro-swap"` 與 `"teleport"`，並把 `characters` 傳入 `OpenCutScroAiShell` |
| `pipeline-models.md` | 同步記錄 OpenEdit 分鏡套用 Scro Swap 與 Teleport |
| `AGENTS.md` | 同步記錄 OpenEdit 分鏡套用 Scro Swap 與 Teleport |

---

### Task 1: OpenCut 屬性面板按鈕與橋接訊息

**Files:**
- Modify: `src/service/opencut/messages.ts:135-145`
- Modify: `src/opencut/embed/scro-video-actions.ts:55-78`
- Modify: `src/opencut/i18n/use-opencut-i18n.ts:440-492`
- Create: `src/opencut/embed/scro-video-jutsu-actions.tsx`
- Modify: `src/opencut/embed/scro-video-properties.tsx:1-10,92-98`
- Test: `src/service/opencut/messages.test.ts`

**Interfaces:**
- Consumes: `ScroVideoSeedClip` from `@/opencut/embed/scro-video-types`; `requestScroOpenAi` from `@/opencut/embed/scro-video-actions`
- Produces:
  - `ScroOpenAiMessage["kind"] = "scene-chat" | "frame-edit" | "scro-swap" | "teleport"`
  - `export function canApplyClipJutsu(clip: Pick<ScroVideoSeedClip, "stage" | "videoUrl"> | null | undefined): boolean`
  - `export function ScroVideoJutsuActions(props: { videoId: string; clip: ScroVideoSeedClip }): JSX.Element | null`

- [ ] **Step 1: Write the failing test**

Modify `src/service/opencut/messages.test.ts` to test `canApplyClipJutsu` and `scro-open-ai` messages:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canApplyClipJutsu } from "@/opencut/embed/scro-video-jutsu-actions";
import { createScroOpenCutHost } from "@/service/opencut/host-channel";
import { isEditorToHostMessage } from "@/service/opencut/messages";
```

And append inside `describe("opencut bridge messages", ...)`:

```ts
  it("enables clip Scro Swap and Teleport only when clip stage is video_ready with a videoUrl", () => {
    assert.equal(canApplyClipJutsu(null), false);
    assert.equal(
      canApplyClipJutsu({ stage: "frames_ready", videoUrl: "https://blob/c1.mp4" }),
      false,
    );
    assert.equal(
      canApplyClipJutsu({ stage: "video_generating", videoUrl: "https://blob/c1.mp4" }),
      false,
    );
    assert.equal(canApplyClipJutsu({ stage: "video_ready", videoUrl: "" }), false);
    assert.equal(
      canApplyClipJutsu({ stage: "video_ready", videoUrl: "https://blob/c1.mp4" }),
      true,
    );
  });

  it("delivers scro-open-ai messages for scro-swap and teleport", () => {
    const host = createScroOpenCutHost();
    const received: unknown[] = [];
    const unsub = host.subscribeScro((msg) => received.push(msg));

    host.postToScro({
      type: "scro-open-ai",
      videoId: "vid-1",
      clipNumber: 2,
      kind: "scro-swap",
    });
    host.postToScro({
      type: "scro-open-ai",
      videoId: "vid-1",
      clipNumber: 2,
      kind: "teleport",
    });

    assert.equal(received.length, 2);
    unsub();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/opencut/messages.test.ts`
Expected: FAIL with module `@/opencut/embed/scro-video-jutsu-actions` not found.

- [ ] **Step 3: Implement bridge types, i18n, and `ScroVideoJutsuActions`**

Update `ScroOpenAiMessage` in `src/service/opencut/messages.ts`:

```ts
/** Editor → host: open FrameEdit, SceneChat, Scro Swap, or Teleport on the page shell. */
export type ScroOpenAiMessage = {
  type: "scro-open-ai";
  videoId: string;
  clipNumber: number;
  kind: "scene-chat" | "frame-edit" | "scro-swap" | "teleport";
  position?: FramePosition;
};
```

Update `requestScroOpenAi` in `src/opencut/embed/scro-video-actions.ts`:

```ts
/** Ask the Scro host to open FrameEdit, SceneChat, Scro Swap, or Teleport. */
export function requestScroOpenAi({
	videoId,
	clipNumber,
	kind,
	position,
}: {
	videoId: string;
	clipNumber: number;
	kind: "scene-chat" | "frame-edit" | "scro-swap" | "teleport";
	position?: FramePosition;
}) {
	const origin = scroEmbedParentOrigin() ?? window.location.origin;
	sendToScro(
		{
			type: "scro-open-ai",
			videoId,
			clipNumber,
			kind,
			position,
		},
		origin,
	);
}
```

In `src/opencut/i18n/use-opencut-i18n.ts`, inside `inspector: { ... }`, add before `stageLabels`:

```ts
			relocateOrSwap: pick({
				en: "Character & Scene",
				zhHant: "換角與換場",
				zhHans: "换角与换场",
				ja: "キャラ・背景変更",
				ko: "캐릭터 및 배경 변경",
			}),
			scroSwap: pick({
				en: "Scro Swap",
				zhHant: "Scro Swap 換角",
				zhHans: "Scro Swap 换角",
				ja: "Scro Swap",
				ko: "Scro Swap",
			}),
			teleport: pick({
				en: "Teleport",
				zhHant: "Teleport 換場",
				zhHans: "Teleport 换场",
				ja: "Teleport",
				ko: "Teleport",
			}),
```

Create `src/opencut/embed/scro-video-jutsu-actions.tsx`:

```tsx
"use client";

import { Button } from "@/opencut/components/ui/button";
import { requestScroOpenAi } from "@/opencut/embed/scro-video-actions";
import type { ScroVideoSeedClip } from "@/opencut/embed/scro-video-types";
import { useOpencutI18n } from "@/opencut/i18n/use-opencut-i18n";

/** True only when the storyboard clip has a finished video URL ready to transform. */
export function canApplyClipJutsu(
	clip: Pick<ScroVideoSeedClip, "stage" | "videoUrl"> | null | undefined,
): boolean {
	if (!clip) return false;
	return clip.stage === "video_ready" && Boolean(clip.videoUrl?.trim());
}

/** Inspector buttons to open Scro Swap or Teleport for a completed storyboard clip. */
export function ScroVideoJutsuActions({
	videoId,
	clip,
}: {
	videoId: string;
	clip: ScroVideoSeedClip;
}) {
	const { oc } = useOpencutI18n();
	if (!canApplyClipJutsu(clip)) return null;

	return (
		<div className="space-y-1.5">
			<div className="text-muted-foreground text-[0.7rem] font-medium tracking-wide uppercase">
				{oc.inspector.relocateOrSwap}
			</div>
			<div className="grid grid-cols-2 gap-2">
				<Button
					type="button"
					variant="secondary"
					size="sm"
					className="w-full text-xs"
					onClick={() =>
						requestScroOpenAi({
							videoId,
							clipNumber: clip.clipNumber,
							kind: "scro-swap",
						})
					}
				>
					{oc.inspector.scroSwap}
				</Button>
				<Button
					type="button"
					variant="secondary"
					size="sm"
					className="w-full text-xs"
					onClick={() =>
						requestScroOpenAi({
							videoId,
							clipNumber: clip.clipNumber,
							kind: "teleport",
						})
					}
				>
					{oc.inspector.teleport}
				</Button>
			</div>
		</div>
	);
}
```

In `src/opencut/embed/scro-video-properties.tsx`, import `ScroVideoJutsuActions` and render it right under `<ScroVideoAiEntry videoId={store.videoId} clip={clip} />`:

```tsx
import { ScroVideoJutsuActions } from "@/opencut/embed/scro-video-jutsu-actions";
```

```tsx
					<div className="space-y-3 px-3.5 py-3">
						<ScroVideoPrimaryActions videoId={store.videoId} clip={clip} />
						<ScroVideoAiEntry videoId={store.videoId} clip={clip} />
						<ScroVideoJutsuActions videoId={store.videoId} clip={clip} />
					</div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/opencut/messages.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/service/opencut/messages.ts src/service/opencut/messages.test.ts src/opencut/embed/scro-video-actions.ts src/opencut/i18n/use-opencut-i18n.ts src/opencut/embed/scro-video-jutsu-actions.tsx src/opencut/embed/scro-video-properties.tsx
git commit -m "feat: add Scro Swap and Teleport buttons to OpenCut clip inspector"
```

---

### Task 2: 作業模型擴充、Teleport 比例支援與目標分鏡寫回 helper

**Files:**
- Modify: `src/model/jutsu-job.ts:95-190`
- Modify: `src/model/teleport-job.ts:1-85`
- Modify: `src/service/teleport/start-input.ts:1-35`
- Modify: `src/service/teleport/prompts.ts:12-20`
- Create: `src/service/opencut/clip-jutsu-settle.ts`
- Test: `src/service/teleport/teleport.test.ts`
- Test: `src/service/opencut/clip-jutsu.test.ts`

**Interfaces:**
- Consumes: `videosCollection` from `@/dao`; `nextProjectStatus` from `@/service/higgsfield/reconcile`; `queueReelIfReady` from `@/service/reel/enqueue`; `AspectRatio`, `ProjectClip` from `@/model/project`
- Produces:
  - `JutsuJob` & `TeleportJob` optional fields: `targetVideoId?: ObjectId; targetClipNumber?: number; previousClipVideoUrl?: string`
  - `PublicJutsuJob` & `PublicTeleportJob` optional fields: `targetVideoId?: string; targetClipNumber?: number`
  - `TeleportStartInput` optional fields: `aspectRatio?: AspectRatio; targetVideoId?: string; targetClipNumber?: number; previousClipVideoUrl?: string`
  - `buildTeleportScenePlatePrompt(scenePrompt: string, aspectRatio?: AspectRatio): string`
  - `export function applyCompletedEngineClip(clips: ProjectClip[], clipNumber: number, outputVideoUrl: string): ProjectClip[]`
  - `export function applyFailedEngineClip(clips: ProjectClip[], clipNumber: number, error: string, previousClipVideoUrl?: string): ProjectClip[]`
  - `export async function settleTargetClipFromEngineJob(input: { targetVideoId?: ObjectId; targetClipNumber?: number; previousClipVideoUrl?: string; status: "completed" | "failed"; outputVideoUrl?: string; error?: string }): Promise<boolean>`

- [ ] **Step 1: Write the failing tests**

Append to `src/service/teleport/teleport.test.ts`:

```ts
test("normalizeTeleportStart defaults aspectRatio to 9:16 and preserves custom aspectRatio", () => {
  const def = normalizeTeleportStart({
    sourceVideoUrl: "https://example.public.blob.vercel-storage.com/a.mp4",
    scenePrompt: "snowy street",
  });
  assert.equal(def.ok && def.aspectRatio, "9:16");

  const wide = normalizeTeleportStart({
    sourceVideoUrl: "https://example.public.blob.vercel-storage.com/a.mp4",
    scenePrompt: "snowy street",
    aspectRatio: "16:9",
    targetVideoId: "507f1f77bcf86cd799439011",
    targetClipNumber: 3,
    previousClipVideoUrl: "https://example.public.blob.vercel-storage.com/old.mp4",
  });
  assert.equal(wide.ok && wide.aspectRatio, "16:9");
  assert.equal(wide.ok && wide.targetClipNumber, 3);
  assert.equal(buildTeleportScenePlatePrompt("snowy street", "16:9").includes("16:9"), true);
});
```

Create `src/service/opencut/clip-jutsu.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import type { ProjectClip } from "@/model/project";
import {
  applyCompletedEngineClip,
  applyFailedEngineClip,
} from "@/service/opencut/clip-jutsu-settle";

test("applyCompletedEngineClip replaces the target clip videoUrl and clears error", () => {
  const initial: ProjectClip[] = [
    {
      clipNumber: 1,
      durationSeconds: 6,
      prompt: "p1",
      status: "in_progress",
      outputUrl: "https://blob/old-1.mp4",
      blobUrl: "https://blob/old-1.mp4",
      error: "old err",
      unsent: true,
    },
    {
      clipNumber: 2,
      durationSeconds: 5,
      prompt: "p2",
      status: "completed",
      outputUrl: "https://blob/c2.mp4",
      blobUrl: "https://blob/c2.mp4",
    },
  ];

  const updated = applyCompletedEngineClip(initial, 1, "https://blob/new-1.mp4");
  assert.equal(updated[0]?.status, "completed");
  assert.equal(updated[0]?.blobUrl, "https://blob/new-1.mp4");
  assert.equal(updated[0]?.outputUrl, "https://blob/new-1.mp4");
  assert.equal(updated[0]?.error, undefined);
  assert.equal(updated[0]?.unsent, false);
  assert.equal(updated[1]?.blobUrl, "https://blob/c2.mp4");
});

test("applyFailedEngineClip restores previousClipVideoUrl when present so the clip does not lose its video", () => {
  const initial: ProjectClip[] = [
    {
      clipNumber: 1,
      durationSeconds: 6,
      prompt: "p1",
      status: "in_progress",
      outputUrl: "https://blob/old-1.mp4",
      blobUrl: "https://blob/old-1.mp4",
    },
  ];

  const restored = applyFailedEngineClip(
    initial,
    1,
    "Teleport 渲染失敗",
    "https://blob/old-1.mp4",
  );
  assert.equal(restored[0]?.status, "completed");
  assert.equal(restored[0]?.blobUrl, "https://blob/old-1.mp4");
  assert.equal(restored[0]?.outputUrl, "https://blob/old-1.mp4");
  assert.equal(restored[0]?.error, "Teleport 渲染失敗");

  const failedNoPrev = applyFailedEngineClip(initial, 1, "Teleport 渲染失敗");
  assert.equal(failedNoPrev[0]?.status, "failed");
  assert.equal(failedNoPrev[0]?.error, "Teleport 渲染失敗");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx tsx --test src/service/teleport/teleport.test.ts src/service/opencut/clip-jutsu.test.ts`
Expected: FAIL with missing module `@/service/opencut/clip-jutsu-settle` and missing `aspectRatio` property.

- [ ] **Step 3: Implement model fields, `normalizeTeleportStart`, and `clip-jutsu-settle.ts`**

In `src/model/jutsu-job.ts`:
- Add to `JutsuJob`:
```ts
  // Optional target storyboard clip when started from the OpenCut editor.
  targetVideoId?: ObjectId;
  targetClipNumber?: number;
  previousClipVideoUrl?: string;
```
- Add to `PublicJutsuJob`:
```ts
  targetVideoId?: string;
  targetClipNumber?: number;
```
- In `toPublicJutsuJob`:
```ts
    targetVideoId: doc.targetVideoId?.toHexString(),
    targetClipNumber: doc.targetClipNumber,
```

In `src/model/teleport-job.ts`:
- Add to `TeleportJob`:
```ts
  targetVideoId?: ObjectId;
  targetClipNumber?: number;
  previousClipVideoUrl?: string;
```
- Add to `PublicTeleportJob`:
```ts
  targetVideoId?: string;
  targetClipNumber?: number;
```
- In `toPublicTeleportJob`:
```ts
    targetVideoId: doc.targetVideoId?.toHexString(),
    targetClipNumber: doc.targetClipNumber,
```

Update `src/service/teleport/start-input.ts`:

```ts
import type { AspectRatio } from "@/model/project";
import { isBrandAssetUrl } from "@/service/video-edit/edit-state";

export type TeleportStartInput = {
  sourceVideoUrl: string;
  aspectRatio?: AspectRatio;
  sectionStart?: number;
  sectionLength?: number;
  sceneImageUrl?: string;
  scenePrompt?: string;
  keepSourceAudio?: boolean;
  applyColorFix?: boolean;
  targetVideoId?: string;
  targetClipNumber?: number;
  previousClipVideoUrl?: string;
};

const VALID_RATIOS = new Set<AspectRatio>(["9:16", "16:9", "1:1"]);

export function normalizeTeleportStart(input: TeleportStartInput) {
  const sourceVideoUrl = input.sourceVideoUrl.trim();
  const sceneImageUrl = input.sceneImageUrl?.trim() || undefined;
  const scenePrompt = input.scenePrompt?.trim() || undefined;
  if (!sceneImageUrl && !scenePrompt) {
    return { ok: false as const, error: "請上傳場景照或寫下場景" };
  }
  const aspectRatio: AspectRatio =
    input.aspectRatio && VALID_RATIOS.has(input.aspectRatio) ? input.aspectRatio : "9:16";
  const sectionStart = Math.max(0, Number(input.sectionStart) || 0);
  const sectionLength = Math.min(15, Math.max(2, Number(input.sectionLength) || 6));
  const targetVideoId = input.targetVideoId?.trim() || undefined;
  const targetClipNumber =
    typeof input.targetClipNumber === "number" && Number.isInteger(input.targetClipNumber) && input.targetClipNumber > 0
      ? input.targetClipNumber
      : undefined;
  const previousClipVideoUrl = input.previousClipVideoUrl?.trim() || undefined;
  return {
    ok: true as const,
    sourceVideoUrl,
    aspectRatio,
    sectionStart,
    sectionLength,
    sceneImageUrl,
    scenePrompt,
    keepSourceAudio: input.keepSourceAudio !== false,
    applyColorFix: input.applyColorFix !== false,
    targetVideoId,
    targetClipNumber,
    previousClipVideoUrl,
  };
}
```

Update `buildTeleportScenePlatePrompt` in `src/service/teleport/prompts.ts`:

```ts
import type { AspectRatio } from "@/model/project";
```
```ts
export function buildTeleportScenePlatePrompt(
  scenePrompt: string,
  aspectRatio: AspectRatio = "9:16",
): string {
  return `Create a photoreal ${aspectRatio} scene still with no people, no faces, no bodies, and no mannequins. Location: ${scenePrompt.trim()}. The frame is empty of humans. Natural perspective and lighting.`;
}
```

Create `src/service/opencut/clip-jutsu-settle.ts`:

```ts
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { videosCollection } from "@/dao";
import type { ProjectClip } from "@/model/project";
import { folderVideoPath } from "@/service/folder-video-path";
import { nextProjectStatus } from "@/service/higgsfield/reconcile";
import { queueReelIfReady } from "@/service/reel/enqueue";

/** Pure helper: replace the target clip's video URL when Scro Swap or Teleport completes. */
export function applyCompletedEngineClip(
  clips: ProjectClip[],
  clipNumber: number,
  outputVideoUrl: string,
): ProjectClip[] {
  return clips.map((clip) =>
    clip.clipNumber === clipNumber
      ? {
          ...clip,
          status: "completed" as const,
          blobUrl: outputVideoUrl,
          outputUrl: outputVideoUrl,
          error: undefined,
          unsent: false,
        }
      : clip,
  );
}

/** Pure helper: restore the previous video URL on failure when available so the clip stays playable. */
export function applyFailedEngineClip(
  clips: ProjectClip[],
  clipNumber: number,
  error: string,
  previousClipVideoUrl?: string,
): ProjectClip[] {
  const prev = previousClipVideoUrl?.trim();
  return clips.map((clip) => {
    if (clip.clipNumber !== clipNumber) return clip;
    if (prev) {
      return {
        ...clip,
        status: "completed" as const,
        blobUrl: prev,
        outputUrl: prev,
        error,
        unsent: false,
      };
    }
    return {
      ...clip,
      status: "failed" as const,
      error,
      unsent: false,
    };
  });
}

/** Write completed or failed Scro Swap / Teleport output back to the originating storyboard clip. */
export async function settleTargetClipFromEngineJob(input: {
  targetVideoId?: ObjectId;
  targetClipNumber?: number;
  previousClipVideoUrl?: string;
  status: "completed" | "failed";
  outputVideoUrl?: string;
  error?: string;
}): Promise<boolean> {
  if (!input.targetVideoId || !input.targetClipNumber) return false;
  const videos = await videosCollection();
  const project = await videos.findOne({ _id: input.targetVideoId });
  if (!project) return false;

  const clips =
    input.status === "completed" && input.outputVideoUrl
      ? applyCompletedEngineClip(project.clips || [], input.targetClipNumber, input.outputVideoUrl)
      : applyFailedEngineClip(
          project.clips || [],
          input.targetClipNumber,
          input.error || "影片處理失敗",
          input.previousClipVideoUrl,
        );

  const next = { ...project, clips };
  const nextStatus = nextProjectStatus(next);
  const now = new Date();
  await videos.updateOne(
    { _id: project._id },
    { $set: { clips, status: nextStatus, updatedAt: now } },
  );

  const updated = await videos.findOne({ _id: project._id });
  if (updated && input.status === "completed") {
    await queueReelIfReady(updated).catch((err) => {
      console.error("[clip-jutsu] queueReelIfReady failed", { videoId: project._id.toHexString(), err });
    });
  }

  try {
    revalidatePath("/app");
    revalidatePath(folderVideoPath(project.projectId?.toHexString(), project._id.toHexString()));
  } catch {
    // Non-request background / cron context
  }
  return true;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test src/service/teleport/teleport.test.ts src/service/opencut/clip-jutsu.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/model/jutsu-job.ts src/model/teleport-job.ts src/service/teleport/start-input.ts src/service/teleport/prompts.ts src/service/opencut/clip-jutsu-settle.ts src/service/teleport/teleport.test.ts src/service/opencut/clip-jutsu.test.ts
git commit -m "feat: add target clip fields and settlement helper for OpenEdit engine jobs"
```

---

### Task 3: 將目標分鏡寫回接進 Scro Swap、Teleport、任務清單與專案輪詢

**Files:**
- Modify: `src/service/jutsu/pipeline.ts`
- Modify: `src/service/teleport/pipeline.ts`
- Modify: `src/service/generation/actions.ts:505-545`
- Modify: `src/service/generation/task-list.ts:205-268,350-405`
- Test: `src/service/teleport/teleport.test.ts`

**Interfaces:**
- Consumes: `settleTargetClipFromEngineJob` from `@/service/opencut/clip-jutsu-settle`; `advanceJutsuJobs` from `@/service/jutsu/pipeline`; `advanceTeleportJobs` from `@/service/teleport/pipeline`
- Produces:
  - `StartScroSwapInput` accepts optional `targetVideoId?: string; targetClipNumber?: number; previousClipVideoUrl?: string`
  - `finalizeJutsuRenderedVideo` and all Jutsu failure/timeout paths call `settleTargetClipFromEngineJob`
  - `finalizeTeleportRenderedVideo` and all Teleport failure/timeout paths call `settleTargetClipFromEngineJob`, and `seedreamWebp` / H3 / Hailuo use `job.aspectRatio`
  - `scroSwapTask` and `teleportTask` populate `videoId: job.targetVideoId?.toHexString()` when present
  - `listTasks(clerkUserId, { videoId })` queries `jutsu_jobs` and `teleport_jobs` by `targetVideoId` when `options.videoId` is set
  - `refreshGenerationAction(projectId)` calls `advanceJutsuJobs(clerkUserId)` and `advanceTeleportJobs(clerkUserId)`

- [ ] **Step 1: Write the failing test**

Append to `src/service/teleport/teleport.test.ts`:

```ts
import { scroSwapTask } from "@/service/generation/task-list";
import type { JutsuJob } from "@/model/jutsu-job";

test("scroSwapTask and teleportTask attach videoId when targetVideoId is set", () => {
  const now = new Date("2026-11-02T12:00:00.000Z");
  const targetVideoId = new ObjectId("507f1f77bcf86cd799439012");

  const tTask = teleportTask(
    {
      _id: new ObjectId("507f1f77bcf86cd799439011"),
      userId: new ObjectId("507f1f77bcf86cd799439013"),
      clerkUserId: "user_1",
      status: "rendering",
      sourceVideoUrl: "https://example.public.blob.vercel-storage.com/in.mp4",
      aspectRatio: "16:9",
      sectionStart: 0,
      sectionLength: 6,
      scenePrompt: "Cyberpunk alley",
      targetVideoId,
      targetClipNumber: 2,
      createdAt: now,
      updatedAt: now,
    },
    now.getTime(),
  );
  assert.equal(tTask?.videoId, "507f1f77bcf86cd799439012");

  const sDoc: JutsuJob & { _id: ObjectId } = {
    _id: new ObjectId("507f1f77bcf86cd799439014"),
    userId: new ObjectId("507f1f77bcf86cd799439013"),
    clerkUserId: "user_1",
    mode: "character_swap",
    status: "rendering",
    sourceVideoUrl: "https://example.public.blob.vercel-storage.com/in.mp4",
    aspectRatio: "16:9",
    sectionStart: 0,
    sectionLength: 6,
    characterName: "Leo",
    targetVideoId,
    targetClipNumber: 2,
    createdAt: now,
    updatedAt: now,
  };
  const sTask = scroSwapTask(sDoc, now.getTime());
  assert.equal(sTask?.videoId, "507f1f77bcf86cd799439012");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/teleport/teleport.test.ts`
Expected: FAIL (`tTask?.videoId` is `undefined`).

- [ ] **Step 3: Wire `settleTargetClipFromEngineJob`, `aspectRatio`, `task-list`, and `refreshGenerationAction`**

1. In `src/service/teleport/pipeline.ts`:
- Import `settleTargetClipFromEngineJob` from `@/service/opencut/clip-jutsu-settle` and ` type { AspectRatio } from "@/model/project"`.
- Update `seedreamWebp`:
```ts
async function seedreamWebp(input: {
  prompt: string;
  aspectRatio: AspectRatio;
  referenceImageUrls?: string[];
}): Promise<Buffer> {
  const res = await submitOpenRouterImage({
    model: OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
    prompt: input.prompt,
    aspectRatio: input.aspectRatio,
    resolution: "2k",
    referenceImageUrls: input.referenceImageUrls,
  });
```
- In `startTeleportJob`, set `aspectRatio: normalized.aspectRatio`, and when `normalized.targetVideoId && ObjectId.isValid(normalized.targetVideoId)` set:
```ts
      ...(normalized.targetVideoId && ObjectId.isValid(normalized.targetVideoId)
        ? { targetVideoId: new ObjectId(normalized.targetVideoId) }
        : {}),
      ...(normalized.targetClipNumber ? { targetClipNumber: normalized.targetClipNumber } : {}),
      ...(normalized.previousClipVideoUrl
        ? { previousClipVideoUrl: normalized.previousClipVideoUrl }
        : {}),
```
- In `runTeleportJobInBackground`:
  - Pass `job.aspectRatio` into `buildTeleportScenePlatePrompt(job.scenePrompt ?? "", job.aspectRatio)` and all 3 `seedreamWebp` calls (`aspectRatio: job.aspectRatio`).
  - Pass `aspectRatio: job.aspectRatio` into `submitMinimaxH3Ref2VaVideo` and `submitOpenRouterClipVideo`.
  - In the `catch (error)` block of `runTeleportJobInBackground`, after updating `teleport_jobs` to `failed`, call:
```ts
    await settleTargetClipFromEngineJob({
      targetVideoId: job.targetVideoId,
      targetClipNumber: job.targetClipNumber,
      previousClipVideoUrl: job.previousClipVideoUrl,
      status: "failed",
      error: msg,
    });
```
- In `finalizeTeleportRenderedVideo`, after updating `teleport_jobs` to `completed`, call:
```ts
  await settleTargetClipFromEngineJob({
    targetVideoId: job.targetVideoId,
    targetClipNumber: job.targetClipNumber,
    previousClipVideoUrl: job.previousClipVideoUrl,
    status: "completed",
    outputVideoUrl,
  });
```
- In `advanceTeleportJobs` and `pollTeleportJobStatus`, whenever a job is marked `failed` (timeout or provider failure or finalize failure), also call `settleTargetClipFromEngineJob` with `status: "failed"` and that error message.

2. In `src/service/jutsu/pipeline.ts`:
- Import `settleTargetClipFromEngineJob` from `@/service/opencut/clip-jutsu-settle`.
- Add to `StartScroSwapInput`:
```ts
  targetVideoId?: string;
  targetClipNumber?: number;
  previousClipVideoUrl?: string;
```
- In `startScroSwapJob`, store `targetVideoId` (when `input.targetVideoId && ObjectId.isValid(input.targetVideoId)`), `targetClipNumber`, and `previousClipVideoUrl` onto `doc`.
- In `finalizeJutsuRenderedVideo`, after updating `jutsu_jobs` to `completed`, call:
```ts
  await settleTargetClipFromEngineJob({
    targetVideoId: job.targetVideoId,
    targetClipNumber: job.targetClipNumber,
    previousClipVideoUrl: job.previousClipVideoUrl,
    status: "completed",
    outputVideoUrl,
  });
```
- In `runScroSwapJobInBackground`, `advanceJutsuJobs`, and `pollJutsuJobStatus`, whenever a job is marked `failed`, call `settleTargetClipFromEngineJob` with `status: "failed"` and that error message.

3. In `src/service/generation/task-list.ts`:
- In `scroSwapTask`: add `videoId: job.targetVideoId?.toHexString(),` to the returned object.
- In `teleportTask`: add `videoId: job.targetVideoId?.toHexString(),` to the returned object.
- In `listTasks`: when `options.videoId` is provided and `ObjectId.isValid(options.videoId)`, query `jutsu_jobs` and `teleport_jobs` with `targetVideoId: new ObjectId(options.videoId)` instead of returning `[]`:
```ts
  const targetVideoFilter =
    options.videoId && ObjectId.isValid(options.videoId)
      ? { targetVideoId: new ObjectId(options.videoId) }
      : options.videoId
        ? null
        : {};
  const swapDocs =
    targetVideoFilter === null
      ? []
      : ((await (
          await jutsuJobsCollection()
        )
          .find({
            clerkUserId,
            ...targetVideoFilter,
            $or: [
              { status: "rendering" },
              { status: { $in: ["completed", "failed"] }, updatedAt: { $gte: cutoff } },
            ],
          })
          .sort({ updatedAt: -1 })
          .limit(40)
          .toArray()) as Array<JutsuJob & { _id: ObjectId }>);
```
And apply the same `targetVideoFilter` to `teleportDocs`.

4. In `src/service/generation/actions.ts`:
- Import `advanceJutsuJobs` from `@/service/jutsu/pipeline` and `advanceTeleportJobs` from `@/service/teleport/pipeline`.
- Inside `refreshGenerationAction(projectId)`, right before `if (isProductionLike(project.status))` (around line 529), add:
```ts
    await Promise.all([
      advanceJutsuJobs(clerkUserId).catch((error) => {
        console.error("[scro-swap] refresh advance failed", { projectId, error });
      }),
      advanceTeleportJobs(clerkUserId).catch((error) => {
        console.error("[teleport] refresh advance failed", { projectId, error });
      }),
    ]);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/teleport/teleport.test.ts src/service/opencut/clip-jutsu.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/service/jutsu/pipeline.ts src/service/teleport/pipeline.ts src/service/generation/actions.ts src/service/generation/task-list.ts src/service/teleport/teleport.test.ts
git commit -m "feat: settle OpenEdit target clips when Scro Swap or Teleport jobs finish"
```

---

### Task 4: OpenEdit 分鏡套用 Scro Swap 與 Teleport 的服務與 Server Actions

**Files:**
- Create: `src/service/opencut/clip-jutsu.ts`
- Create: `src/presentation/actions/opencut-clip-jutsu.ts`
- Modify: `src/service/opencut/clip-jutsu.test.ts`

**Interfaces:**
- Consumes: `startScroSwapJob` from `@/service/jutsu/pipeline`; `startTeleportJob` from `@/service/teleport/pipeline`; `videosCollection` from `@/dao`; `toPublicVideo`, `PublicVideo` from `@/presentation/serialize`
- Produces:
  - `export function resolveClipJutsuSectionLength(rowSeconds?: number, clipSeconds?: number): number`
  - `export function markClipInProgressForEngine(clips: ProjectClip[], clipNumber: number, nowIso: string): ProjectClip[]`
  - `export async function applyClipScroSwap(input: { videoId: string; clipNumber: number; characterId?: string; referenceImageUrl?: string }): Promise<{ ok: true; project: PublicVideo; jobId: string } | { ok: false; error: string }>`
  - `export async function applyClipTeleport(input: { videoId: string; clipNumber: number; sceneImageUrl?: string; scenePrompt?: string }): Promise<{ ok: true; project: PublicVideo; jobId: string } | { ok: false; error: string }>`
  - `export async function applyClipScroSwapAction(input: Parameters<typeof applyClipScroSwap>[0]): ReturnType<typeof applyClipScroSwap>`
  - `export async function applyClipTeleportAction(input: Parameters<typeof applyClipTeleport>[0]): ReturnType<typeof applyClipTeleport>`

- [ ] **Step 1: Write the failing test**

Append to `src/service/opencut/clip-jutsu.test.ts`:

```ts
import {
  markClipInProgressForEngine,
  resolveClipJutsuSectionLength,
} from "@/service/opencut/clip-jutsu";

test("resolveClipJutsuSectionLength clamps clip duration into 2..15 seconds", () => {
  assert.equal(resolveClipJutsuSectionLength(1, undefined), 2);
  assert.equal(resolveClipJutsuSectionLength(6.4, undefined), 6);
  assert.equal(resolveClipJutsuSectionLength(undefined, 22), 15);
  assert.equal(resolveClipJutsuSectionLength(undefined, undefined), 6);
});

test("markClipInProgressForEngine sets status to in_progress and updates submittedAt while keeping previous URLs", () => {
  const clips: ProjectClip[] = [
    {
      clipNumber: 2,
      durationSeconds: 6,
      prompt: "p",
      status: "completed",
      blobUrl: "https://blob/c2.mp4",
      outputUrl: "https://blob/c2.mp4",
      error: "stale",
    },
  ];
  const next = markClipInProgressForEngine(clips, 2, "2026-11-02T12:00:00.000Z");
  assert.equal(next[0]?.status, "in_progress");
  assert.equal(next[0]?.submittedAt, "2026-11-02T12:00:00.000Z");
  assert.equal(next[0]?.error, undefined);
  assert.equal(next[0]?.blobUrl, "https://blob/c2.mp4");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/opencut/clip-jutsu.test.ts`
Expected: FAIL with module `@/service/opencut/clip-jutsu` not found.

- [ ] **Step 3: Implement `src/service/opencut/clip-jutsu.ts` and `src/presentation/actions/opencut-clip-jutsu.ts`**

Create `src/service/opencut/clip-jutsu.ts`:

```ts
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { videosCollection } from "@/dao";
import type { Project, ProjectClip } from "@/model/project";
import { toPublicVideo, type PublicVideo } from "@/presentation/serialize";
import { requireAppUser } from "@/service/auth";
import { markUnsentClipVideos } from "@/service/clip/cancel-pending-video";
import { folderVideoPath } from "@/service/folder-video-path";
import { startScroSwapJob } from "@/service/jutsu/pipeline";
import { startTeleportJob } from "@/service/teleport/pipeline";
import { mediaSrc } from "@/util/media-src";

export type ApplyClipEngineResult =
  | { ok: true; project: PublicVideo; jobId: string }
  | { ok: false; error: string };

/** Clamp storyboard clip duration to the 2..15s range supported by Scro Swap and Teleport. */
export function resolveClipJutsuSectionLength(
  rowSeconds?: number,
  clipSeconds?: number,
): number {
  const raw = Number(rowSeconds) || Number(clipSeconds) || 6;
  return Math.min(15, Math.max(2, Math.round(raw)));
}

/**
 * Flip the target clip to `in_progress` with a fresh `submittedAt` timestamp.
 * Using `in_progress` (not `queued`) prevents `orphanQueuedClips` from failing it,
 * and the fresh `submittedAt` prevents `reconcileClips` from applying older video jobs.
 */
export function markClipInProgressForEngine(
  clips: ProjectClip[],
  clipNumber: number,
  nowIso: string,
): ProjectClip[] {
  return clips.map((clip) =>
    clip.clipNumber === clipNumber
      ? {
          ...clip,
          status: "in_progress" as const,
          submittedAt: nowIso,
          error: undefined,
          unsent: false,
        }
      : clip,
  );
}

async function loadReadyClip(
  videoId: string,
  clipNumber: number,
  clerkUserId: string,
): Promise<
  | {
      ok: true;
      project: Project;
      sourceVideoUrl: string;
      sectionLength: number;
    }
  | { ok: false; error: string }
> {
  if (!ObjectId.isValid(videoId)) return { ok: false, error: "專案不存在" };
  const videos = await videosCollection();
  const project = await videos.findOne({ _id: new ObjectId(videoId), clerkUserId });
  if (!project?.phaseA) return { ok: false, error: "專案不存在" };

  const row = project.phaseA.clips.find((item) => item.clipNumber === clipNumber);
  if (!row) return { ok: false, error: "找不到這段分鏡" };

  const clip = (project.clips || []).find((item) => item.clipNumber === clipNumber);
  if (!clip) return { ok: false, error: "這段分鏡尚未產生影片" };
  if (clip.status === "queued" || clip.status === "in_progress") {
    return { ok: false, error: "這一段影片正在產生中，請稍候" };
  }
  const sourceVideoUrl = mediaSrc(clip)?.trim() || "";
  if (clip.status !== "completed" || !sourceVideoUrl.startsWith("https://")) {
    return { ok: false, error: "這段分鏡尚未產生完成的影片" };
  }

  return {
    ok: true,
    project,
    sourceVideoUrl,
    sectionLength: resolveClipJutsuSectionLength(row.durationSeconds, clip.durationSeconds),
  };
}

async function persistClipInProgress(
  project: Project,
  clipNumber: number,
): Promise<PublicVideo> {
  const videos = await videosCollection();
  const now = new Date();
  const nextClips = markClipInProgressForEngine(
    project.clips || [],
    clipNumber,
    now.toISOString(),
  );
  await videos.updateOne(
    { _id: project._id },
    { $set: { clips: nextClips, status: "production", updatedAt: now } },
  );
  const updated = (await videos.findOne({ _id: project._id })) ?? {
    ...project,
    clips: nextClips,
    status: "production" as const,
    updatedAt: now,
  };
  try {
    revalidatePath(folderVideoPath(project.projectId?.toHexString(), project._id.toHexString()));
  } catch {
    // Non-request context
  }
  return toPublicVideo(await markUnsentClipVideos(updated));
}

/** Start a Scro Swap job locked to one completed OpenEdit storyboard clip. */
export async function applyClipScroSwap(input: {
  videoId: string;
  clipNumber: number;
  characterId?: string;
  referenceImageUrl?: string;
}): Promise<ApplyClipEngineResult> {
  const user = await requireAppUser();
  const loaded = await loadReadyClip(input.videoId, input.clipNumber, user.clerkUserId);
  if (!loaded.ok) return loaded;

  const started = await startScroSwapJob({
    sourceVideoUrl: loaded.sourceVideoUrl,
    sectionStart: 0,
    sectionLength: loaded.sectionLength,
    characterId: input.characterId,
    referenceImageUrl: input.referenceImageUrl,
    keepSourceAudio: true,
    applyColorFix: true,
    targetVideoId: loaded.project._id.toHexString(),
    targetClipNumber: input.clipNumber,
    previousClipVideoUrl: loaded.sourceVideoUrl,
  });
  if (!started.ok) return started;

  const project = await persistClipInProgress(loaded.project, input.clipNumber);
  return { ok: true, project, jobId: started.job.id };
}

/** Start a Teleport job locked to one completed OpenEdit storyboard clip. */
export async function applyClipTeleport(input: {
  videoId: string;
  clipNumber: number;
  sceneImageUrl?: string;
  scenePrompt?: string;
}): Promise<ApplyClipEngineResult> {
  const user = await requireAppUser();
  const loaded = await loadReadyClip(input.videoId, input.clipNumber, user.clerkUserId);
  if (!loaded.ok) return loaded;

  const started = await startTeleportJob({
    sourceVideoUrl: loaded.sourceVideoUrl,
    aspectRatio: loaded.project.aspectRatio,
    sectionStart: 0,
    sectionLength: loaded.sectionLength,
    sceneImageUrl: input.sceneImageUrl,
    scenePrompt: input.scenePrompt,
    keepSourceAudio: true,
    applyColorFix: true,
    targetVideoId: loaded.project._id.toHexString(),
    targetClipNumber: input.clipNumber,
    previousClipVideoUrl: loaded.sourceVideoUrl,
  });
  if (!started.ok) return started;

  const project = await persistClipInProgress(loaded.project, input.clipNumber);
  return { ok: true, project, jobId: started.job.id };
}
```

Create `src/presentation/actions/opencut-clip-jutsu.ts`:

```ts
"use server";

import {
  applyClipScroSwap,
  applyClipTeleport,
} from "@/service/opencut/clip-jutsu";

export async function applyClipScroSwapAction(
  ...args: Parameters<typeof applyClipScroSwap>
) {
  return applyClipScroSwap(...args);
}

export async function applyClipTeleportAction(
  ...args: Parameters<typeof applyClipTeleport>
) {
  return applyClipTeleport(...args);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/opencut/clip-jutsu.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/service/opencut/clip-jutsu.ts src/presentation/actions/opencut-clip-jutsu.ts src/service/opencut/clip-jutsu.test.ts
git commit -m "feat: add server actions to apply Scro Swap and Teleport to OpenEdit clips"
```

---

### Task 5: 剪輯器專用精簡視窗與 `OpenCutScroAiShell` / `OpenCutDirectDesk` 串接

**Files:**
- Create: `src/presentation/components/app/projects/new/opencut-clip-scro-swap-dialog.tsx`
- Create: `src/presentation/components/app/projects/new/opencut-clip-teleport-dialog.tsx`
- Modify: `src/presentation/components/app/projects/new/opencut-scro-ai-shell.tsx`
- Modify: `src/presentation/components/app/projects/new/opencut-direct-desk.tsx:340-365,580-595`

**Interfaces:**
- Consumes: `applyClipScroSwapAction`, `applyClipTeleportAction` from `@/presentation/actions/opencut-clip-jutsu`; `BrandUploadButton` from `@/presentation/components/app/projects/new/brand-upload-button`; `DialogBackdrop` from `@/presentation/components/dialog-backdrop`
- Produces:
  - `export function OpenCutClipScroSwapDialog(props: { videoId: string; clipNumber: number; durationSeconds: number; videoUrl: string; characters: PublicCharacter[]; onApplied: (project: PublicVideo) => void; onClose: () => void }): JSX.Element`
  - `export function OpenCutClipTeleportDialog(props: { videoId: string; clipNumber: number; durationSeconds: number; videoUrl: string; onApplied: (project: PublicVideo) => void; onClose: () => void }): JSX.Element`

- [ ] **Step 1: Create `opencut-clip-scro-swap-dialog.tsx`**

Create `src/presentation/components/app/projects/new/opencut-clip-scro-swap-dialog.tsx`:

```tsx
"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { applyClipScroSwapAction } from "@/presentation/actions/opencut-clip-jutsu";
import { BrandUploadButton } from "@/presentation/components/app/projects/new/brand-upload-button";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { useI18n } from "@/presentation/components/i18n-provider";
import { notifyTasksChanged } from "@/presentation/components/app/tasks/task-signal";
import { Spinner } from "@/presentation/components/spinner";
import type {
  PublicCharacter,
  PublicCharacterPreset,
  PublicCharacterVersion,
  PublicVideo,
} from "@/presentation/serialize";

function versionImageUrl(v?: PublicCharacterVersion | null): string {
  if (!v) return "";
  return v.portraitUrl || v.profileUrl || v.blueprintUrl || "";
}

function presetImageUrl(p: PublicCharacterPreset, char: PublicCharacter): string {
  if (p.portraitUrl || p.profileUrl || p.blueprintUrl) {
    return p.portraitUrl || p.profileUrl || p.blueprintUrl || "";
  }
  const ver = char.versions.find((v) => v.id === p.versionId);
  return versionImageUrl(ver);
}

function defaultCharacterLookUrl(char?: PublicCharacter | null): string {
  if (!char) return "";
  const completed = [...(char.versions || [])]
    .reverse()
    .filter((v) => v.status === "completed" && Boolean(versionImageUrl(v)));
  const def = char.defaultVersionId
    ? completed.find((v) => v.id === char.defaultVersionId)
    : undefined;
  return versionImageUrl(def ?? completed[0]) || char.previewUrl || "";
}

/** Focused modal to apply Scro Swap directly to one completed OpenEdit clip. */
export function OpenCutClipScroSwapDialog({
  videoId,
  clipNumber,
  durationSeconds,
  videoUrl,
  characters,
  onApplied,
  onClose,
}: {
  videoId: string;
  clipNumber: number;
  durationSeconds: number;
  videoUrl: string;
  characters: PublicCharacter[];
  onApplied: (project: PublicVideo) => void;
  onClose: () => void;
}) {
  const { locale } = useI18n();
  const isEn = locale === "en";
  const titleId = useId();

  const [characterId, setCharacterId] = useState<string>(characters[0]?.id ?? "");
  const [selectedLookUrl, setSelectedLookUrl] = useState<string>(() =>
    defaultCharacterLookUrl(characters[0]),
  );
  const [selectedLookKey, setSelectedLookKey] = useState<string>("default");
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape" && !submitting) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  const activeCharacter = useMemo(
    () => characters.find((c) => c.id === characterId) ?? null,
    [characters, characterId],
  );

  const savedPresets = useMemo(() => {
    if (!activeCharacter) return [];
    return [...(activeCharacter.presets || [])].filter((p) =>
      Boolean(presetImageUrl(p, activeCharacter)),
    );
  }, [activeCharacter]);

  const effectiveRefUrl = uploadedPhotoUrl || selectedLookUrl || "";
  const canSubmit = !submitting && Boolean(effectiveRefUrl);

  function selectCharacter(char: PublicCharacter) {
    setCharacterId(char.id);
    setUploadedPhotoUrl("");
    setSelectedLookKey("default");
    setSelectedLookUrl(defaultCharacterLookUrl(char));
  }

  async function onSubmit() {
    if (!canSubmit) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await applyClipScroSwapAction({
        videoId,
        clipNumber,
        characterId: uploadedPhotoUrl ? undefined : characterId || undefined,
        referenceImageUrl: effectiveRefUrl,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      notifyTasksChanged();
      onApplied(res.project);
      onClose();
    } catch {
      setError(isEn ? "Failed to start Scro Swap." : "啟動 Scro Swap 失敗，請重試");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DialogBackdrop
      className="grid place-items-center bg-accent-ink/50 p-3 backdrop-blur-xs sm:p-6"
      onClick={submitting ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(ev) => ev.stopPropagation()}
        className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border-2 border-accent-ink bg-white shadow-[8px_8px_0_0_#12141c]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-accent-ink/10 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-accent-ink px-2.5 py-0.5 font-display text-[11px] font-bold uppercase tracking-wider text-lime">
                Scro Swap
              </span>
              <h2 id={titleId} className="font-display text-lg font-bold">
                Clip {clipNumber} · {isEn ? "Character Swap" : "Scro Swap 換角"} ({durationSeconds}s)
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-muted">
              {isEn
                ? "Keep this clip's motion and scene, and replace the character in place."
                : "保留呢段分鏡嘅動作同場景，完成後自動替換時間軸上嘅片段。"}
            </p>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            aria-label={isEn ? "Close dialog" : "關閉視窗"}
            className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full border border-accent-ink/15 text-base font-bold text-muted transition hover:border-accent-ink hover:text-foreground"
          >
            ×
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
            <div className="overflow-hidden rounded-xl border border-accent-ink/15 bg-accent-ink/5">
              <video
                src={videoUrl}
                controls
                playsInline
                className="aspect-[9/16] max-h-48 w-full object-contain bg-black"
              />
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-display text-sm font-bold">
                  {isEn ? "Choose Character or Upload Photo" : "選擇角色或上傳參考照"}
                </span>
                <BrandUploadButton
                  label={
                    uploadedPhotoUrl
                      ? isEn
                        ? "Replace Photo"
                        : "更換照片"
                      : isEn
                        ? "Upload Custom Photo"
                        : "上傳自訂角色照"
                  }
                  accept="image/png,image/jpeg,image/webp"
                  disabled={submitting}
                  onUploaded={(asset) => {
                    if (asset.kind === "image") {
                      setUploadedPhotoUrl(asset.url);
                      setError("");
                    }
                  }}
                  onError={setError}
                />
              </div>

              {uploadedPhotoUrl ? (
                <div className="flex items-center gap-3 rounded-xl border border-accent-ink/20 bg-surface-hi/40 p-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={uploadedPhotoUrl}
                    alt=""
                    className="h-14 w-14 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="font-semibold">
                      {isEn ? "Using uploaded character photo" : "使用已上傳嘅自訂角色照"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadedPhotoUrl("")}
                    className="rounded-lg border border-accent-ink/20 px-2.5 py-1 text-xs font-semibold hover:border-accent-ink"
                  >
                    {isEn ? "Clear" : "清除"}
                  </button>
                </div>
              ) : null}

              {characters.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {characters.map((char) => {
                    const thumb = defaultCharacterLookUrl(char);
                    const active = !uploadedPhotoUrl && char.id === characterId;
                    return (
                      <button
                        key={char.id}
                        type="button"
                        onClick={() => selectCharacter(char)}
                        className={`flex flex-col overflow-hidden rounded-xl border text-left transition ${
                          active
                            ? "border-2 border-accent-ink bg-lime/20"
                            : "border-accent-ink/15 hover:border-accent-ink/50"
                        }`}
                      >
                        <div className="aspect-square w-full bg-accent-ink/5">
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={thumb} alt={char.name} className="size-full object-cover" />
                          ) : null}
                        </div>
                        <span className="truncate px-2 py-1 text-xs font-semibold">
                          {char.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {activeCharacter && !uploadedPhotoUrl && savedPresets.length > 0 ? (
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-semibold text-muted">
                    {isEn ? "Look / Outfit Preset" : "造型預設"}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLookKey("default");
                        setSelectedLookUrl(defaultCharacterLookUrl(activeCharacter));
                      }}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        selectedLookKey === "default"
                          ? "border-accent-ink bg-accent-ink text-white"
                          : "border-accent-ink/20"
                      }`}
                    >
                      {isEn ? "Default" : "預設造型"}
                    </button>
                    {savedPresets.map((preset) => {
                      const key = `preset:${preset.id}`;
                      const url = presetImageUrl(preset, activeCharacter);
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setSelectedLookKey(key);
                            setSelectedLookUrl(url);
                          }}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                            selectedLookKey === key
                              ? "border-accent-ink bg-accent-ink text-white"
                              : "border-accent-ink/20"
                          }`}
                        >
                          {preset.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {error ? (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-accent-ink/10 px-6 py-4">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="rounded-xl border border-accent-ink/20 px-4 py-2 text-xs font-bold hover:border-accent-ink"
          >
            {isEn ? "Cancel" : "取消"}
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void onSubmit()}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-accent-ink bg-lime px-5 py-2 font-display text-xs font-bold text-accent-ink shadow-[3px_3px_0_0_#12141c] disabled:opacity-40"
          >
            {submitting ? <Spinner className="h-3.5 w-3.5" /> : null}
            {isEn ? "Apply Scro Swap" : "套用 Scro Swap 換角"}
          </button>
        </div>
      </div>
    </DialogBackdrop>
  );
}
```

- [ ] **Step 2: Create `opencut-clip-teleport-dialog.tsx`**

Create `src/presentation/components/app/projects/new/opencut-clip-teleport-dialog.tsx`:

```tsx
"use client";

import { useEffect, useId, useState } from "react";
import { applyClipTeleportAction } from "@/presentation/actions/opencut-clip-jutsu";
import { BrandUploadButton } from "@/presentation/components/app/projects/new/brand-upload-button";
import { notifyTasksChanged } from "@/presentation/components/app/tasks/task-signal";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { PublicVideo } from "@/presentation/serialize";

/** Focused modal to apply Teleport scene relocation directly to one completed OpenEdit clip. */
export function OpenCutClipTeleportDialog({
  videoId,
  clipNumber,
  durationSeconds,
  videoUrl,
  onApplied,
  onClose,
}: {
  videoId: string;
  clipNumber: number;
  durationSeconds: number;
  videoUrl: string;
  onApplied: (project: PublicVideo) => void;
  onClose: () => void;
}) {
  const { locale } = useI18n();
  const isEn = locale === "en";
  const titleId = useId();

  const [sceneImageUrl, setSceneImageUrl] = useState("");
  const [scenePrompt, setScenePrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape" && !submitting) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  const canSubmit =
    !submitting && (Boolean(sceneImageUrl) || Boolean(scenePrompt.trim()));

  async function onSubmit() {
    if (!canSubmit) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await applyClipTeleportAction({
        videoId,
        clipNumber,
        sceneImageUrl: sceneImageUrl || undefined,
        scenePrompt: scenePrompt.trim() || undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      notifyTasksChanged();
      onApplied(res.project);
      onClose();
    } catch {
      setError(isEn ? "Failed to start Teleport." : "啟動 Teleport 失敗，請重試");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DialogBackdrop
      className="grid place-items-center bg-accent-ink/50 p-3 backdrop-blur-xs sm:p-6"
      onClick={submitting ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(ev) => ev.stopPropagation()}
        className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border-2 border-accent-ink bg-white shadow-[8px_8px_0_0_#12141c]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-accent-ink/10 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-accent-ink px-2.5 py-0.5 font-display text-[11px] font-bold uppercase tracking-wider text-lime">
                Teleport
              </span>
              <h2 id={titleId} className="font-display text-lg font-bold">
                Clip {clipNumber} · {isEn ? "Scene Relocate" : "Teleport 換場"} ({durationSeconds}s)
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-muted">
              {isEn
                ? "Keep the person and motion from this clip, and relocate them into a new scene."
                : "保留呢段分鏡入面嘅人物同動作，換入新背景場景並自動替換片段。"}
            </p>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            aria-label={isEn ? "Close dialog" : "關閉視窗"}
            className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full border border-accent-ink/15 text-base font-bold text-muted transition hover:border-accent-ink hover:text-foreground"
          >
            ×
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-[150px_1fr]">
            <div className="overflow-hidden rounded-xl border border-accent-ink/15 bg-accent-ink/5">
              <video
                src={videoUrl}
                controls
                playsInline
                className="aspect-[9/16] max-h-48 w-full object-contain bg-black"
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-display text-xs font-bold">
                    {isEn ? "Scene Photo (optional)" : "場景照片（可選）"}
                  </span>
                  <BrandUploadButton
                    label={
                      sceneImageUrl
                        ? isEn
                          ? "Replace Scene Photo"
                          : "更換場景照"
                        : isEn
                          ? "Upload Scene Photo"
                          : "上傳場景照"
                    }
                    accept="image/png,image/jpeg,image/webp"
                    disabled={submitting}
                    onUploaded={(asset) => {
                      if (asset.kind === "image") {
                        setSceneImageUrl(asset.url);
                        setError("");
                      }
                    }}
                    onError={setError}
                  />
                </div>
                {sceneImageUrl ? (
                  <div className="flex items-center gap-3 rounded-xl border border-accent-ink/20 bg-surface-hi/40 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={sceneImageUrl}
                      alt=""
                      className="h-14 w-14 rounded-lg object-cover"
                    />
                    <span className="flex-1 text-xs font-semibold">
                      {isEn
                        ? "Photo sets the location; text below adjusts mood."
                        : "以照片為地點；下方文字可微調氣氛。"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSceneImageUrl("")}
                      className="rounded-lg border border-accent-ink/20 px-2.5 py-1 text-xs font-semibold"
                    >
                      {isEn ? "Remove" : "移除"}
                    </button>
                  </div>
                ) : null}
              </div>

              <label className="block space-y-1.5">
                <span className="font-display text-xs font-bold">
                  {isEn ? "Scene or Mood Prompt" : "場景描述或氣氛文字"}
                </span>
                <textarea
                  rows={3}
                  value={scenePrompt}
                  disabled={submitting}
                  onChange={(ev) => setScenePrompt(ev.target.value)}
                  placeholder={
                    isEn
                      ? "e.g. Cozy Tokyo izakaya at rainy night, warm neon reflections..."
                      : "例如：雨夜東京居酒屋、溫暖霓虹反光…"
                  }
                  className="w-full rounded-xl border border-accent-ink/20 px-3 py-2 text-sm focus:border-accent-ink focus:outline-none"
                />
              </label>
            </div>
          </div>

          {error ? (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-accent-ink/10 px-6 py-4">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="rounded-xl border border-accent-ink/20 px-4 py-2 text-xs font-bold hover:border-accent-ink"
          >
            {isEn ? "Cancel" : "取消"}
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void onSubmit()}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-accent-ink bg-lime px-5 py-2 font-display text-xs font-bold text-accent-ink shadow-[3px_3px_0_0_#12141c] disabled:opacity-40"
          >
            {submitting ? <Spinner className="h-3.5 w-3.5" /> : null}
            {isEn ? "Apply Teleport" : "套用 Teleport 換場"}
          </button>
        </div>
      </div>
    </DialogBackdrop>
  );
}
```

- [ ] **Step 3: Wire `OpenCutScroAiShell` and `OpenCutDirectDesk`**

Update `src/presentation/components/app/projects/new/opencut-scro-ai-shell.tsx`:

- Import `OpenCutClipScroSwapDialog` and `OpenCutClipTeleportDialog`, `PublicCharacter`, and `mediaSrc` from `@/util/media-src`.
- Add `characters = []`, `clipSwapClip`, `clipTeleportClip`, `onCloseClipSwap`, `onCloseClipTeleport` props to `OpenCutScroAiShell`.
- Resolve the target clip video URL and duration for `clipSwapClip` / `clipTeleportClip`:
```tsx
  const swapClipDoc =
    clipSwapClip != null
      ? project.clips.find((item) => item.clipNumber === clipSwapClip)
      : undefined;
  const swapRow =
    clipSwapClip != null
      ? project.phaseA?.clips.find((row) => row.clipNumber === clipSwapClip)
      : undefined;
  const swapVideoUrl = swapClipDoc ? mediaSrc(swapClipDoc) : undefined;

  const teleportClipDoc =
    clipTeleportClip != null
      ? project.clips.find((item) => item.clipNumber === clipTeleportClip)
      : undefined;
  const teleportRow =
    clipTeleportClip != null
      ? project.phaseA?.clips.find((row) => row.clipNumber === clipTeleportClip)
      : undefined;
  const teleportVideoUrl = teleportClipDoc ? mediaSrc(teleportClipDoc) : undefined;
```
- Render `<OpenCutClipScroSwapDialog ... />` when `clipSwapClip != null && swapVideoUrl` and `<OpenCutClipTeleportDialog ... />` when `clipTeleportClip != null && teleportVideoUrl`.
- Extend `useOpenCutScroAiState()`:
```tsx
  const [clipSwapClip, setClipSwapClip] = useState<number | null>(null);
  const [clipTeleportClip, setClipTeleportClip] = useState<number | null>(null);
```

In `src/presentation/components/app/projects/new/opencut-direct-desk.tsx`:
- In `case "scro-open-ai":`:
```tsx
          if (payload.kind === "scro-swap") {
            aiRef.current.setClipSwapClip(payload.clipNumber);
            return;
          }
          if (payload.kind === "teleport") {
            aiRef.current.setClipTeleportClip(payload.clipNumber);
            return;
          }
```
- Pass `characters={characters}`, `clipSwapClip={ai.clipSwapClip}`, `clipTeleportClip={ai.clipTeleportClip}`, `onCloseClipSwap={() => ai.setClipSwapClip(null)}`, `onCloseClipTeleport={() => ai.setClipTeleportClip(null)}` to `<OpenCutScroAiShell ... />`.

- [ ] **Step 4: Run ESLint and unit tests**

Run: `npx eslint src/opencut/embed/scro-video-jutsu-actions.tsx src/opencut/embed/scro-video-properties.tsx src/presentation/components/app/projects/new/opencut-clip-scro-swap-dialog.tsx src/presentation/components/app/projects/new/opencut-clip-teleport-dialog.tsx src/presentation/components/app/projects/new/opencut-scro-ai-shell.tsx src/presentation/components/app/projects/new/opencut-direct-desk.tsx && npx tsx --test src/service/opencut/messages.test.ts src/service/opencut/clip-jutsu.test.ts src/service/teleport/teleport.test.ts`
Expected: PASS with 0 lint errors.

- [ ] **Step 5: Commit**

```bash
git add src/presentation/components/app/projects/new/opencut-clip-scro-swap-dialog.tsx src/presentation/components/app/projects/new/opencut-clip-teleport-dialog.tsx src/presentation/components/app/projects/new/opencut-scro-ai-shell.tsx src/presentation/components/app/projects/new/opencut-direct-desk.tsx
git commit -m "feat: wire OpenEdit clip Scro Swap and Teleport dialogs"
```

---

### Task 6: 同步更新 `pipeline-models.md` 與 `AGENTS.md`

**Files:**
- Modify: `pipeline-models.md:43-48`
- Modify: `AGENTS.md:46-50`

**Interfaces:**
- Consumes: none
- Produces: updated canonical model documentation reflecting OpenEdit clip-level Scro Swap and Teleport support.

- [ ] **Step 1: Update `pipeline-models.md` and `AGENTS.md`**

In `pipeline-models.md`:
- Update the **Scro Swap** row (`| **Scro Swap** (\`/app/scroswap\`) ...`) first column to `| **Scro Swap** (\`/app/scroswap\` & OpenEdit 分鏡片段換角) |` and mention at the end of its post-processing column that when triggered on a completed clip inside OpenEdit (`src/service/opencut/clip-jutsu.ts`), the finished MP4 replaces that clip in `videos.clips` and updates the OpenCut timeline in place.
- Update the **Teleport** row (`| **Teleport** (\`/app/teleport\`) ...`) first column to `| **Teleport** (\`/app/teleport\` & OpenEdit 分鏡片段換場) |` and note that `/app/teleport` outputs `9:16` while OpenEdit clip-level Teleport preserves the project's `aspectRatio` and replaces the target clip in `videos.clips` on completion.

In `AGENTS.md`:
- Update the **Scro Swap** and **Teleport** bullets under **Videos** to note that both engines can also be triggered on any completed storyboard clip inside the OpenCut editor (`src/service/opencut/clip-jutsu.ts`), replacing that clip's video in place upon completion (with Teleport matching the project's `aspectRatio`).

- [ ] **Step 2: Run full related test suite**

Run: `npx tsx --test src/service/opencut/messages.test.ts src/service/opencut/clip-jutsu.test.ts src/service/teleport/teleport.test.ts src/service/jutsu/jutsu.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add pipeline-models.md AGENTS.md
git commit -m "docs: document OpenEdit clip-level Scro Swap and Teleport in pipeline-models"
```
