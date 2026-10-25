# 改姿勢與分件衣服 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 做出 scro-pose Flutter app：用 Scro.io 的同一套 Firebase 帳號登入，拍或選一張照片，從 Scro 姿勢庫與衣櫃選姿勢和分件衣服，送出後得到一張新圖。

**Architecture:** explainer-web 新增獨立的目錄與 `pose-edits` API。送出時驗證、扣 4 credits、把原圖存進 Blob，並建立 self-syncing 的 `poseEdit` 生圖工作。模型走現有的 Google AI Studio `gemini-3-pro-image`。App 只持有 Firebase ID token，不持有模型金鑰。API 可以在沒有 App 的情況下用單元測試驗證。

**Tech Stack:** Next.js route handlers、MongoDB、現有 generation queue、`sharp`、Flutter（iOS 與 Android）、Firebase Auth、`image_picker`、Riverpod、`go_router`。

**Spec:** `docs/superpowers/specs/2026-10-25-pose-edit-app-design.md`

## Global Constraints

- Flutter 專案路徑：`/Users/jefflee/Projects/Explainer.io/scro-pose`。套件名 `scro_pose`。iOS bundle id 與 Android application id 都是 `io.scro.pose`。
- Firebase 專案是 `scro-explainer`。email／密碼與 Google。設定還沒寫入時，登入頁顯示 Firebase 尚未設定。
- API 預設 `https://www.scro.io`，沒有結尾斜線，呼叫時加 `/api/v1`。覆寫用 `--dart-define=API_BASE_URL`。
- 授權是 `Authorization: Bearer <Firebase ID token>`。
- 介面文案用繁體中文。
- 不讀寫角色或 Life 照片。不提供髮型與 `cw_` 自訂衣櫃。不做影片、分享頁、存進系統相簿。
- 測試不呼叫付費生圖，也不呼叫 Higgsfield。
- 扣點是 `FRAME_COST`（4）。未訂閱訊息是「請先訂閱方案才能產片」。點數不足訊息是「credits 不足，請加購或升級方案」。這兩種都在上傳前以 HTTP 400 回傳。
- 使用者可見狀態只有 `pending`、`completed`、`failed`。
- 檔案只接受 jpeg、png、webp，最大 8MB。錯誤文案是「請上傳 8MB 以內的 jpeg、png 或 webp」。
- 沒有選擇時：「請選姿勢或至少一件衣服」。未知姿勢：「找不到這個姿勢」。未知衣服、`cw_`、褲子 `none`：「找不到這件衣服」。別人的 id：「找不到改圖」，HTTP 404。
- `nsfw` 的使用者文案是「這張圖無法產生」。其他生圖失敗是「改圖失敗」。
- 讀取可以重試。`POST` 不自動重送。輪詢間隔 2.5 秒，App 回到前景時再讀一次。
- 網站任務列表不要列出 `poseEdit`（`jobListQuery` 不加入 `poseEditId`）。

---

### Task 1: 改圖選擇驗證

**Files:**
- Create: `src/service/pose-edit/errors.ts`
- Create: `src/service/pose-edit/selection.ts`
- Test: `src/service/pose-edit/selection.test.ts`

**Interfaces:**
- Consumes: `lifePoseById`（`src/model/life-pose.ts`）、`isCharacterLookId`、`isFullBodyTop`（`src/service/character/character-look.ts`）
- Produces:
  - `POSE_EDIT_ERRORS.pose === "找不到這個姿勢"`
  - `POSE_EDIT_ERRORS.outfit === "找不到這件衣服"`
  - `POSE_EDIT_ERRORS.empty === "請選姿勢或至少一件衣服"`
  - `parsePoseEditSelection(input: { poseId?: string; top?: string; pants?: string; shoes?: string; accessory?: string }): { ok: true; poseId?: string; wardrobe: Partial<Record<"top" | "pants" | "shoes" | "accessory", string>> } | { ok: false; error: string }`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { parsePoseEditSelection } from "@/service/pose-edit/selection";

test("parsePoseEditSelection rejects an empty edit", () => {
  const result = parsePoseEditSelection({});
  assert.deepEqual(result, { ok: false, error: "請選姿勢或至少一件衣服" });
});

test("parsePoseEditSelection rejects an unknown pose and an unknown garment", () => {
  assert.equal(parsePoseEditSelection({ poseId: "not-a-pose" }).ok, false);
  assert.equal(
    parsePoseEditSelection({ poseId: "not-a-pose" }).ok === false
      ? (parsePoseEditSelection({ poseId: "not-a-pose" }) as { error: string }).error
      : "",
    "找不到這個姿勢",
  );
  const outfit = parsePoseEditSelection({ top: "no-such-top" });
  assert.deepEqual(outfit, { ok: false, error: "找不到這件衣服" });
  assert.equal(parsePoseEditSelection({ pants: "none" }).ok, false);
  assert.equal(parsePoseEditSelection({ top: "cw_aaaaaaaaaaaaaaaaaaaaaaaa" }).ok, false);
});

test("parsePoseEditSelection keeps a real pose and jeans, and drops pants on a full-body top", () => {
  const pose = parsePoseEditSelection({ poseId: "standing-arms-relaxed", pants: "jeans" });
  assert.deepEqual(pose, {
    ok: true,
    poseId: "standing-arms-relaxed",
    wardrobe: { pants: "jeans" },
  });
  const dress = parsePoseEditSelection({ top: "alredscoopdress", pants: "jeans" });
  assert.deepEqual(dress, { ok: true, wardrobe: { top: "alredscoopdress" } });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/pose-edit/selection.test.ts`

Expected: FAIL，找不到 `@/service/pose-edit/selection`。

- [ ] **Step 3: Write minimal implementation**

`src/service/pose-edit/errors.ts`

```ts
export const POSE_EDIT_ERRORS = {
  file: "請上傳 8MB 以內的 jpeg、png 或 webp",
  pose: "找不到這個姿勢",
  outfit: "找不到這件衣服",
  empty: "請選姿勢或至少一件衣服",
  missing: "找不到改圖",
  subscribe: "請先訂閱方案才能產片",
  credits: "credits 不足，請加購或升級方案",
  nsfw: "這張圖無法產生",
  failed: "改圖失敗",
} as const;
```

`src/service/pose-edit/selection.ts`

```ts
import { lifePoseById } from "@/model/life-pose";
import { isCharacterLookId, isFullBodyTop } from "@/service/character/character-look";
import { POSE_EDIT_ERRORS } from "@/service/pose-edit/errors";

export const POSE_EDIT_PARTS = ["top", "pants", "shoes", "accessory"] as const;
export type PoseEditPart = (typeof POSE_EDIT_PARTS)[number];
export type PoseEditWardrobe = Partial<Record<PoseEditPart, string>>;

export function parsePoseEditSelection(input: {
  poseId?: string;
  top?: string;
  pants?: string;
  shoes?: string;
  accessory?: string;
}): { ok: true; poseId?: string; wardrobe: PoseEditWardrobe } | { ok: false; error: string } {
  const poseId = input.poseId?.trim() || undefined;
  if (poseId && !lifePoseById(poseId)) return { ok: false, error: POSE_EDIT_ERRORS.pose };
  const wardrobe: PoseEditWardrobe = {};
  for (const part of POSE_EDIT_PARTS) {
    const id = input[part]?.trim();
    if (!id) continue;
    if (id === "none" || /^cw_[a-f0-9]{24}$/i.test(id) || !isCharacterLookId(part, id)) {
      return { ok: false, error: POSE_EDIT_ERRORS.outfit };
    }
    wardrobe[part] = id;
  }
  if (isFullBodyTop(wardrobe.top)) delete wardrobe.pants;
  if (!poseId && Object.keys(wardrobe).length === 0) {
    return { ok: false, error: POSE_EDIT_ERRORS.empty };
  }
  return { ok: true, poseId, wardrobe };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/pose-edit/selection.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/service/pose-edit/errors.ts src/service/pose-edit/selection.ts src/service/pose-edit/selection.test.ts
git commit -m "Add pose edit selection checks for pose and garment ids."
```

---

### Task 2: 輸出比例

**Files:**
- Create: `src/service/pose-edit/aspect.ts`
- Test: `src/service/pose-edit/aspect.test.ts`

**Interfaces:**
- Consumes: none
- Produces: `poseEditAspect(width?: number, height?: number): "1:1" | "3:4" | "9:16"`。讀不到尺寸時回 `"3:4"`。差距相同時選寬／高較小者。

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { poseEditAspect } from "@/service/pose-edit/aspect";

test("poseEditAspect picks the nearest ratio and the narrower one on a tie", () => {
  assert.equal(poseEditAspect(1000, 1000), "1:1");
  assert.equal(poseEditAspect(300, 400), "3:4");
  assert.equal(poseEditAspect(9, 16), "9:16");
  assert.equal(poseEditAspect(undefined, 100), "3:4");
  // 0.875 is equally far from 1 and 0.75; the narrower ratio is 3:4.
  assert.equal(poseEditAspect(875, 1000), "3:4");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/pose-edit/aspect.test.ts`

Expected: FAIL，模組不存在。

- [ ] **Step 3: Write minimal implementation**

```ts
export const POSE_EDIT_ASPECTS = ["1:1", "3:4", "9:16"] as const;
export type PoseEditAspect = (typeof POSE_EDIT_ASPECTS)[number];

const RATIO: Record<PoseEditAspect, number> = { "1:1": 1, "3:4": 3 / 4, "9:16": 9 / 16 };

export function poseEditAspect(width?: number, height?: number): PoseEditAspect {
  if (!width || !height || width <= 0 || height <= 0) return "3:4";
  const ratio = width / height;
  return [...POSE_EDIT_ASPECTS].sort((a, b) => {
    const distance = Math.abs(ratio - RATIO[a]) - Math.abs(ratio - RATIO[b]);
    return distance !== 0 ? distance : RATIO[a] - RATIO[b];
  })[0];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/pose-edit/aspect.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/service/pose-edit/aspect.ts src/service/pose-edit/aspect.test.ts
git commit -m "Choose the pose edit still aspect from the source photo."
```

---

### Task 3: 提示詞與參考圖順序

**Files:**
- Create: `src/service/pose-edit/prompt.ts`
- Test: `src/service/pose-edit/prompt.test.ts`

**Interfaces:**
- Consumes: `PoseEditWardrobe` from Task 1
- Produces:
  - `poseEditReferenceUrls({ sourceUrl, poseReferenceUrl }): string[]`。順序是原圖，然後才是骨架。沒有骨架時只有原圖。
  - `poseEditPrompt({ posePrompt?, wardrobePrompts, coversLegs }): string`。英文。要求保住臉、身份、身體、背景、光線，以及沒列出的衣服。禁止畫出骨架線或點。

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { poseEditPrompt, poseEditReferenceUrls } from "@/service/pose-edit/prompt";

test("poseEditReferenceUrls puts the photo before the skeleton", () => {
  assert.deepEqual(
    poseEditReferenceUrls({ sourceUrl: "https://cdn.example/photo.jpg", poseReferenceUrl: "https://cdn.example/skeleton.png" }),
    ["https://cdn.example/photo.jpg", "https://cdn.example/skeleton.png"],
  );
  assert.deepEqual(poseEditReferenceUrls({ sourceUrl: "https://cdn.example/photo.jpg" }), [
    "https://cdn.example/photo.jpg",
  ]);
});

test("poseEditPrompt names only the selected pose and garments", () => {
  const prompt = poseEditPrompt({
    posePrompt: "A person stands upright.",
    wardrobePrompts: { top: "a white tee" },
    coversLegs: false,
  });
  assert.match(prompt, /first image/i);
  assert.match(prompt, /face/i);
  assert.match(prompt, /do not draw skeleton/i);
  assert.match(prompt, /A person stands upright/);
  assert.match(prompt, /a white tee/);
  assert.doesNotMatch(prompt, /pants/i);
  const dress = poseEditPrompt({ wardrobePrompts: { top: "a red dress" }, coversLegs: true });
  assert.match(dress, /covers the legs/i);
  assert.doesNotMatch(dress, /second image/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/pose-edit/prompt.test.ts`

Expected: FAIL，模組不存在。

- [ ] **Step 3: Write minimal implementation**

```ts
import type { PoseEditPart } from "@/service/pose-edit/selection";

const PART_LINE: Record<PoseEditPart, string> = {
  top: "Change only the top to",
  pants: "Change only the pants to",
  shoes: "Change only the shoes to",
  accessory: "Change only the accessory to",
};

export function poseEditReferenceUrls(input: { sourceUrl: string; poseReferenceUrl?: string }) {
  return input.poseReferenceUrl ? [input.sourceUrl, input.poseReferenceUrl] : [input.sourceUrl];
}

export function poseEditPrompt(input: {
  posePrompt?: string;
  wardrobePrompts: Partial<Record<PoseEditPart, string>>;
  coversLegs: boolean;
}) {
  const lines = [
    "Edit the person in the first image. Keep their face, identity, body, background, and lighting. If the pose changes, framing may follow the new pose. Keep every garment that is not listed below exactly as in the photo. Do not draw skeleton lines, dots, or a stick figure.",
  ];
  if (input.posePrompt) {
    lines.push(`The second image is a pose skeleton. Match that body pose. Pose: ${input.posePrompt}`);
  }
  for (const part of ["top", "pants", "shoes", "accessory"] as const) {
    const text = input.wardrobePrompts[part];
    if (text) lines.push(`${PART_LINE[part]}: ${text}`);
  }
  if (input.coversLegs) lines.push("This top covers the legs. Do not add separate pants.");
  return lines.join("\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/pose-edit/prompt.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/service/pose-edit/prompt.ts src/service/pose-edit/prompt.test.ts
git commit -m "Describe a pose edit with the photo before the pose skeleton."
```

---

### Task 4: 姿勢與衣服目錄

**Files:**
- Create: `src/service/pose-edit/catalog.ts`
- Test: `src/service/pose-edit/catalog.test.ts`

**Interfaces:**
- Consumes: `LIFE_POSES`、`lifePosePreviewSrc`、`lifePoseImagePath`、`LIFE_POSE_NAMES_ZH`、`optionsForLookPart`、`characterLookPreviewSrc`
- Produces:
  - `listPoseCatalog(appUrl: string): Array<{ id: string; group: string; framing: string; hands: string[]; label: string; previewUrl: string; skeletonUrl: string }>`
  - `listOutfitCatalog(appUrl: string): Array<{ id: string; part: "top" | "pants" | "shoes" | "accessory"; label: string; previewUrl: string }>`
  - 衣服 `label` 用 `option.description`（trim 後非空）；否則用 `id`。不用 `prompt`。`previewUrl` 空字串的項目不回傳。不回髮型、不回 `none`。

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { listOutfitCatalog, listPoseCatalog } from "@/service/pose-edit/catalog";

test("listPoseCatalog returns absolute preview urls and a Traditional Chinese label", () => {
  const rows = listPoseCatalog("https://www.scro.io");
  const pose = rows.find((row) => row.id === "standing-arms-relaxed");
  assert.ok(pose);
  assert.equal(pose?.previewUrl.startsWith("https://www.scro.io/life-pose-previews/"), true);
  assert.equal(pose?.skeletonUrl, "https://www.scro.io/life-poses/standing-arms-relaxed.png");
  assert.equal(typeof pose?.label, "string");
  assert.equal(rows.some((row) => "promptText" in row), false);
});

test("listOutfitCatalog is tops, pants, shoes, and accessories with pictures", () => {
  const rows = listOutfitCatalog("https://www.scro.io");
  assert.equal(rows.length > 0, true);
  assert.equal(rows.every((row) => ["top", "pants", "shoes", "accessory"].includes(row.part)), true);
  assert.equal(rows.some((row) => row.id === "none"), false);
  assert.equal(rows.every((row) => row.previewUrl.startsWith("https://www.scro.io/character-looks/")), true);
  const jeans = rows.find((row) => row.id === "jeans");
  assert.equal(jeans?.label, "jeans");
});
```

`jeans` 只有 `prompt`、沒有 `description`，所以標籤是 `id`。若測試失敗是因為它其實有短 description，把預期改成那個 description，不要改成整段 prompt。

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/pose-edit/catalog.test.ts`

Expected: FAIL，模組不存在。

- [ ] **Step 3: Write minimal implementation**

```ts
import { LIFE_POSES, lifePoseImagePath, lifePosePreviewSrc } from "@/model/life-pose";
import { LIFE_POSE_NAMES_ZH } from "@/util/i18n/messages/life-poses.names";
import {
  characterLookPreviewSrc,
  optionsForLookPart,
  type CharacterLookOption,
} from "@/service/character/character-look";
import { POSE_EDIT_PARTS, type PoseEditPart } from "@/service/pose-edit/selection";

function absolute(appUrl: string, path: string) {
  return `${appUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

function outfitLabel(option: CharacterLookOption) {
  const description = option.description?.trim();
  return description || option.id;
}

export function listPoseCatalog(appUrl: string) {
  return LIFE_POSES.map((pose) => ({
    id: pose.id,
    group: pose.group,
    framing: pose.framing,
    hands: pose.hands,
    label: LIFE_POSE_NAMES_ZH[pose.id] ?? pose.id,
    previewUrl: absolute(appUrl, lifePosePreviewSrc(pose.id)),
    skeletonUrl: absolute(appUrl, lifePoseImagePath(pose.id)),
  }));
}

export function listOutfitCatalog(appUrl: string) {
  const rows: Array<{ id: string; part: PoseEditPart; label: string; previewUrl: string }> = [];
  for (const part of POSE_EDIT_PARTS) {
    for (const option of optionsForLookPart(part)) {
      if (option.id === "none") continue;
      const preview = characterLookPreviewSrc(part, option.id);
      if (!preview) continue;
      rows.push({ id: option.id, part, label: outfitLabel(option), previewUrl: absolute(appUrl, preview) });
    }
  }
  return rows;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/pose-edit/catalog.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/service/pose-edit/catalog.ts src/service/pose-edit/catalog.test.ts
git commit -m "Expose the pose library and wardrobe parts for the pose app."
```

---

### Task 5: 改圖文件、DTO、退點條件

**Files:**
- Create: `src/model/pose-edit.ts`
- Create: `src/dao/pose-edits.ts`
- Create: `src/service/pose-edit/dto.ts`
- Create: `src/service/pose-edit/fail.ts`
- Modify: `src/dao/index.ts`
- Test: `src/service/pose-edit/dto.test.ts`

**Interfaces:**
- Consumes: `POSE_EDIT_ERRORS`、`PoseEditWardrobe`、`PoseEditAspect`
- Produces:
  - `PoseEdit` 文件。內部欄位 `aspect` 不出現在 DTO。
  - `poseEditsCollection(): Promise<Collection<OptionalId<PoseEdit>>>`，集合名 `pose_edits`，索引 `{ clerkUserId: 1, createdAt: -1 }`。
  - `toPoseEditDto(edit: PoseEdit): PoseEditDto`
  - `poseEditShouldRefund(modifiedCount: number): boolean`，只有 `modifiedCount === 1` 為 true。
  - `poseEditFailureFilter(id: ObjectId)` 為 `{ _id: id, status: "pending", spendKey: { $type: "string" } }`。

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import { toPoseEditDto } from "@/service/pose-edit/dto";
import { poseEditFailureFilter, poseEditShouldRefund } from "@/service/pose-edit/fail";
import type { PoseEdit } from "@/model/pose-edit";

test("toPoseEditDto hides the spend key and uses the result only when completed", () => {
  const createdAt = new Date("2026-10-25T00:00:00.000Z");
  const edit: PoseEdit = {
    _id: new ObjectId(),
    clerkUserId: "uid",
    sourceUrl: "https://cdn.example/source.jpg",
    poseId: "standing-arms-relaxed",
    wardrobe: { top: "alredscoopdress" },
    aspect: "3:4",
    status: "pending",
    spendKey: "spend-1",
    createdAt,
    updatedAt: createdAt,
  };
  const dto = toPoseEditDto(edit);
  assert.equal(dto.status, "pending");
  assert.equal(dto.resultUrl, undefined);
  assert.equal("spendKey" in dto, false);
  assert.equal("aspect" in dto, false);
  assert.equal(dto.createdAt, "2026-10-25T00:00:00.000Z");
});

test("poseEditShouldRefund is true only for the update that cleared spendKey", () => {
  assert.equal(poseEditShouldRefund(1), true);
  assert.equal(poseEditShouldRefund(0), false);
  const id = new ObjectId();
  assert.deepEqual(poseEditFailureFilter(id), {
    _id: id,
    status: "pending",
    spendKey: { $type: "string" },
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/pose-edit/dto.test.ts`

Expected: FAIL，模組不存在。

- [ ] **Step 3: Write minimal implementation**

`src/model/pose-edit.ts`：`PoseEdit` 含 `_id`、`clerkUserId`、`sourceUrl`、`poseId?`、`wardrobe`、`aspect`、`status`、`resultUrl?`、`error?`、`spendKey?`、`createdAt`、`updatedAt`。`status` 只有 `pending | completed | failed`。

`src/dao/pose-edits.ts`：`db.collection<OptionalId<PoseEdit>>("pose_edits")`。第一次呼叫 `createIndex({ clerkUserId: 1, createdAt: -1 })`。

`src/dao/index.ts`：加上 `export { poseEditsCollection } from "@/dao/pose-edits";`

`src/service/pose-edit/dto.ts`：

```ts
import type { PoseEdit } from "@/model/pose-edit";
import type { PoseEditWardrobe } from "@/service/pose-edit/selection";

export type PoseEditDto = {
  id: string;
  status: PoseEdit["status"];
  sourceUrl: string;
  resultUrl?: string;
  poseId?: string;
  wardrobe: PoseEditWardrobe;
  error?: string;
  createdAt: string;
};

export function toPoseEditDto(edit: PoseEdit): PoseEditDto {
  return {
    id: edit._id.toHexString(),
    status: edit.status,
    sourceUrl: edit.sourceUrl,
    ...(edit.resultUrl ? { resultUrl: edit.resultUrl } : {}),
    ...(edit.poseId ? { poseId: edit.poseId } : {}),
    wardrobe: edit.wardrobe,
    ...(edit.error ? { error: edit.error } : {}),
    createdAt: edit.createdAt.toISOString(),
  };
}
```

`src/service/pose-edit/fail.ts`：

```ts
import type { ObjectId } from "mongodb";

export function poseEditShouldRefund(modifiedCount: number) {
  return modifiedCount === 1;
}

export function poseEditFailureFilter(id: ObjectId) {
  return { _id: id, status: "pending" as const, spendKey: { $type: "string" as const } };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/pose-edit/dto.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/model/pose-edit.ts src/dao/pose-edits.ts src/dao/index.ts src/service/pose-edit/dto.ts src/service/pose-edit/fail.ts src/service/pose-edit/dto.test.ts
git commit -m "Store pose edits separately from characters and life shots."
```

---

### Task 6: `poseEdit` 生圖工作

**Files:**
- Modify: `src/model/generation-job.ts`（`GenerationKind` 與 zod enum 加 `"poseEdit"`；文件加可選 `poseEditId?: ObjectId`）
- Modify: `src/service/generation/job-registry.ts`（`SELF_SYNCING_JOB_KINDS` 加 `"poseEdit"`，handler 呼叫 `syncPoseEditJob` / `failPoseEdit`）
- Modify: `src/service/generation/task-senders.ts`（`job.kind === "poseEdit"` 時呼叫 `sendPoseEdit`，要在 `if (!job.projectId)` 之前）
- Modify: `src/service/generation/task-list.ts`（`taskDetail` 與 `taskDetailI18n` 在 clip fallback 之前處理 `poseEdit`）
- Modify: `src/util/i18n/messages/workspace/tasks.en.ts` 與 `tasks.zh-Hant.ts`（`detail.poseEdit`）
- Modify: `src/service/google/studio-image.ts`（`aspectRatio` 型別加上 `"3:4"`）
- Create: `src/service/pose-edit/submit-input.ts`
- Create: `src/service/pose-edit/send.ts`
- Create: `src/service/pose-edit/sync.ts`
- Test: `src/service/pose-edit/submit-input.test.ts`
- Test: `src/service/generation/task-list.test.ts`（加一則 `poseEdit`）

**Interfaces:**
- Consumes: `poseEditPrompt`、`poseEditReferenceUrls`、`poseEditShouldRefund`、`poseEditFailureFilter`、`POSE_EDIT_ERRORS`、`lifePoseById`、`lifePoseReferenceUrl`、`wardrobePickPrompts`、`isFullBodyTop`、`submitGoogleStudioImage`、`toSent`、`persistMedia`、`refundCredits`、`FRAME_COST`、`insertPendingJob`、`kickJob`
- Produces:
  - `poseEditSubmitInput(edit: Pick<PoseEdit, "sourceUrl" | "poseId" | "wardrobe" | "aspect">, poseReferenceUrl?: string): { prompt: string; aspectRatio: PoseEditAspect; referenceImageUrls: string[] }`
  - `sendPoseEdit(job: GenerationJob): Promise<Sent>`。沒有 `poseEditId` 或文件不在時丟 `PermanentJobError("找不到改圖")`。呼叫 `submitGoogleStudioImage`，不要呼叫 `submitImage`（它的比例型別沒有 `3:4`）。
  - `syncPoseEditJob(job, status, outputUrl?)`。`completed` 且有 `outputUrl` 時 `persistMedia` 到 `explainer/pose-edits/${id}/result`，把文件改成 `completed` 並 `$unset` `spendKey`，不退點。`failed` 與 `nsfw` 呼叫 `failPoseEdit`。其他狀態不改文件，讓它維持 `pending`。
  - `failPoseEdit(id, error)`：用 `poseEditFailureFilter` 更新。`poseEditShouldRefund` 為 true 才 `refundCredits(clerkUserId, FRAME_COST, spendKey)`。退點丟出例外時把 `spendKey` 與 `status: "pending"` 寫回去再拋出。`status === "completed"` 的文件不改。
  - `enqueuePoseEdit(editId: ObjectId)`：`insertPendingJob({ poseEditId, clipIndex: -1, kind: "poseEdit", model: NANO_BANANA_PRO_IMAGE_MODEL })` 然後 `kickJob`。

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { poseEditSubmitInput } from "@/service/pose-edit/submit-input";

test("poseEditSubmitInput keeps the photo first and covers legs for a full-body top", () => {
  const input = poseEditSubmitInput(
    {
      sourceUrl: "https://cdn.example/photo.jpg",
      poseId: "standing-arms-relaxed",
      wardrobe: { top: "alredscoopdress" },
      aspect: "3:4",
    },
    "https://cdn.example/skeleton.png",
  );
  assert.deepEqual(input.referenceImageUrls, [
    "https://cdn.example/photo.jpg",
    "https://cdn.example/skeleton.png",
  ]);
  assert.equal(input.aspectRatio, "3:4");
  assert.match(input.prompt, /covers the legs/i);
  assert.match(input.prompt, /stands upright/i);
});
```

在 `src/service/generation/task-list.test.ts` 加上：

```ts
assert.equal(taskDetail({ kind: "poseEdit", clipIndex: -1 }), "改圖");
assert.deepEqual(taskDetailI18n({ kind: "poseEdit", clipIndex: -1 }), {
  detailKey: "tasksPage.detail.poseEdit",
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/pose-edit/submit-input.test.ts src/service/generation/task-list.test.ts`

Expected: FAIL，`poseEditSubmitInput` 不存在，且 `taskDetail` 還沒有「改圖」。

- [ ] **Step 3: Write minimal implementation**

`src/service/pose-edit/submit-input.ts`：

```ts
import { lifePoseById } from "@/model/life-pose";
import type { PoseEdit } from "@/model/pose-edit";
import { isFullBodyTop, wardrobePickPrompts } from "@/service/character/character-look";
import { poseEditPrompt, poseEditReferenceUrls } from "@/service/pose-edit/prompt";

export function poseEditSubmitInput(
  edit: Pick<PoseEdit, "sourceUrl" | "poseId" | "wardrobe" | "aspect">,
  poseReferenceUrl?: string,
) {
  const prompts = wardrobePickPrompts(edit.wardrobe);
  return {
    prompt: poseEditPrompt({
      posePrompt: lifePoseById(edit.poseId)?.promptText,
      wardrobePrompts: {
        top: prompts.top,
        pants: prompts.pants,
        shoes: prompts.shoes,
        accessory: prompts.accessory,
      },
      coversLegs: isFullBodyTop(edit.wardrobe.top),
    }),
    aspectRatio: edit.aspect,
    referenceImageUrls: poseEditReferenceUrls({
      sourceUrl: edit.sourceUrl,
      poseReferenceUrl,
    }),
  };
}
```

`send.ts` 讀 `poseEditsCollection`。沒有 `poseEditId` 或找不到文件時丟 `PermanentJobError("找不到改圖")`。有 `poseId` 才 `await lifePoseReferenceUrl(edit.poseId)`。然後 `return toSent(NANO_BANANA_PRO_IMAGE_MODEL, await submitGoogleStudioImage({ ...poseEditSubmitInput(edit, poseReferenceUrl), resolution: "1k" }))`。

`failPoseEdit` 用 `poseEditFailureFilter` 做條件更新，寫入傳入的短句並 `$unset` `spendKey`。`poseEditShouldRefund(modifiedCount)` 為 true 才 `refundCredits(existing.clerkUserId, FRAME_COST, spendKey)`。退點丟出例外時把 `spendKey` 與 `status: "pending"` 寫回再拋出。`status === "completed"` 直接 return。`enqueuePoseEdit` 用 `insertPendingJob({ poseEditId, clipIndex: -1, kind: "poseEdit", model: NANO_BANANA_PRO_IMAGE_MODEL })` 與 `kickJob`。`syncPoseEditJob` 在 `nsfw` 時呼叫 `failPoseEdit(id, POSE_EDIT_ERRORS.nsfw)`，在 `failed` 時呼叫 `failPoseEdit(id, POSE_EDIT_ERRORS.failed)`。`completed` 且有 `outputUrl` 時先 `persistMedia(outputUrl, "explainer/pose-edits/${id}/result")`，再把 `status` 設成 `completed`、寫入 `resultUrl`、`$unset` `spendKey`，不退點。保存失敗則 `failPoseEdit(id, POSE_EDIT_ERRORS.failed)`。

`studio-image.ts` 的 `aspectRatio` 參數改成 `AspectRatio | "2:3" | "3:4"`。只加型別，不改現有呼叫。

`job-registry.ts` 的 `poseEdit` handler：

```ts
poseEdit: {
  syncStatus: (job, status, outputUrl) => syncPoseEditJob(job, status, outputUrl),
  failClaimed: (job) => {
    if (!job.poseEditId) return Promise.resolve();
    return failPoseEdit(job.poseEditId, POSE_EDIT_ERRORS.failed);
  },
},
```

`failClaimed` 忽略佇列傳來的供應商原文，文件上的 `error` 只用「改圖失敗」。`nsfw` 只走 `syncPoseEditJob`。

`task-list.ts`：`poseEdit` 回「改圖」與 `tasksPage.detail.poseEdit`。英文 `"Pose edit"`，繁體「改圖」。不要改 `jobListQuery`。

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/pose-edit/submit-input.test.ts src/service/generation/task-list.test.ts src/service/generation/job-registry.test.ts`

Expected: PASS。接著 `npx tsc --noEmit`，預期 `poseEdit` 加入 union 後沒有型別錯誤。

- [ ] **Step 5: Commit**

```bash
git add src/model/generation-job.ts src/service/generation/job-registry.ts src/service/generation/task-senders.ts src/service/generation/task-list.ts src/service/generation/task-list.test.ts src/util/i18n/messages/workspace/tasks.en.ts src/util/i18n/messages/workspace/tasks.zh-Hant.ts src/service/google/studio-image.ts src/service/pose-edit/submit-input.ts src/service/pose-edit/submit-input.test.ts src/service/pose-edit/send.ts src/service/pose-edit/sync.ts
git commit -m "Queue pose edits on the existing still generator."
```

---

### Task 7: 建立改圖與 HTTP 路由

**Files:**
- Create: `src/service/pose-edit/image.ts`
- Create: `src/service/pose-edit/create.ts`
- Create: `src/presentation/api/v1/poses/route.ts`
- Create: `src/app/api/v1/poses/route.ts`
- Create: `src/presentation/api/v1/outfits/route.ts`
- Create: `src/app/api/v1/outfits/route.ts`
- Create: `src/presentation/api/v1/pose-edits/route.ts`
- Create: `src/app/api/v1/pose-edits/route.ts`
- Create: `src/presentation/api/v1/pose-edits/[id]/route.ts`
- Create: `src/app/api/v1/pose-edits/[id]/route.ts`
- Test: `src/service/pose-edit/image.test.ts`
- Test: `src/service/pose-edit/create.test.ts`

**Interfaces:**
- Consumes: Tasks 1–6 的匯出、`assertCanSpendCredits`、`consumeCredits`、`failPoseEdit`、`FRAME_COST`、`getAppUrl`、`withApiUser`、`apiJson`、`apiError`
- Produces:
  - `sniffPoseEditImage(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null`
  - `POSE_EDIT_MAX_BYTES = 8 * 1024 * 1024`
  - `createPoseEdit({ user, bytes, fields, deps })`。順序：`parsePoseEditSelection` → 檔案大小與 sniff → `poseEditAspect` → `assertCanSpend` → `upload` → `consume` → `insert` → `enqueue`。`assert` 或 `enqueue` 失敗時不留下已扣點的成功文件。`enqueue` 失敗要退點並把文件標 `failed`。
  - `GET /api/v1/poses`、`GET /api/v1/outfits`、`GET /api/v1/pose-edits`、`GET /api/v1/pose-edits/:id`、`POST /api/v1/pose-edits`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { POSE_EDIT_MAX_BYTES, sniffPoseEditImage } from "@/service/pose-edit/image";
import { createPoseEdit } from "@/service/pose-edit/create";
import type { AppUser } from "@/model/user";

test("sniffPoseEditImage accepts jpeg, png, and webp magic bytes", () => {
  assert.equal(sniffPoseEditImage(Uint8Array.of(0xff, 0xd8, 0xff, 0x00)), "image/jpeg");
  assert.equal(sniffPoseEditImage(Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0)), "image/png");
  const webp = new Uint8Array(12);
  webp.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
  assert.equal(sniffPoseEditImage(webp), "image/webp");
  assert.equal(sniffPoseEditImage(Uint8Array.of(0, 1, 2, 3)), null);
  assert.equal(POSE_EDIT_MAX_BYTES, 8 * 1024 * 1024);
});

test("createPoseEdit does not upload when credits are refused", async () => {
  let uploaded = false;
  const result = await createPoseEdit({
    user: { clerkUserId: "uid", credits: 0 } as AppUser,
    bytes: Uint8Array.of(0xff, 0xd8, 0xff, 0x00),
    fields: { poseId: "standing-arms-relaxed" },
    deps: {
      assertCanSpend: async () => {
        throw new Error("credits 不足，請加購或升級方案");
      },
      upload: async () => {
        uploaded = true;
        return "https://cdn.example/source.jpg";
      },
      consume: async () => "spend",
      insert: async () => {
        throw new Error("insert should not run");
      },
      enqueue: async () => undefined,
      fail: async () => undefined,
      readSize: async () => ({ width: 300, height: 400 }),
    },
  });
  assert.deepEqual(result, { ok: false, status: 400, error: "credits 不足，請加購或升級方案" });
  assert.equal(uploaded, false);
});
```

同一檔再加這兩則。`enqueue` 失敗只會呼叫一次 `deps.fail`，由 `failPoseEdit` 負責退點，`createPoseEdit` 不要再呼叫 `refundCredits`。

```ts
test("createPoseEdit fails the edit once when enqueue throws", async () => {
  let fails = 0;
  const result = await createPoseEdit({
    user: { clerkUserId: "uid", credits: 4 } as AppUser,
    bytes: Uint8Array.of(0xff, 0xd8, 0xff, 0x00),
    fields: { poseId: "standing-arms-relaxed" },
    deps: {
      assertCanSpend: async () => undefined,
      upload: async () => "https://cdn.example/source.jpg",
      consume: async () => "spend-1",
      insert: async (draft) => ({
        ...draft,
        _id: new ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      enqueue: async () => {
        throw new Error("queue down");
      },
      fail: async () => {
        fails += 1;
      },
      readSize: async () => ({ width: 300, height: 400 }),
    },
  });
  assert.equal(fails, 1);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.dto.status, "failed");
});

test("createPoseEdit rejects an empty selection before the credit check", async () => {
  let checked = false;
  const result = await createPoseEdit({
    user: { clerkUserId: "uid", credits: 4 } as AppUser,
    bytes: Uint8Array.of(0xff, 0xd8, 0xff, 0x00),
    fields: {},
    deps: {
      assertCanSpend: async () => {
        checked = true;
      },
      upload: async () => "https://cdn.example/source.jpg",
      consume: async () => "spend-1",
      insert: async () => {
        throw new Error("insert should not run");
      },
      enqueue: async () => undefined,
      fail: async () => undefined,
      readSize: async () => ({ width: 300, height: 400 }),
    },
  });
  assert.deepEqual(result, { ok: false, status: 400, error: "請選姿勢或至少一件衣服" });
  assert.equal(checked, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/pose-edit/image.test.ts src/service/pose-edit/create.test.ts`

Expected: FAIL，模組不存在。

- [ ] **Step 3: Write minimal implementation**

`image.ts` 用 magic bytes。jpeg 是 `FF D8 FF`，png 是 `89 50 4E 47`，webp 是 `RIFF` 加偏移 8 的 `WEBP`。

`create.ts` 的 `deps` 預設值使用真實的 `assertCanSpendCredits`、`consumeCredits`、`sharp(buffer).metadata()`、`@vercel/blob` 的 `put`（路徑 `explainer/pose-edits/${clerkUserId}/${Date.now()}-source`）、`poseEditsCollection().insertOne`、`enqueuePoseEdit`、`failPoseEdit`。`BLOB_READ_WRITE_TOKEN` 未設定時回 400「尚未設定 Vercel Blob」。位元組為 0 或大於 8MB，或 sniff 為 null，回 `POSE_EDIT_ERRORS.file`。`assertCanSpend` 的訊息若是訂閱或點數那兩句，回 400；其他例外照拋。`enqueue` 失敗時只呼叫一次 `deps.fail(id, POSE_EDIT_ERRORS.failed)`，不要再直接 `refundCredits`。回 201 與 `status: "failed"` 的 DTO，客戶端看得到原因而不會再送一次。

路由：

- `src/app/api/v1/poses/route.ts` 只寫 `runtime = "nodejs"`、`dynamic = "force-dynamic"`，並 re-export `GET`。
- presentation `GET`：`apiJson(listPoseCatalog(getAppUrl()))`。outfits 相同。
- `POST /pose-edits`：content-type 必須含 `multipart/form-data`，否則 `apiError("請用 multipart/form-data 上傳")`。欄位 `file`、`poseId`、`top`、`pants`、`shoes`、`accessory`。`file` 不是 `File` 時回檔案錯誤。成功 `apiJson(dto, 201)`。
- `GET /pose-edits`：`find({ clerkUserId }).sort({ createdAt: -1 }).limit(30)`。
- `GET /pose-edits/:id`：`ObjectId.isValid` 且 `clerkUserId` 相符才回 DTO，否則 `apiError(POSE_EDIT_ERRORS.missing, 404)`。

未授權沿用 `withApiUser` 的 401 `{ error: "Unauthorized" }`。

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/pose-edit/*.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/service/pose-edit/image.ts src/service/pose-edit/image.test.ts src/service/pose-edit/create.ts src/service/pose-edit/create.test.ts src/presentation/api/v1/poses src/presentation/api/v1/outfits src/presentation/api/v1/pose-edits src/app/api/v1/poses src/app/api/v1/outfits src/app/api/v1/pose-edits
git commit -m "Accept a photo and queue a pose edit over the API."
```

---

### Task 8: Flutter 專案骨架

**Files:**
- Create: `/Users/jefflee/Projects/Explainer.io/scro-pose` 由 `flutter create` 產生
- Modify: `android/app/build.gradle.kts` 的 `applicationId`
- Modify: `ios/Runner.xcodeproj/project.pbxproj` 的 `PRODUCT_BUNDLE_IDENTIFIER`
- Modify: `ios/Runner/Info.plist`
- Modify: `android/app/src/main/AndroidManifest.xml`
- Create: `lib/core/config/app_config.dart`
- Create: `lib/core/config/firebase_options.dart`

**Interfaces:**
- Consumes: none
- Produces: 套件 `scro_pose`，bundle id `io.scro.pose`，`AppConfig.apiBaseUrl`，`ScroFirebaseOptions.isConfigured`。目錄若還不是 git repo，先 `git init`。

- [ ] **Step 1: Create the project**

在空的 `scro-pose` 目錄執行：

```bash
flutter create --org io.scro --project-name scro_pose .
```

把 Android `applicationId` 改成 `io.scro.pose`。把 iOS 每個 `PRODUCT_BUNDLE_IDENTIFIER` 裡的 Runner target 改成 `io.scro.pose`（測試 target 維持 `.RunnerTests` 後綴）。

`Info.plist` 加上：

```xml
<key>NSCameraUsageDescription</key>
<string>拍照後用來改姿勢和衣服。</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>從相簿選一張照片來改姿勢和衣服。</string>
```

`AndroidManifest.xml` 的 `<manifest>` 內加上 `<uses-permission android:name="android.permission.CAMERA"/>`。

`lib/core/config/app_config.dart`：

```dart
class AppConfig {
  AppConfig._();

  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://www.scro.io',
  );

  static String get apiRoot => '$apiBaseUrl/api/v1';
}
```

`lib/core/config/firebase_options.dart`：

```dart
import 'package:firebase_core/firebase_core.dart';

class ScroFirebaseOptions {
  ScroFirebaseOptions._();

  static bool get isConfigured => false;

  static FirebaseOptions get current =>
      throw UnsupportedError('Firebase 尚未設定');
}
```

`pubspec.yaml` 加上與 `explainer-app` 相同主要版本的：`firebase_core`、`firebase_auth`、`google_sign_in`、`flutter_riverpod`、`go_router`、`dio`、`image_picker`、`flutter_image_compress`。執行 `flutter pub get`。

不要執行 `flutterfire configure`，也不要寫入別人的 API key。`isConfigured` 維持 false，直到這個專案在 `scro-explainer` 登記了 `io.scro.pose` 之後再換掉這個檔。

- [ ] **Step 2: Run analyzer**

Run: `flutter analyze`

Expected: 沒有 error。

- [ ] **Step 3: Commit**

```bash
git init
git add .
git commit -m "Create the scro pose Flutter app shell."
```

不要提交 `build/`。若 `flutter create` 沒有 `.gitignore`，補上 Flutter 預設忽略清單後再提交。

---

### Task 9: 登入

**Files:**
- Create: `lib/core/auth/auth_service.dart`
- Create: `lib/core/router/app_router.dart`
- Create: `lib/features/auth/sign_in_page.dart`
- Modify: `lib/main.dart`
- Test: `test/sign_in_page_test.dart`

**Interfaces:**
- Consumes: `ScroFirebaseOptions.isConfigured`
- Produces: `AuthService.signInWithEmail`、`signUpWithEmail`、`signInWithGoogle`、`signOut`。未設定 Firebase 時不呼叫 `FirebaseAuth`。路由：未登入或未設定時停在 `/sign-in`。

- [ ] **Step 1: Write the failing test**

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:scro_pose/features/auth/sign_in_page.dart';

void main() {
  testWidgets('unconfigured Firebase shows the setup message', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(home: SignInPage(firebaseConfigured: false)),
    );
    expect(find.text('Firebase 尚未設定'), findsOneWidget);
    expect(find.text('登入'), findsNothing);
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `flutter test test/sign_in_page_test.dart`

Expected: FAIL，`SignInPage` 尚未有 `firebaseConfigured`。

- [ ] **Step 3: Write minimal implementation**

`AuthService` 比照 `explainer-app/lib/core/auth/auth_providers.dart` 的 email 與 Google 流程。`signInWithGoogle` 使用 `GoogleSignIn.instance.initialize` 與 `authenticate`。

`SignInPage` 在 `firebaseConfigured == false` 時只顯示「Firebase 尚未設定」。否則顯示 email、密碼、「登入」、「註冊」切換與「用 Google 登入」。錯誤沿用 Firebase 的 `invalid-credential`、`email-already-in-use`、`weak-password`、`invalid-email`，文案分別是「帳號或密碼不對」、「這個 email 已註冊」、「密碼太弱」、「email 格式不對」。

`main.dart`：`WidgetsFlutterBinding.ensureInitialized()`。只有 `isConfigured` 為 true 且 `Firebase.apps.isEmpty` 才 `Firebase.initializeApp`。`duplicate-app` 忽略。用 `ProviderScope`。

`app_router.dart`：`isConfigured` 為 false，或 auth stream 為 null，就停在登入頁。已登入進 `/studio`。

- [ ] **Step 4: Run test to verify it passes**

Run: `flutter test test/sign_in_page_test.dart`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib test
git commit -m "Sign in to the pose app with the Scro Firebase account."
```

---

### Task 10: API client

**Files:**
- Create: `lib/data/pose_models.dart`
- Create: `lib/data/pose_api.dart`
- Test: `test/pose_api_test.dart`

**Interfaces:**
- Consumes: `AppConfig.apiRoot`
- Produces:
  - `PoseCatalogItem`、`OutfitCatalogItem`、`PoseEditDto`（欄位與規格 DTO 相同）
  - `PoseApi`：`poses()`、`outfits()`、`listEdits()`、`getEdit(id)`、`createEdit({ file, poseId, top, pants, shoes, accessory })`
  - `PoseApiException(message, statusCode)`。401 用同一個型別，`statusCode == 401`。
  - `createEdit` 的 `Dio` 設定 `extra: {'noRetry': true}`，攔截器看到這個標記就不重試。GET 連線失敗重試一次。

- [ ] **Step 1: Write the failing test**

用 `dio` 的 `HttpClientAdapter` 假回應。第一則：`POST /pose-edits` 第一次連線失敗時呼叫次數是 1，並丟出例外。第二則：`GET /poses` 第一次失敗、第二次回 `[]`，結果是空清單。第三則：HTTP 400 `{ "error": "請選姿勢或至少一件衣服" }` 變成 `PoseApiException` 的那個訊息。

- [ ] **Step 2: Run test to verify it fails**

Run: `flutter test test/pose_api_test.dart`

Expected: FAIL，`PoseApi` 不存在。

- [ ] **Step 3: Write minimal implementation**

`PoseApi` 建構子接收 `Dio` 與 `Future<String?> Function() readToken`。每次請求設定 `Authorization: Bearer`。token 為 null 時丟 `PoseApiException('Unauthorized', 401)`。`createEdit` 用 `FormData`，檔案欄位名 `file`。JSON 解析只讀規格列出的欄位。

- [ ] **Step 4: Run test to verify it passes**

Run: `flutter test test/pose_api_test.dart`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/data test/pose_api_test.dart
git commit -m "Call the pose edit API with the Firebase ID token."
```

---

### Task 11: 可以送出的條件與照片轉 jpeg

**Files:**
- Create: `lib/features/studio/generate_gate.dart`
- Create: `lib/features/studio/photo_file.dart`
- Create: `lib/features/studio/generate_button.dart`
- Test: `test/generate_gate_test.dart`

**Interfaces:**
- Consumes: none
- Produces:
  - `canGeneratePoseEdit({ required bool hasPhoto, required bool hasPose, required bool hasPart, required bool pending })`
  - `GenerateButton` 顯示「產生新圖 · 4 credits」。`canGenerate` 為 false 時 `onPressed` 是 null。
  - `jpegPhoto(XFile picked): Future<File>`。用 `FlutterImageCompress.compressWithFile(..., format: CompressFormat.jpeg, quality: 90)`。結果仍大於 8MB 時再壓一次 quality 70。還是太大或壓縮結果為 null，丟 `PhotoEncodeException('請上傳 8MB 以內的 jpeg、png 或 webp')`。

- [ ] **Step 1: Write the failing test**

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:scro_pose/features/studio/generate_button.dart';
import 'package:scro_pose/features/studio/generate_gate.dart';

void main() {
  test('photo alone cannot generate', () {
    expect(
      canGeneratePoseEdit(hasPhoto: true, hasPose: false, hasPart: false, pending: false),
      isFalse,
    );
    expect(
      canGeneratePoseEdit(hasPhoto: true, hasPose: true, hasPart: false, pending: false),
      isTrue,
    );
    expect(
      canGeneratePoseEdit(hasPhoto: true, hasPose: false, hasPart: true, pending: false),
      isTrue,
    );
    expect(
      canGeneratePoseEdit(hasPhoto: true, hasPose: true, hasPart: true, pending: true),
      isFalse,
    );
  });

  testWidgets('pending button is disabled', (tester) async {
    var taps = 0;
    await tester.pumpWidget(
      MaterialApp(
        home: GenerateButton(canGenerate: false, onPressed: () => taps += 1),
      ),
    );
    await tester.tap(find.text('產生新圖 · 4 credits'));
    expect(taps, 0);
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `flutter test test/generate_gate_test.dart`

Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

`canGeneratePoseEdit`：`pending || !hasPhoto` 回 false；否則 `hasPose || hasPart`。

`GenerateButton` 是獨立檔。`photo_file.dart` 是獨立檔，函式如上。這個 task 的測試不讀真的 HEIC；壓縮函式留到手動驗收。iOS 的 `image_picker` 通常已給 jpeg，`FlutterImageCompress` 再保證輸出是 jpeg。

- [ ] **Step 4: Run test to verify it passes**

Run: `flutter test test/generate_gate_test.dart`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/features/studio/generate_gate.dart lib/features/studio/generate_button.dart lib/features/studio/photo_file.dart test/generate_gate_test.dart
git commit -m "Enable pose generation only when a photo and a change are chosen."
```

---

### Task 12: 工作室頁

**Files:**
- Create: `lib/features/studio/photo_source_bar.dart`
- Create: `lib/features/studio/pose_picker.dart`
- Create: `lib/features/studio/outfit_part_picker.dart`
- Create: `lib/features/studio/studio_page.dart`

**Interfaces:**
- Consumes: `PoseApi`、`canGeneratePoseEdit`、`jpegPhoto`、`GenerateButton`、`isFullBody` 由目錄項目的 id 決定。App 不複製 `isFullBodyTop` 的 id 清單。API 的 outfit 物件加一個欄位會擴大規格；因此連身衣的判斷放在伺服器已同意的行為上：客戶端維護與網站 `FULL_BODY_TOP` 相同的 id 集合是會漂移的。改為 `GET /api/v1/outfits` 每個 top 增加 `coversLegs: boolean`，由 `isFullBodyTop(id)` 填入。這是 Task 4 目錄的追加欄位，在本 task 一起補上後端測試：`alredscoopdress` 的 `coversLegs` 是 true，`jeans` 沒有這個欄位或為 false。
- Produces: 一頁工作室。空照片時「拍照」「從相簿選」。姿勢橫向清單，再點一次取消。四個部位。`coversLegs` 的上衣被選中時隱藏褲子並清掉已選褲子。送出呼叫 `createEdit`。失敗顯示回傳的 `error`，選擇保留。成功後把目前編輯設成回傳的 DTO，原圖與選擇留在頁上。

- [ ] **Step 1: Extend the outfit catalog test**

在 `catalog.test.ts` 斷言 `listOutfitCatalog` 裡 `alredscoopdress` 的 `coversLegs === true`，`jeans` 的 `coversLegs` 不是 true。先跑測試確認失敗，再在 `listOutfitCatalog` 的回傳加上 `coversLegs: part === "top" && isFullBodyTop(option.id)`。

Run: `npx tsx --test src/service/pose-edit/catalog.test.ts`

Expected: PASS

- [ ] **Step 2: Build the page widgets**

每個 widget 一個檔案，頂部不需要 `use client`（那是 Next.js）。有 `initState` 以外的生命週期時檔案仍是 Flutter widget，不必加指令。

`photo_source_bar.dart`：兩個 `FilledButton`，已有照片時改顯示 `Image.file` 與「重選」。

`pose_picker.dart`：`ListView.separated` scrollDirection horizontal，`Image.network(previewUrl)`，選取時加邊框。`onSelected(String? id)`。

`outfit_part_picker.dart`：四個標題「上衣」「褲子」「鞋」「配件」。`coversLegs` 為 true 時褲子那格顯示「這件上衣已包含下身」，不顯示格子。

`studio_page.dart`：`ConsumerStatefulWidget`。開啟時 `Future.wait` 讀 poses 與 outfits。401 時 `context.go('/sign-in')`。送出中 `pending` 為 true。不要在這個 task 輪詢；Task 13 接上。

- [ ] **Step 3: Analyze**

Run: `flutter analyze`

Expected: 沒有 error。

- [ ] **Step 4: Commit**

explainer-web：

```bash
git add src/service/pose-edit/catalog.ts src/service/pose-edit/catalog.test.ts
git commit -m "Mark full-body tops in the outfit catalog."
```

scro-pose：

```bash
git add lib/features/studio lib/data/pose_models.dart
git commit -m "Let a signed-in user pick a photo, pose, and garment parts."
```

---

### Task 13: 紀錄、輪詢、回到前景

**Files:**
- Create: `lib/features/history/history_page.dart`
- Create: `lib/features/history/history_tile.dart`
- Create: `lib/features/shell/home_shell.dart`
- Modify: `lib/features/studio/studio_page.dart`
- Modify: `lib/core/router/app_router.dart`

**Interfaces:**
- Consumes: `PoseApi.listEdits`、`PoseApi.getEdit`、`PoseEditDto.status`
- Produces: 底部兩個目的地「工作室」「紀錄」。紀錄新的在上，最多使用 API 回傳的 30 筆。完成的縮圖用 `resultUrl`，其餘用 `sourceUrl`。狀態文案：`pending` →「排隊」，`completed` →「完成」，`failed` →「失敗」。點一列開大圖。空清單顯示「拍一張照片來改姿勢或衣服」。工作室在 `status == pending` 時每 2.5 秒 `getEdit`；`WidgetsBindingObserver.didChangeAppLifecycleState` 為 `resumed` 時也讀一次。`completed` 或 `failed` 停止計時。

- [ ] **Step 1: Write the failing test**

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:scro_pose/features/history/history_tile.dart';

void main() {
  test('history copy follows the edit status', () {
    expect(historyStatusLabel('pending'), '排隊');
    expect(historyStatusLabel('completed'), '完成');
    expect(historyStatusLabel('failed'), '失敗');
    expect(historyThumb(status: 'completed', sourceUrl: 's', resultUrl: 'r'), 'r');
    expect(historyThumb(status: 'pending', sourceUrl: 's', resultUrl: null), 's');
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `flutter test test/history_tile_test.dart`

Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

把純函式放在 `history_tile.dart`，widget 用它們顯示。`home_shell.dart` 用 `NavigationBar`。`studio_page.dart` 用 `Timer.periodic(const Duration(milliseconds: 2500))`，在 `dispose` 取消。不要對 `createEdit` 加重試。

- [ ] **Step 4: Run tests**

Run: `flutter test`

Expected: PASS

explainer-web 再跑一次：`npx tsx --test src/service/pose-edit/*.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib test
git commit -m "Show pose edit progress and the latest thirty results."
```

---

## Spec coverage

- 登入、工作室、紀錄：Task 9、12、13
- 目錄 API 與 `coversLegs`：Task 4、12
- 建立、列表、單筆、驗證文案、扣點順序、退點一次：Task 1、5、6、7
- 比例、提示詞、參考圖、Gemini、`poseEdit` 工作：Task 2、3、6
- 輪詢、不重送 POST、401 回登入：Task 10、13
- Firebase 未設定的登入頁：Task 8、9
- 網站任務列表不顯示改圖：Task 6 明確不改 `jobListQuery`
