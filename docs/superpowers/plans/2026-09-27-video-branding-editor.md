# Video 分頁：品牌圖層與樣板 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把編輯器第二個分頁改名為 Video，讓使用者在成片上加 logo／圖片圖層與開頭、結尾，匯出最終 MP4，並把設定存成可重複套用、可覆寫的樣板。

**Architecture:** 純函式（`layerPlacement`、`buildFinalFilter`、`finalFingerprint`、上傳與名稱檢查）同時供前端預覽與伺服器 `ffmpeg` 使用。影片文件存自己的 `edit` 複本與 `final*` 輸出欄位；新集合 `videoTemplates` 存樣板。匯出沿用 `runReelJob` 的「queued → in_progress → completed/failed + 指紋比對」模式，在 `after()` 背景執行。前端 `VideoEditDesk` 取代原本的 reel desk，用 `StudioFrame`（不帶時間軸）呈現。

**Tech Stack:** Next.js 16 App Router（server actions、`after()`）、React 19、Tailwind 4、MongoDB driver 7、zod 4、`@vercel/blob`、`ffmpeg-static`、`node:test` via `npx tsx --test`。

**Spec:** `docs/superpowers/specs/2026-09-27-video-branding-editor-design.md`

## Global Constraints

- 範圍只有品牌包裝：圖片圖層蓋整支正片＋一個開頭＋一個結尾；不做逐段時間、文字圖層、轉場、多軌。
- `Reel` 步驟在所有語系顯示為 **Video**；Video 分頁不顯示下方 filmstrip。
- 樣板手動套用；套用＝複製到影片；覆寫樣板不回頭改已套用的影片。
- 樣板與比例無關：錨點＋邊距 %（短邊）＋寬度 %（畫面寬）；開頭／結尾 `scale`＋`crop` 填滿。
- 數值範圍：`marginPct` 0–20、`widthPct` 2–100、`opacity` 0–1、圖片開頭／結尾 `durationSec` 1–10（預設 2）、樣板名稱 trim 後 1–60 字且同使用者不重名。
- 上傳：png／jpg／webp ≤ 5 MB；mp4／mov ≤ 50 MB。
- 匯出不扣 credits；原始 reel 檔保留。
- Mongo 一律 `db.collection<Type>('name')`；伺服器呼叫一律 server action，不開 REST。
- 新 UI 元件各自一個檔案；Video 分頁專用元件放 `src/presentation/components/app/projects/new/`；有 hook 的元件加 `"use client"`。
- 沿用 studio token（`--studio-*`）與 `StudioButton`；UI 文字繁體中文；程式碼加簡短註解。
- 每個 task 結束：`npx tsc --noEmit`、`npm run lint`、相關 `npx tsx --test` 通過後 commit。

## 對 spec 的兩處細化（Task 1 一併更新 spec）

1. `layerBox → {x,y,w}` 改為 `layerPlacement → { anchor, w, margin }`：底部與置中需要圖片高度，交給 CSS（`bottom`/`right`）與 `ffmpeg` 的 `overlay_h` 算，前後端就不必知道圖片原始比例。
2. 「屬性」放在左欄圖層清單下方（`StudioFrame` 只有 inspector＋preview 兩欄）。匯出時成片若未就緒，按鈕停用並提示「成片合成中」，不在匯出 action 內串接合成。

---

### Task 1: Video 分頁改名、`StudioFrame` 時間軸可省略

**Files:**
- Modify: `src/presentation/studio/studio-frame.tsx`
- Modify: `src/util/i18n/messages/{en,zh-Hant,zh-Hans,ja,ko,es,fr,de,pt,ru,id}.ts`（`project.steps.export`）
- Modify: `src/presentation/components/app/projects/new/new-project-form.tsx:664-687`
- Modify: `docs/superpowers/specs/2026-09-27-video-branding-editor-design.md`

**Interfaces:**
- Produces: `StudioFrame` 的 `timeline` 變成選填 `timeline?: React.ReactNode`；未傳時不渲染時間軸區塊。

- [ ] **Step 1: `StudioFrame` 時間軸選填**

`studio-frame.tsx` 型別改 `timeline?: React.ReactNode;`，時間軸區塊改成：

```tsx
      {timeline ? (
        <section
          aria-label="時間軸"
          className="h-28 shrink-0 overflow-x-auto overflow-y-hidden border-t border-[var(--studio-line)] bg-[var(--studio-canvas)]"
        >
          {timeline}
        </section>
      ) : null}
```

檔頭註解改為：`// Editor body: optional toolbar, preview and inspector, with an optional filmstrip pinned below.`

- [ ] **Step 2: 步驟名稱改為 Video**

11 個語系檔的 `project.steps.export` 全部改成 `"Video"`（例：`zh-Hant.ts` 第 82 行 `export: "Video",`；單行物件的語系把 `export: "..."` 改成 `export: "Video"`）。

- [ ] **Step 3: reel desk 不帶 filmstrip**

`new-project-form.tsx` 的 `reelDesk` 分支把 `<VideoDesk ... />` 換成：

```tsx
          ) : reelDesk && project ? (
            <StudioFrame
              key={project.id}
              preview={
                <ReelExport part="preview" project={project} pending={pending} error={error} onCompose={onComposeReel} />
              }
              inspector={
                <ReelExport part="inspector" project={project} pending={pending} error={error} onCompose={onComposeReel} />
              }
            />
```

加上 `import { StudioFrame } from "@/presentation/studio/studio-frame";`。

- [ ] **Step 4: 更新 spec**

在 spec「Render pipeline」的 pure helpers 把 `layerBox(layer, frameW, frameH) → { x, y, w }` 改為 `layerPlacement(layer, frameW, frameH) → { anchor, w, margin }` 並加一句「底部／置中的 y 由 CSS `bottom` 與 ffmpeg `overlay_h` 決定」；「Video tab UI」的 Right: properties 改為「Left, below the layer list: properties」；「Server actions」的 `exportFinalVideoAction` 改為「成片未就緒時回傳錯誤『成片合成中，完成後再匯出』，UI 同時停用按鈕」。Testing 的 `layerBox` 改名 `layerPlacement`。

- [ ] **Step 5: 驗證**

Run: `npx tsc --noEmit && npm run lint`
Expected: 無錯誤。開 `/app/projects/<id>?video=<ready 的影片>`，分頁顯示「Production / Video」，Video 分頁底部沒有 filmstrip。

- [ ] **Step 6: Commit**

```bash
git add src/presentation/studio/studio-frame.tsx src/util/i18n/messages src/presentation/components/app/projects/new/new-project-form.tsx docs/superpowers/specs/2026-09-27-video-branding-editor-design.md
git commit -m "feat(editor): rename Reel tab to Video and drop its filmstrip"
```

---

### Task 2: 資料模型

**Files:**
- Create: `src/model/video-edit.ts`
- Modify: `src/model/project.ts`（`Project` 型別與 `projectSchema`）
- Modify: `src/presentation/serialize.ts`
- Modify: `src/service/video/storage.ts`、`src/service/video/storage.test.ts`

**Interfaces:**
- Produces（`@/model/video-edit`）：`BRAND_ANCHORS`、`BrandAnchor`、`BrandLayer`、`BookendClip`、`VideoEdit`、`VideoTemplate`、`EDIT_LIMITS`、`brandLayerSchema`、`bookendClipSchema`、`videoEditSchema`、`videoTemplateSchema`、`emptyEdit()`。
- Produces（`Project`）：`edit?`、`editTemplateId?`、`finalUrl?`、`finalStatus?: ReelStatus`、`finalFingerprint?`、`finalError?`。
- Produces（`@/presentation/serialize`）：`PublicVideo` 多 `edit?: VideoEdit`、`editTemplateId?: string`、`finalUrl?`、`finalStatus?`、`finalFingerprint?`、`finalError?`；`PublicTemplate`、`toPublicTemplate(t)`。

- [ ] **Step 1: 寫 storage 失敗測試**

`storage.test.ts` 第一個 test 的 `video` 加 `finalUrl: final,`，檔頭加 `const final = "https://blob/final.mp4";`，期望陣列加入 `final`。

Run: `npx tsx --test src/service/video/storage.test.ts`
Expected: FAIL（缺 `final`，且型別上 `finalUrl` 尚不存在）。

- [ ] **Step 2: 建立 `src/model/video-edit.ts`**

```ts
import type { ObjectId } from "mongodb";
import { z } from "zod";
import { objectIdSchema } from "@/model/primitives";

// Where a brand layer sits; margin applies to the anchored edges.
export const BRAND_ANCHORS = ["top-left", "top-right", "bottom-left", "bottom-right", "center"] as const;
export type BrandAnchor = (typeof BRAND_ANCHORS)[number];

// Shared bounds for UI sliders, zod, and uploads.
export const EDIT_LIMITS = {
  marginPct: { min: 0, max: 20 },
  widthPct: { min: 2, max: 100 },
  opacity: { min: 0, max: 1 },
  imageDurationSec: { min: 1, max: 10, default: 2 },
  templateName: { min: 1, max: 60 },
  imageBytes: 5 * 1024 * 1024,
  videoBytes: 50 * 1024 * 1024,
} as const;

// Logo or picture drawn over the whole main reel.
export type BrandLayer = {
  id: string;
  kind: "image";
  assetUrl: string;
  anchor: BrandAnchor;
  marginPct: number;
  widthPct: number;
  opacity: number;
};

// Intro or outro. Images last `durationSec`; videos use their own length.
export type BookendClip = {
  kind: "video" | "image";
  assetUrl: string;
  durationSec: number;
};

// Array order is stacking order; the last layer is on top.
export type VideoEdit = {
  layers: BrandLayer[];
  intro?: BookendClip;
  outro?: BookendClip;
};

export type VideoTemplate = VideoEdit & {
  _id: ObjectId;
  clerkUserId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export function emptyEdit(): VideoEdit {
  return { layers: [] };
}

const L = EDIT_LIMITS;

export const brandLayerSchema: z.ZodType<BrandLayer> = z.object({
  id: z.string().min(1).max(64),
  kind: z.literal("image"),
  assetUrl: z.string().url(),
  anchor: z.enum(BRAND_ANCHORS),
  marginPct: z.number().min(L.marginPct.min).max(L.marginPct.max),
  widthPct: z.number().min(L.widthPct.min).max(L.widthPct.max),
  opacity: z.number().min(L.opacity.min).max(L.opacity.max),
});

export const bookendClipSchema: z.ZodType<BookendClip> = z.object({
  kind: z.enum(["video", "image"]),
  assetUrl: z.string().url(),
  durationSec: z.number().min(L.imageDurationSec.min).max(L.imageDurationSec.max),
});

export const videoEditSchema: z.ZodType<VideoEdit> = z.object({
  layers: z.array(brandLayerSchema),
  intro: bookendClipSchema.optional(),
  outro: bookendClipSchema.optional(),
});

export const videoTemplateSchema: z.ZodType<VideoTemplate> = z.object({
  _id: objectIdSchema,
  clerkUserId: z.string(),
  name: z.string().min(L.templateName.min).max(L.templateName.max),
  layers: z.array(brandLayerSchema),
  intro: bookendClipSchema.optional(),
  outro: bookendClipSchema.optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
```

- [ ] **Step 3: `Project` 加欄位**

`project.ts` 在 `reelError?: string;` 之後加：

```ts
  // Branding edit for the Video tab (copy, never linked to the template).
  edit?: VideoEdit;
  // Template last applied to or saved from this video.
  editTemplateId?: ObjectId;
  // Branded export. Fingerprint = reel fingerprint + edit hash.
  finalUrl?: string;
  finalStatus?: ReelStatus;
  finalFingerprint?: string;
  finalError?: string;
```

`projectSchema` 在 `reelError` 之後加：

```ts
  edit: videoEditSchema.optional(),
  editTemplateId: objectIdSchema.optional(),
  finalUrl: z.string().optional(),
  finalStatus: z.enum(["queued", "in_progress", "completed", "failed"]).optional(),
  finalFingerprint: z.string().optional(),
  finalError: z.string().optional(),
```

檔頭 import：`import { videoEditSchema, type VideoEdit } from "@/model/video-edit";`（`objectIdSchema` 若尚未 import 一併加入）。

- [ ] **Step 4: serialize**

`PublicVideo` 在 `reelError?: string;` 後加：

```ts
  edit?: VideoEdit;
  editTemplateId?: string;
  finalUrl?: string;
  finalStatus?: Project["finalStatus"];
  finalFingerprint?: string;
  finalError?: string;
```

`toPublicVideo` 在 `reelError` 後加：

```ts
    edit: video.edit,
    editTemplateId: video.editTemplateId?.toHexString(),
    finalUrl: video.finalUrl,
    finalStatus: video.finalStatus,
    finalFingerprint: video.finalFingerprint,
    finalError: video.finalError,
```

檔尾加：

```ts
// Template row for the Video tab picker.
export type PublicTemplate = VideoEdit & { id: string; name: string; updatedAt: string };

export function toPublicTemplate(template: VideoTemplate): PublicTemplate {
  return {
    id: template._id.toHexString(),
    name: template.name,
    layers: template.layers,
    intro: template.intro,
    outro: template.outro,
    updatedAt: template.updatedAt.toISOString(),
  };
}
```

import：`import type { VideoEdit, VideoTemplate } from "@/model/video-edit";`

- [ ] **Step 5: storage 收集 `finalUrl`**

`storage.ts` 在 `add(video.reelUrl);` 後加 `add(video.finalUrl);`。品牌素材是使用者共用資產（樣板會引用），刪影片時不刪。

- [ ] **Step 6: 驗證**

Run: `npx tsx --test src/service/video/storage.test.ts && npx tsc --noEmit && npm run lint`
Expected: PASS／無錯誤。

- [ ] **Step 7: Commit**

```bash
git add src/model/video-edit.ts src/model/project.ts src/presentation/serialize.ts src/service/video/storage.ts src/service/video/storage.test.ts
git commit -m "feat(model): video edit, template, and final export fields"
```

---

### Task 3: 圖層幾何 `layerPlacement`

**Files:**
- Create: `src/service/video-edit/layer-placement.ts`
- Test: `src/service/video-edit/layer-placement.test.ts`

**Interfaces:**
- Consumes: `BrandAnchor`、`BrandLayer`、`EDIT_LIMITS`（Task 2）。
- Produces:

```ts
export type LayerPlacement = { anchor: BrandAnchor; w: number; margin: number };
export function layerPlacement(layer: Pick<BrandLayer, "anchor" | "marginPct" | "widthPct">, frameW: number, frameH: number): LayerPlacement;
export function overlayPosition(p: LayerPlacement): { x: string; y: string };
export function placementStyle(p: LayerPlacement): Record<string, string | number>;
export function placementFromDrag(input: { left: number; top: number; boxW: number; boxH: number; frameW: number; frameH: number }): { anchor: BrandAnchor; marginPct: number };
export function widthPctFromBox(boxW: number, frameW: number): number;
```

- [ ] **Step 1: 寫失敗測試**

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  layerPlacement,
  overlayPosition,
  placementFromDrag,
  placementStyle,
  widthPctFromBox,
} from "@/service/video-edit/layer-placement";

const layer = { anchor: "top-right" as const, marginPct: 4, widthPct: 20 };

test("layerPlacement scales width by frame width and margin by the short side", () => {
  assert.deepEqual(layerPlacement(layer, 1080, 1920), { anchor: "top-right", w: 216, margin: 43 });
  assert.deepEqual(layerPlacement(layer, 1920, 1080), { anchor: "top-right", w: 384, margin: 43 });
});

test("layerPlacement keeps width even and clamps out-of-range values", () => {
  assert.equal(layerPlacement({ ...layer, widthPct: 10.1 }, 1080, 1920).w, 108);
  assert.equal(layerPlacement({ ...layer, widthPct: 500 }, 1080, 1920).w, 1080);
  assert.equal(layerPlacement({ ...layer, marginPct: 90 }, 1080, 1920).margin, 216);
});

test("overlayPosition covers all five anchors", () => {
  const p = (anchor: Parameters<typeof overlayPosition>[0]["anchor"]) =>
    overlayPosition({ anchor, w: 100, margin: 20 });
  assert.deepEqual(p("top-left"), { x: "20", y: "20" });
  assert.deepEqual(p("top-right"), { x: "main_w-overlay_w-20", y: "20" });
  assert.deepEqual(p("bottom-left"), { x: "20", y: "main_h-overlay_h-20" });
  assert.deepEqual(p("bottom-right"), { x: "main_w-overlay_w-20", y: "main_h-overlay_h-20" });
  assert.deepEqual(p("center"), { x: "(main_w-overlay_w)/2", y: "(main_h-overlay_h)/2" });
});

test("placementStyle mirrors the anchor with CSS offsets", () => {
  assert.deepEqual(placementStyle({ anchor: "bottom-right", w: 100, margin: 20 }), {
    width: 100,
    bottom: 20,
    right: 20,
  });
  assert.deepEqual(placementStyle({ anchor: "center", w: 80, margin: 20 }), {
    width: 80,
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
  });
});

test("placementFromDrag snaps to the nearest corner or the centre", () => {
  const frame = { frameW: 400, frameH: 800, boxW: 80, boxH: 40 };
  assert.deepEqual(placementFromDrag({ ...frame, left: 300, top: 20 }), { anchor: "top-right", marginPct: 5 });
  assert.deepEqual(placementFromDrag({ ...frame, left: 10, top: 740 }), { anchor: "bottom-left", marginPct: 2.5 });
  assert.deepEqual(placementFromDrag({ ...frame, left: 160, top: 380 }), { anchor: "center", marginPct: 0 });
  assert.equal(placementFromDrag({ ...frame, left: 150, top: 200 }).marginPct, 20);
});

test("widthPctFromBox clamps to 2–100", () => {
  assert.equal(widthPctFromBox(100, 400), 25);
  assert.equal(widthPctFromBox(1, 400), 2);
  assert.equal(widthPctFromBox(900, 400), 100);
});
```

- [ ] **Step 2: 確認失敗**

Run: `npx tsx --test src/service/video-edit/layer-placement.test.ts`
Expected: FAIL（找不到模組）。

- [ ] **Step 3: 實作**

```ts
import { EDIT_LIMITS, type BrandAnchor, type BrandLayer } from "@/model/video-edit";

// Pixel placement of one layer. Height is left to CSS / ffmpeg so the
// image's own aspect ratio never has to be known here.
export type LayerPlacement = { anchor: BrandAnchor; w: number; margin: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

// libx264 needs even dimensions.
function even(value: number) {
  return Math.max(2, value - (value % 2));
}

export function layerPlacement(
  layer: Pick<BrandLayer, "anchor" | "marginPct" | "widthPct">,
  frameW: number,
  frameH: number,
): LayerPlacement {
  const { widthPct, marginPct } = EDIT_LIMITS;
  const w = even(Math.round((frameW * clamp(layer.widthPct, widthPct.min, widthPct.max)) / 100));
  const margin = Math.round(
    (Math.min(frameW, frameH) * clamp(layer.marginPct, marginPct.min, marginPct.max)) / 100,
  );
  return { anchor: layer.anchor, w, margin };
}

// ffmpeg overlay x/y expressions for the same placement.
export function overlayPosition(p: LayerPlacement): { x: string; y: string } {
  if (p.anchor === "center") return { x: "(main_w-overlay_w)/2", y: "(main_h-overlay_h)/2" };
  const m = String(p.margin);
  return {
    x: p.anchor.endsWith("left") ? m : `main_w-overlay_w-${m}`,
    y: p.anchor.startsWith("top") ? m : `main_h-overlay_h-${m}`,
  };
}

// Inline style for the preview overlay, in the preview's own pixels.
export function placementStyle(p: LayerPlacement): Record<string, string | number> {
  if (p.anchor === "center") {
    return { width: p.w, left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  }
  return {
    width: p.w,
    [p.anchor.startsWith("top") ? "top" : "bottom"]: p.margin,
    [p.anchor.endsWith("left") ? "left" : "right"]: p.margin,
  };
}

// After a drag: snap to the corner the box centre is in (or the centre
// zone) and keep the gap to the anchored edges as a % of the short side.
export function placementFromDrag(input: {
  left: number;
  top: number;
  boxW: number;
  boxH: number;
  frameW: number;
  frameH: number;
}): { anchor: BrandAnchor; marginPct: number } {
  const { left, top, boxW, boxH, frameW, frameH } = input;
  const cx = left + boxW / 2;
  const cy = top + boxH / 2;
  if (Math.abs(cx - frameW / 2) < frameW * 0.1 && Math.abs(cy - frameH / 2) < frameH * 0.1) {
    return { anchor: "center", marginPct: 0 };
  }
  const isLeft = cx < frameW / 2;
  const isTop = cy < frameH / 2;
  const dx = isLeft ? left : frameW - left - boxW;
  const dy = isTop ? top : frameH - top - boxH;
  const gap = Math.max(0, Math.min(dx, dy));
  const { min, max } = EDIT_LIMITS.marginPct;
  const marginPct = clamp(round1((gap / Math.min(frameW, frameH)) * 100), min, max);
  return { anchor: `${isTop ? "top" : "bottom"}-${isLeft ? "left" : "right"}`, marginPct };
}

export function widthPctFromBox(boxW: number, frameW: number) {
  const { min, max } = EDIT_LIMITS.widthPct;
  return clamp(round1((boxW / frameW) * 100), min, max);
}
```

- [ ] **Step 4: 確認通過**

Run: `npx tsx --test src/service/video-edit/layer-placement.test.ts`
Expected: PASS（6 tests）。

- [ ] **Step 5: Commit**

```bash
git add src/service/video-edit/layer-placement.ts src/service/video-edit/layer-placement.test.ts
git commit -m "feat(video-edit): layer placement shared by preview and ffmpeg"
```

---

### Task 4: 指紋、髒檢查、上傳與名稱檢查

**Files:**
- Create: `src/service/video-edit/edit-state.ts`
- Test: `src/service/video-edit/edit-state.test.ts`

**Interfaces:**
- Consumes: `VideoEdit`、`BookendClip`、`EDIT_LIMITS`（Task 2）；`clipReelFingerprint`、`isReelBusy`、`ReelClipSource`（`@/service/reel/fingerprint`）；`ReelStatus`（`@/model/project`）。
- Produces:

```ts
export type FinalRecord = { edit?: VideoEdit; finalUrl?: string; finalStatus?: ReelStatus; finalFingerprint?: string };
export function hashText(text: string): string;              // 8-char hex FNV-1a
export function stableEditString(edit?: VideoEdit): string;
export function hasEdit(edit?: VideoEdit): boolean;
export function isEditDirty(edit?: VideoEdit, template?: VideoEdit): boolean;
export function finalFingerprint(video: ReelClipSource & { edit?: VideoEdit }): string;
export function isFinalCurrent(video: ReelClipSource & FinalRecord): boolean;
export function isFinalBusy(status?: ReelStatus): boolean;
export function editAssetUrls(edit: VideoEdit): string[];
export function isBrandAssetUrl(url: string, clerkUserId: string): boolean;
export function brandAssetPath(clerkUserId: string, id: string, ext: string): string;
export type UploadCheck = { ok: true; kind: "image" | "video"; ext: string } | { ok: false; error: string };
export function checkBrandUpload(file: { type: string; size: number }): UploadCheck;
export type NameCheck = { ok: true; name: string } | { ok: false; error: string };
export function normalizeTemplateName(raw: string): NameCheck;
```

- [ ] **Step 1: 寫失敗測試**

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  brandAssetPath,
  checkBrandUpload,
  finalFingerprint,
  hasEdit,
  isBrandAssetUrl,
  isEditDirty,
  isFinalCurrent,
  normalizeTemplateName,
} from "@/service/video-edit/edit-state";
import type { VideoEdit } from "@/model/video-edit";

const logo = (id: string, url = "https://x.public.blob.vercel-storage.com/explainer/brand/u1/a.png") => ({
  id,
  kind: "image" as const,
  assetUrl: url,
  anchor: "top-right" as const,
  marginPct: 4,
  widthPct: 18,
  opacity: 1,
});

const base: VideoEdit = {
  layers: [logo("a"), logo("b", "https://x.public.blob.vercel-storage.com/explainer/brand/u1/b.png")],
  intro: { kind: "image", assetUrl: "https://x.public.blob.vercel-storage.com/explainer/brand/u1/i.png", durationSec: 2 },
};

const video = (edit?: VideoEdit) => ({
  phaseA: { clips: [{ clipNumber: 1 }] },
  clips: [{ clipNumber: 1, blobUrl: "https://blob/c1.mp4", submittedAt: "t1" }],
  edit,
});

test("hasEdit is false for no edit or an empty one", () => {
  assert.equal(hasEdit(undefined), false);
  assert.equal(hasEdit({ layers: [] }), false);
  assert.equal(hasEdit(base), true);
  assert.equal(hasEdit({ layers: [], outro: base.intro }), true);
});

test("isEditDirty ignores layer ids but not order or values", () => {
  const renamed = { ...base, layers: base.layers.map((l, i) => ({ ...l, id: `n${i}` })) };
  assert.equal(isEditDirty(base, renamed), false);
  assert.equal(isEditDirty(base, { ...base, layers: [...base.layers].reverse() }), true);
  assert.equal(isEditDirty(base, { ...base, layers: [{ ...base.layers[0], opacity: 0.5 }, base.layers[1]] }), true);
  assert.equal(isEditDirty(base, { ...base, intro: undefined }), true);
});

test("finalFingerprint changes with the edit and the clips", () => {
  const a = finalFingerprint(video(base));
  assert.equal(finalFingerprint(video(structuredClone(base))), a);
  assert.notEqual(finalFingerprint(video({ ...base, outro: base.intro })), a);
  const redone = { ...video(base), clips: [{ clipNumber: 1, blobUrl: "https://blob/c1.mp4", submittedAt: "t2" }] };
  assert.notEqual(finalFingerprint(redone), a);
});

test("isFinalCurrent needs a completed file with the current fingerprint", () => {
  const v = video(base);
  const fp = finalFingerprint(v);
  assert.equal(isFinalCurrent({ ...v, finalUrl: "u", finalStatus: "completed", finalFingerprint: fp }), true);
  assert.equal(isFinalCurrent({ ...v, finalUrl: "u", finalStatus: "completed", finalFingerprint: "old" }), false);
  assert.equal(isFinalCurrent({ ...v, finalStatus: "completed", finalFingerprint: fp }), false);
});

test("isBrandAssetUrl only accepts this user's blob folder", () => {
  const ok = `https://x.public.blob.vercel-storage.com/${brandAssetPath("u1", "abc", "png")}`;
  assert.equal(isBrandAssetUrl(ok, "u1"), true);
  assert.equal(isBrandAssetUrl(ok, "u2"), false);
  assert.equal(isBrandAssetUrl("https://evil.example.com/explainer/brand/u1/a.png", "u1"), false);
  assert.equal(isBrandAssetUrl("not a url", "u1"), false);
});

test("checkBrandUpload enforces type and size", () => {
  assert.deepEqual(checkBrandUpload({ type: "image/png", size: 10 }), { ok: true, kind: "image", ext: "png" });
  assert.deepEqual(checkBrandUpload({ type: "video/quicktime", size: 10 }), { ok: true, kind: "video", ext: "mov" });
  assert.equal(checkBrandUpload({ type: "image/gif", size: 10 }).ok, false);
  assert.equal(checkBrandUpload({ type: "image/png", size: 6 * 1024 * 1024 }).ok, false);
  assert.equal(checkBrandUpload({ type: "video/mp4", size: 51 * 1024 * 1024 }).ok, false);
  assert.equal(checkBrandUpload({ type: "video/mp4", size: 0 }).ok, false);
});

test("normalizeTemplateName trims and bounds length", () => {
  assert.deepEqual(normalizeTemplateName("  品牌 A  "), { ok: true, name: "品牌 A" });
  assert.equal(normalizeTemplateName("   ").ok, false);
  assert.equal(normalizeTemplateName("x".repeat(61)).ok, false);
});
```

- [ ] **Step 2: 確認失敗**

Run: `npx tsx --test src/service/video-edit/edit-state.test.ts`
Expected: FAIL（找不到模組）。

- [ ] **Step 3: 實作**

```ts
import { EDIT_LIMITS, type BookendClip, type VideoEdit } from "@/model/video-edit";
import type { ReelStatus } from "@/model/project";
import { clipReelFingerprint, isReelBusy, type ReelClipSource } from "@/service/reel/fingerprint";

export type FinalRecord = {
  edit?: VideoEdit;
  finalUrl?: string;
  finalStatus?: ReelStatus;
  finalFingerprint?: string;
};

// FNV-1a; works in the browser and on the server without node:crypto.
export function hashText(text: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function bookendKey(clip?: BookendClip) {
  return clip ? [clip.kind, clip.assetUrl, clip.kind === "image" ? clip.durationSec : 0] : null;
}

// Content key of an edit. Layer ids are excluded so a copied template compares equal.
export function stableEditString(edit?: VideoEdit) {
  if (!edit) return "";
  return JSON.stringify({
    layers: edit.layers.map((l) => [l.assetUrl, l.anchor, l.marginPct, l.widthPct, l.opacity]),
    intro: bookendKey(edit.intro),
    outro: bookendKey(edit.outro),
  });
}

export function hasEdit(edit?: VideoEdit) {
  return Boolean(edit && (edit.layers.length > 0 || edit.intro || edit.outro));
}

export function isEditDirty(edit?: VideoEdit, template?: VideoEdit) {
  return stableEditString(edit) !== stableEditString(template);
}

export function finalFingerprint(video: ReelClipSource & { edit?: VideoEdit }) {
  return `${clipReelFingerprint(video)}#${hashText(stableEditString(video.edit))}`;
}

export function isFinalCurrent(video: ReelClipSource & FinalRecord) {
  return Boolean(
    video.finalUrl &&
      video.finalStatus === "completed" &&
      video.finalFingerprint === finalFingerprint(video),
  );
}

export function isFinalBusy(status?: ReelStatus) {
  return isReelBusy(status);
}

export function editAssetUrls(edit: VideoEdit) {
  return [
    ...edit.layers.map((layer) => layer.assetUrl),
    ...(edit.intro ? [edit.intro.assetUrl] : []),
    ...(edit.outro ? [edit.outro.assetUrl] : []),
  ];
}

export function brandAssetPath(clerkUserId: string, id: string, ext: string) {
  return `explainer/brand/${clerkUserId}/${id}.${ext}`;
}

// Render downloads these URLs, so only this user's Blob folder is allowed.
export function isBrandAssetUrl(url: string, clerkUserId: string) {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname.endsWith(".public.blob.vercel-storage.com") &&
      parsed.pathname.startsWith(`/explainer/brand/${clerkUserId}/`)
    );
  } catch {
    return false;
  }
}

const IMAGE_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const VIDEO_TYPES: Record<string, string> = { "video/mp4": "mp4", "video/quicktime": "mov" };

export type UploadCheck =
  | { ok: true; kind: "image" | "video"; ext: string }
  | { ok: false; error: string };

export function checkBrandUpload(file: { type: string; size: number }): UploadCheck {
  if (file.size <= 0) return { ok: false, error: "檔案是空的" };
  if (IMAGE_TYPES[file.type]) {
    if (file.size > EDIT_LIMITS.imageBytes) return { ok: false, error: "圖片不可超過 5MB" };
    return { ok: true, kind: "image", ext: IMAGE_TYPES[file.type] };
  }
  if (VIDEO_TYPES[file.type]) {
    if (file.size > EDIT_LIMITS.videoBytes) return { ok: false, error: "影片不可超過 50MB" };
    return { ok: true, kind: "video", ext: VIDEO_TYPES[file.type] };
  }
  return { ok: false, error: "只支援 PNG、JPG、WebP 圖片或 MP4、MOV 影片" };
}

export type NameCheck = { ok: true; name: string } | { ok: false; error: string };

export function normalizeTemplateName(raw: string): NameCheck {
  const name = raw.trim();
  const { min, max } = EDIT_LIMITS.templateName;
  if (name.length < min) return { ok: false, error: "請輸入樣板名稱" };
  if (name.length > max) return { ok: false, error: `樣板名稱最多 ${max} 字` };
  return { ok: true, name };
}
```

- [ ] **Step 4: 確認通過**

Run: `npx tsx --test src/service/video-edit/edit-state.test.ts`
Expected: PASS（7 tests）。

- [ ] **Step 5: Commit**

```bash
git add src/service/video-edit/edit-state.ts src/service/video-edit/edit-state.test.ts
git commit -m "feat(video-edit): fingerprint, dirty check, upload and name rules"
```

---

### Task 5: `buildFinalFilter`

**Files:**
- Create: `src/service/video-edit/final-filter.ts`
- Test: `src/service/video-edit/final-filter.test.ts`

**Interfaces:**
- Consumes: `LayerPlacement`、`overlayPosition`（Task 3）；`CLIP_EDGE_FADE_SEC`（`@/service/reel/concat`）。
- Produces:

```ts
export type FinalSegmentInput = { index: number; kind: "video" | "image"; durationSec: number; hasAudio: boolean };
export type FinalLayerInput = { index: number; placement: LayerPlacement; opacity: number };
export type FinalFilterInput = {
  width: number; height: number; fps: number;
  main: { durationSec: number; hasAudio: boolean }; // always ffmpeg input 0
  intro?: FinalSegmentInput;
  outro?: FinalSegmentInput;
  layers: FinalLayerInput[];
};
export function buildFinalFilter(input: FinalFilterInput): { filter: string; hasAudio: boolean };
```

- [ ] **Step 1: 寫失敗測試**

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildFinalFilter } from "@/service/video-edit/final-filter";

const frame = { width: 1080, height: 1920, fps: 30 };
const main = { durationSec: 12, hasAudio: true };
const logo = (index: number) => ({
  index,
  placement: { anchor: "top-right" as const, w: 216, margin: 43 },
  opacity: 0.8,
});

test("layers only: overlays on the main reel, one segment", () => {
  const { filter, hasAudio } = buildFinalFilter({ ...frame, main, layers: [logo(1)] });
  assert.equal(hasAudio, true);
  assert.match(filter, /\[1:v\]scale=216:-2,format=rgba,colorchannelmixer=aa=0\.8\[l0\]/);
  assert.match(filter, /\[m0\]\[l0\]overlay=x=main_w-overlay_w-43:y=43\[m1\]/);
  assert.match(filter, /concat=n=1:v=1:a=1\[v\]\[a\]/);
  assert.doesNotMatch(filter, /fade=t=/);
});

test("several layers stack in array order", () => {
  const { filter } = buildFinalFilter({ ...frame, main, layers: [logo(1), logo(2)] });
  assert.match(filter, /\[m0\]\[l0\]overlay=.*\[m1\]/);
  assert.match(filter, /\[m1\]\[l1\]overlay=.*\[m2\]/);
});

test("image intro is cropped to the frame, gets silent audio, and fades into the main", () => {
  const { filter } = buildFinalFilter({
    ...frame,
    main,
    layers: [],
    intro: { index: 1, kind: "image", durationSec: 2, hasAudio: false },
  });
  assert.match(filter, /\[1:v\]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920/);
  assert.match(filter, /anullsrc=r=44100:cl=stereo,atrim=0:2/);
  assert.match(filter, /fade=t=out:st=1\.9:d=0\.1/);
  assert.match(filter, /concat=n=2:v=1:a=1/);
});

test("intro and outro wrap the main in order", () => {
  const { filter } = buildFinalFilter({
    ...frame,
    main,
    layers: [logo(2)],
    intro: { index: 1, kind: "video", durationSec: 3, hasAudio: true },
    outro: { index: 3, kind: "image", durationSec: 2, hasAudio: false },
  });
  assert.match(filter, /\[1:a\]aformat=/);
  assert.match(filter, /\[3:v\]scale=1080:1920/);
  assert.match(filter, /\[s0v\]\[s0a\]\[s1v\]\[s1a\]\[s2v\]\[s2a\]concat=n=3:v=1:a=1\[v\]\[a\]/);
});

test("no audio anywhere: video-only concat", () => {
  const { filter, hasAudio } = buildFinalFilter({
    ...frame,
    main: { durationSec: 5, hasAudio: false },
    layers: [],
    outro: { index: 1, kind: "image", durationSec: 2, hasAudio: false },
  });
  assert.equal(hasAudio, false);
  assert.doesNotMatch(filter, /anullsrc|aformat/);
  assert.match(filter, /concat=n=2:v=1:a=0\[v\]/);
});
```

- [ ] **Step 2: 確認失敗**

Run: `npx tsx --test src/service/video-edit/final-filter.test.ts`
Expected: FAIL（找不到模組）。

- [ ] **Step 3: 實作**

```ts
import { CLIP_EDGE_FADE_SEC } from "@/service/reel/concat";
import { overlayPosition, type LayerPlacement } from "@/service/video-edit/layer-placement";

export type FinalSegmentInput = {
  index: number;
  kind: "video" | "image";
  durationSec: number;
  hasAudio: boolean;
};
export type FinalLayerInput = { index: number; placement: LayerPlacement; opacity: number };
export type FinalFilterInput = {
  width: number;
  height: number;
  fps: number;
  main: { durationSec: number; hasAudio: boolean };
  intro?: FinalSegmentInput;
  outro?: FinalSegmentInput;
  layers: FinalLayerInput[];
};

const AUDIO_FORMAT = "aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo";

function num(value: number) {
  return String(Math.round(value * 1000) / 1000);
}

// One filter_complex: brand layers over the main reel, bookends cropped to
// the frame, 100ms edge fades, then concat intro → main → outro.
export function buildFinalFilter(input: FinalFilterInput) {
  const { width: W, height: H, fps } = input;
  const hasAudio = input.main.hasAudio || Boolean(input.intro?.hasAudio) || Boolean(input.outro?.hasAudio);
  const parts: string[] = [];

  // Main reel with every layer stacked in order.
  parts.push(`[0:v]setsar=1,fps=${fps},format=yuv420p[m0]`);
  let mainLabel = "m0";
  input.layers.forEach((layer, i) => {
    const { x, y } = overlayPosition(layer.placement);
    parts.push(
      `[${layer.index}:v]scale=${layer.placement.w}:-2,format=rgba,colorchannelmixer=aa=${num(layer.opacity)}[l${i}]`,
    );
    parts.push(`[${mainLabel}][l${i}]overlay=x=${x}:y=${y}[m${i + 1}]`);
    mainLabel = `m${i + 1}`;
  });

  type Segment = { v: string; a?: string; duration: number };
  const segments: Segment[] = [];

  function audioFor(index: number, present: boolean, duration: number, label: string) {
    if (!hasAudio) return undefined;
    parts.push(
      present
        ? `[${index}:a]${AUDIO_FORMAT},apad,atrim=0:${num(duration)}[${label}]`
        : `anullsrc=r=44100:cl=stereo,atrim=0:${num(duration)},${AUDIO_FORMAT}[${label}]`,
    );
    return label;
  }

  function bookend(seg: FinalSegmentInput, key: string): Segment {
    parts.push(
      `[${seg.index}:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,fps=${fps},format=yuv420p[${key}v]`,
    );
    return {
      v: `${key}v`,
      a: audioFor(seg.index, seg.hasAudio, seg.durationSec, `${key}a`),
      duration: seg.durationSec,
    };
  }

  if (input.intro) segments.push(bookend(input.intro, "intro"));
  parts.push(`[${mainLabel}]format=yuv420p[mainv]`);
  segments.push({
    v: "mainv",
    a: audioFor(0, input.main.hasAudio, input.main.durationSec, "maina"),
    duration: input.main.durationSec,
  });
  if (input.outro) segments.push(bookend(input.outro, "outro"));

  // Edge fades, same rule as the reel concat.
  const pads: string[] = [];
  segments.forEach((seg, i) => {
    const fade = Math.min(CLIP_EDGE_FADE_SEC, seg.duration / 2);
    const outAt = num(Math.max(0, seg.duration - fade));
    const vf: string[] = [];
    const af: string[] = [];
    if (i > 0) {
      vf.push(`fade=t=in:st=0:d=${num(fade)}`);
      af.push(`afade=t=in:st=0:d=${num(fade)}`);
    }
    if (i < segments.length - 1) {
      vf.push(`fade=t=out:st=${outAt}:d=${num(fade)}`);
      af.push(`afade=t=out:st=${outAt}:d=${num(fade)}`);
    }
    parts.push(`[${seg.v}]${vf.join(",") || "null"}[s${i}v]`);
    pads.push(`[s${i}v]`);
    if (seg.a) {
      parts.push(`[${seg.a}]${af.join(",") || "anull"}[s${i}a]`);
      pads.push(`[s${i}a]`);
    }
  });

  parts.push(
    `${pads.join("")}concat=n=${segments.length}:v=1:a=${hasAudio ? 1 : 0}${hasAudio ? "[v][a]" : "[v]"}`,
  );
  return { filter: parts.join(";"), hasAudio };
}
```

- [ ] **Step 4: 確認通過**

Run: `npx tsx --test src/service/video-edit/final-filter.test.ts`
Expected: PASS（5 tests）。

- [ ] **Step 5: Commit**

```bash
git add src/service/video-edit/final-filter.ts src/service/video-edit/final-filter.test.ts
git commit -m "feat(video-edit): ffmpeg filter for layers and bookends"
```

---

### Task 6: `ffmpeg` 合成與 smoke test

**Files:**
- Modify: `src/service/reel/concat.ts`（匯出 `ffmpegStderr`、`runFfmpeg`、`fetchBuffer`）
- Create: `src/service/video-edit/render.ts`
- Test: `src/service/video-edit/render.test.ts`

**Interfaces:**
- Consumes: `buildFinalFilter`（Task 5）、`layerPlacement`（Task 3）、`BrandLayer`、`BookendClip`、`VideoEdit`（Task 2）。
- Produces:

```ts
export type MediaProbe = { width: number; height: number; fps: number; durationSec: number; hasAudio: boolean };
export function parseProbe(stderr: string): MediaProbe;
export type FinalAssetFile = { buffer: Buffer; ext: string };
export type FinalRenderInput = {
  reel: Buffer;
  layers: Array<{ file: FinalAssetFile; layer: BrandLayer }>;
  intro?: { file: FinalAssetFile; clip: BookendClip };
  outro?: { file: FinalAssetFile; clip: BookendClip };
};
export async function renderFinalFromBuffers(input: FinalRenderInput): Promise<Buffer>;
export async function renderFinalVideo(reelUrl: string, edit: VideoEdit): Promise<Buffer>;
```

- [ ] **Step 1: 匯出 concat 內部工具**

`concat.ts` 的 `function ffmpegStderr`、`async function fetchBuffer`、`function runFfmpeg` 前面加上 `export`，其餘不變。

- [ ] **Step 2: 寫失敗測試**

```ts
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import ffmpegPath from "ffmpeg-static";
import { parseProbe, renderFinalFromBuffers } from "@/service/video-edit/render";

test("parseProbe reads size, fps, duration, and audio", () => {
  const stderr = [
    "  Duration: 00:00:07.04, start: 0.000000, bitrate: 1200 kb/s",
    "  Stream #0:0: Video: h264 (High), yuv420p, 1080x1920 [SAR 1:1 DAR 9:16], 24 fps, 24 tbr",
    "  Stream #0:1: Audio: aac (LC), 44100 Hz, stereo",
  ].join("\n");
  assert.deepEqual(parseProbe(stderr), { width: 1080, height: 1920, fps: 24, durationSec: 7.04, hasAudio: true });
});

function run(args: string[]) {
  assert.ok(ffmpegPath);
  const result = spawnSync(ffmpegPath, args, { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
}

test("renderFinalFromBuffers adds a logo and a 1s image intro", async () => {
  const dir = await mkdtemp(join(tmpdir(), "final-test-"));
  try {
    const reelPath = join(dir, "reel.mp4");
    run([
      "-y", "-f", "lavfi", "-i", "color=c=blue:s=64x112:d=1:r=24",
      "-f", "lavfi", "-i", "sine=frequency=440:duration=1",
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", reelPath,
    ]);
    const pngPath = join(dir, "logo.png");
    run(["-y", "-f", "lavfi", "-i", "color=c=red:s=16x16", "-frames:v", "1", pngPath]);

    const png = await readFile(pngPath);
    const out = await renderFinalFromBuffers({
      reel: await readFile(reelPath),
      layers: [
        {
          file: { buffer: png, ext: "png" },
          layer: { id: "a", kind: "image", assetUrl: "https://x/logo.png", anchor: "top-right", marginPct: 4, widthPct: 25, opacity: 0.8 },
        },
      ],
      intro: { file: { buffer: png, ext: "png" }, clip: { kind: "image", assetUrl: "https://x/i.png", durationSec: 1 } },
    });

    const outPath = join(dir, "out.mp4");
    await writeFile(outPath, out);
    const probe = spawnSync(ffmpegPath!, ["-i", outPath], { encoding: "utf8" });
    const probed = parseProbe(probe.stderr);
    assert.equal(probed.width, 64);
    assert.equal(probed.height, 112);
    assert.ok(probed.durationSec > 1.8 && probed.durationSec < 2.3, `duration ${probed.durationSec}`);
    assert.equal(probed.hasAudio, true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 3: 確認失敗**

Run: `npx tsx --test src/service/video-edit/render.test.ts`
Expected: FAIL（找不到模組）。

- [ ] **Step 4: 實作 `render.ts`**

```ts
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fetchBuffer, ffmpegStderr, runFfmpeg } from "@/service/reel/concat";
import { buildFinalFilter, type FinalSegmentInput } from "@/service/video-edit/final-filter";
import { layerPlacement } from "@/service/video-edit/layer-placement";
import type { BookendClip, BrandLayer, VideoEdit } from "@/model/video-edit";

export type MediaProbe = { width: number; height: number; fps: number; durationSec: number; hasAudio: boolean };

// Parse `ffmpeg -i` stderr. fps falls back to 30 when the stream omits it.
export function parseProbe(stderr: string): MediaProbe {
  const duration = stderr.match(/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/);
  const size = stderr.match(/Video:.*?(\d{2,5})x(\d{2,5})/);
  const fps = stderr.match(/(\d+(?:\.\d+)?) fps/);
  return {
    width: size ? Number(size[1]) : 0,
    height: size ? Number(size[2]) : 0,
    fps: fps ? Number(fps[1]) : 30,
    durationSec: duration ? Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3]) : 0,
    hasAudio: /Audio:/.test(stderr),
  };
}

export type FinalAssetFile = { buffer: Buffer; ext: string };
export type FinalRenderInput = {
  reel: Buffer;
  layers: Array<{ file: FinalAssetFile; layer: BrandLayer }>;
  intro?: { file: FinalAssetFile; clip: BookendClip };
  outro?: { file: FinalAssetFile; clip: BookendClip };
};

// Burn brand layers into the reel and wrap it with the bookends.
export async function renderFinalFromBuffers(input: FinalRenderInput): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "final-"));
  try {
    await writeFile(join(dir, "main.mp4"), input.reel);
    const main = parseProbe(await ffmpegStderr(dir, ["-i", "main.mp4"]));
    if (!main.width || !main.height || !main.durationSec) throw new Error("無法讀取成片資訊");

    const args = ["-y", "-i", "main.mp4"];
    let nextIndex = 1;

    async function addBookend(
      slot: "intro" | "outro",
      source?: { file: FinalAssetFile; clip: BookendClip },
    ): Promise<FinalSegmentInput | undefined> {
      if (!source) return undefined;
      const name = `${slot}.${source.file.ext}`;
      await writeFile(join(dir, name), source.file.buffer);
      const index = nextIndex++;
      if (source.clip.kind === "image") {
        args.push("-loop", "1", "-framerate", String(main.fps), "-t", String(source.clip.durationSec), "-i", name);
        return { index, kind: "image", durationSec: source.clip.durationSec, hasAudio: false };
      }
      const probe = parseProbe(await ffmpegStderr(dir, ["-i", name]));
      if (!probe.durationSec) throw new Error(slot === "intro" ? "無法讀取開頭影片" : "無法讀取結尾影片");
      args.push("-i", name);
      return { index, kind: "video", durationSec: probe.durationSec, hasAudio: probe.hasAudio };
    }

    const intro = await addBookend("intro", input.intro);
    const layers = [];
    for (let i = 0; i < input.layers.length; i += 1) {
      const { file, layer } = input.layers[i];
      const name = `layer${i}.${file.ext}`;
      await writeFile(join(dir, name), file.buffer);
      args.push("-i", name);
      layers.push({
        index: nextIndex++,
        placement: layerPlacement(layer, main.width, main.height),
        opacity: layer.opacity,
      });
    }
    const outro = await addBookend("outro", input.outro);

    const { filter, hasAudio } = buildFinalFilter({
      width: main.width,
      height: main.height,
      fps: main.fps,
      main: { durationSec: main.durationSec, hasAudio: main.hasAudio },
      intro,
      outro,
      layers,
    });
    args.push("-filter_complex", filter, "-map", "[v]");
    if (hasAudio) args.push("-map", "[a]", "-c:a", "aac", "-ac", "2");
    args.push("-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "final.mp4");
    await runFfmpeg(dir, args);
    return await readFile(join(dir, "final.mp4"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function extOf(url: string) {
  const match = new URL(url).pathname.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : "bin";
}

async function assetFile(url: string, label: string): Promise<FinalAssetFile> {
  return { buffer: await fetchBuffer(url, label), ext: extOf(url) };
}

// Download the reel and every asset, then render.
export async function renderFinalVideo(reelUrl: string, edit: VideoEdit) {
  const reel = await fetchBuffer(reelUrl, "成片");
  const layers = [];
  for (let i = 0; i < edit.layers.length; i += 1) {
    layers.push({ file: await assetFile(edit.layers[i].assetUrl, `第 ${i + 1} 個圖層`), layer: edit.layers[i] });
  }
  return renderFinalFromBuffers({
    reel,
    layers,
    intro: edit.intro ? { file: await assetFile(edit.intro.assetUrl, "開頭素材"), clip: edit.intro } : undefined,
    outro: edit.outro ? { file: await assetFile(edit.outro.assetUrl, "結尾素材"), clip: edit.outro } : undefined,
  });
}
```

- [ ] **Step 5: 確認通過**

Run: `npx tsx --test src/service/video-edit/render.test.ts src/service/reel/concat.test.ts`
Expected: PASS（render 2 tests、concat 既有 2 tests）。若 smoke test 長度不在 1.8–2.3 秒，先印出 `filter` 字串檢查 `atrim`／`fade` 參數再修 Task 5。

- [ ] **Step 6: Commit**

```bash
git add src/service/reel/concat.ts src/service/video-edit/render.ts src/service/video-edit/render.test.ts
git commit -m "feat(video-edit): render branded final video with ffmpeg"
```

---

### Task 7: 樣板 DAO 與樣板 actions

**Files:**
- Create: `src/dao/video-templates.ts`
- Modify: `src/dao/index.ts`
- Create: `src/service/video-edit/template-actions.ts`

**Interfaces:**
- Consumes: `VideoTemplate`、`VideoEdit`（Task 2）；`normalizeTemplateName`、`hasEdit`（Task 4）；`toPublicVideo`、`toPublicTemplate`、`PublicVideo`、`PublicTemplate`（Task 2）。
- Produces（全部 `Promise<...>`）：

```ts
type Fail = { ok: false; error: string };
export async function listTemplatesAction(): Promise<{ ok: true; templates: PublicTemplate[] } | Fail>;
export async function applyTemplateAction(videoId: string, templateId: string): Promise<{ ok: true; project: PublicVideo } | Fail>;
export async function saveTemplateAction(videoId: string, name: string): Promise<{ ok: true; project: PublicVideo; template: PublicTemplate } | Fail>;
export async function overwriteTemplateAction(videoId: string, templateId: string): Promise<{ ok: true; template: PublicTemplate } | Fail>;
export async function renameTemplateAction(templateId: string, name: string): Promise<{ ok: true; template: PublicTemplate } | Fail>;
export async function deleteTemplateAction(templateId: string): Promise<{ ok: true } | Fail>;
```

- [ ] **Step 1: DAO**

`src/dao/video-templates.ts`：

```ts
import type { Collection, OptionalId } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { VideoTemplate } from "@/model/video-edit";

export async function videoTemplatesCollection(): Promise<Collection<OptionalId<VideoTemplate>>> {
  const db = await getDb();
  return db.collection<OptionalId<VideoTemplate>>("videoTemplates");
}
```

`src/dao/index.ts` 加：`export { videoTemplatesCollection } from "@/dao/video-templates";`

- [ ] **Step 2: 樣板 actions**

`src/service/video-edit/template-actions.ts`：

```ts
import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { requireAppUser } from "@/service/auth";
import { videoTemplatesCollection, videosCollection } from "@/dao";
import { hasEdit, normalizeTemplateName } from "@/service/video-edit/edit-state";
import { toPublicTemplate, toPublicVideo, type PublicTemplate, type PublicVideo } from "@/presentation/serialize";
import type { VideoEdit } from "@/model/video-edit";

type Fail = { ok: false; error: string };

// Only the content fields; ids, owner, and dates never copy across.
function editOf(source: VideoEdit): VideoEdit {
  return {
    layers: source.layers.map((layer) => ({ ...layer })),
    ...(source.intro ? { intro: { ...source.intro } } : {}),
    ...(source.outro ? { outro: { ...source.outro } } : {}),
  };
}

async function ownedVideo(videoId: string, clerkUserId: string) {
  if (!ObjectId.isValid(videoId)) return null;
  const videos = await videosCollection();
  return videos.findOne({ _id: new ObjectId(videoId), clerkUserId });
}

async function ownedTemplate(templateId: string, clerkUserId: string) {
  if (!ObjectId.isValid(templateId)) return null;
  const templates = await videoTemplatesCollection();
  return templates.findOne({ _id: new ObjectId(templateId), clerkUserId });
}

async function nameTaken(clerkUserId: string, name: string, exceptId?: ObjectId) {
  const templates = await videoTemplatesCollection();
  const found = await templates.findOne({ clerkUserId, name, ...(exceptId ? { _id: { $ne: exceptId } } : {}) });
  return Boolean(found);
}

function revalidateVideo(projectId: ObjectId) {
  revalidatePath(`/app/projects/${projectId.toHexString()}`);
}

export async function listTemplatesAction(): Promise<{ ok: true; templates: PublicTemplate[] } | Fail> {
  const user = await requireAppUser();
  const templates = await videoTemplatesCollection();
  const rows = await templates.find({ clerkUserId: user.clerkUserId }).sort({ updatedAt: -1 }).toArray();
  return { ok: true, templates: rows.map(toPublicTemplate) };
}

// Copy the template onto the video; later edits stay on the video.
export async function applyTemplateAction(
  videoId: string,
  templateId: string,
): Promise<{ ok: true; project: PublicVideo } | Fail> {
  const user = await requireAppUser();
  const video = await ownedVideo(videoId, user.clerkUserId);
  const template = await ownedTemplate(templateId, user.clerkUserId);
  if (!video || !template) return { ok: false, error: "找不到影片或樣板" };
  const videos = await videosCollection();
  await videos.updateOne(
    { _id: video._id },
    { $set: { edit: editOf(template), editTemplateId: template._id, updatedAt: new Date() } },
  );
  revalidateVideo(video.projectId);
  const updated = await videos.findOne({ _id: video._id });
  return updated ? { ok: true, project: toPublicVideo(updated) } : { ok: false, error: "找不到影片" };
}

export async function saveTemplateAction(
  videoId: string,
  rawName: string,
): Promise<{ ok: true; project: PublicVideo; template: PublicTemplate } | Fail> {
  const user = await requireAppUser();
  const checked = normalizeTemplateName(rawName);
  if (!checked.ok) return checked;
  const video = await ownedVideo(videoId, user.clerkUserId);
  if (!video) return { ok: false, error: "找不到影片" };
  if (!video.edit || !hasEdit(video.edit)) return { ok: false, error: "先加入圖層或開頭結尾" };
  if (await nameTaken(user.clerkUserId, checked.name)) return { ok: false, error: "已有同名樣板" };

  const now = new Date();
  const templates = await videoTemplatesCollection();
  const doc = { clerkUserId: user.clerkUserId, name: checked.name, ...editOf(video.edit), createdAt: now, updatedAt: now };
  const inserted = await templates.insertOne(doc);
  const videos = await videosCollection();
  await videos.updateOne({ _id: video._id }, { $set: { editTemplateId: inserted.insertedId, updatedAt: now } });
  revalidateVideo(video.projectId);
  const updated = await videos.findOne({ _id: video._id });
  if (!updated) return { ok: false, error: "找不到影片" };
  return {
    ok: true,
    project: toPublicVideo(updated),
    template: toPublicTemplate({ ...doc, _id: inserted.insertedId }),
  };
}

// Overwrite only the template this video came from. Other videos keep their copies.
export async function overwriteTemplateAction(
  videoId: string,
  templateId: string,
): Promise<{ ok: true; template: PublicTemplate } | Fail> {
  const user = await requireAppUser();
  const video = await ownedVideo(videoId, user.clerkUserId);
  const template = await ownedTemplate(templateId, user.clerkUserId);
  if (!video || !template) return { ok: false, error: "找不到影片或樣板" };
  if (!video.editTemplateId?.equals(template._id)) return { ok: false, error: "這支影片不是從這個樣板來的" };
  if (!video.edit || !hasEdit(video.edit)) return { ok: false, error: "先加入圖層或開頭結尾" };

  const next = { ...editOf(video.edit), updatedAt: new Date() };
  // A removed intro/outro must also leave the template.
  const unset: Record<string, ""> = {};
  if (!next.intro) unset.intro = "";
  if (!next.outro) unset.outro = "";
  const templates = await videoTemplatesCollection();
  await templates.updateOne(
    { _id: template._id },
    Object.keys(unset).length ? { $set: next, $unset: unset } : { $set: next },
  );
  const updated = await templates.findOne({ _id: template._id });
  return updated ? { ok: true, template: toPublicTemplate(updated) } : { ok: false, error: "找不到樣板" };
}

export async function renameTemplateAction(
  templateId: string,
  rawName: string,
): Promise<{ ok: true; template: PublicTemplate } | Fail> {
  const user = await requireAppUser();
  const checked = normalizeTemplateName(rawName);
  if (!checked.ok) return checked;
  const template = await ownedTemplate(templateId, user.clerkUserId);
  if (!template) return { ok: false, error: "找不到樣板" };
  if (await nameTaken(user.clerkUserId, checked.name, template._id)) return { ok: false, error: "已有同名樣板" };
  const templates = await videoTemplatesCollection();
  await templates.updateOne({ _id: template._id }, { $set: { name: checked.name, updatedAt: new Date() } });
  const updated = await templates.findOne({ _id: template._id });
  return updated ? { ok: true, template: toPublicTemplate(updated) } : { ok: false, error: "找不到樣板" };
}

// Videos keep their edit copies; a dangling editTemplateId just hides the update button.
export async function deleteTemplateAction(templateId: string): Promise<{ ok: true } | Fail> {
  const user = await requireAppUser();
  const template = await ownedTemplate(templateId, user.clerkUserId);
  if (!template) return { ok: false, error: "找不到樣板" };
  const templates = await videoTemplatesCollection();
  await templates.deleteOne({ _id: template._id });
  return { ok: true };
}
```

- [ ] **Step 3: 驗證**

Run: `npx tsc --noEmit && npm run lint`
Expected: 無錯誤。

- [ ] **Step 4: Commit**

```bash
git add src/dao/video-templates.ts src/dao/index.ts src/service/video-edit/template-actions.ts
git commit -m "feat(video-edit): template collection and CRUD actions"
```

---

### Task 8: 編輯、上傳、匯出 actions 與背景工作

**Files:**
- Create: `src/service/video-edit/edit-actions.ts`
- Create: `src/service/video-edit/final-job.ts`
- Create: `src/presentation/actions/video-edit.ts`
- Modify: `next.config.ts`（`bodySizeLimit`）
- Modify: `src/presentation/components/app/projects/new/use-project-poll.ts`

**Interfaces:**
- Consumes: Task 2–7 全部。
- Produces:

```ts
// edit-actions.ts
export async function updateVideoEditAction(videoId: string, edit: unknown): Promise<{ ok: true; project: PublicVideo } | Fail>;
export async function uploadBrandAssetAction(formData: FormData): Promise<{ ok: true; url: string; kind: "image" | "video" } | Fail>;
export async function exportFinalVideoAction(videoId: string): Promise<{ ok: true; project: PublicVideo } | Fail>;
// final-job.ts
export async function runFinalJob(videoId: ObjectId, fingerprint: string): Promise<void>;
// presentation/actions/video-edit.ts：以上 3 個＋Task 7 的 6 個，皆為同名 "use server" 包裝
```

- [ ] **Step 1: 背景工作 `final-job.ts`**

```ts
import type { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";
import { persistBuffer } from "@/service/higgsfield/persist";
import { finalFingerprint, hashText } from "@/service/video-edit/edit-state";
import { renderFinalVideo } from "@/service/video-edit/render";

// ffmpeg errors are English noise; keep our own Chinese messages.
function finalErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return /[\u4e00-\u9fff]/.test(message) ? message : "匯出影片失敗，請確認素材格式後再試";
}

// queued → in_progress → completed / failed, like runReelJob. An edit or clip
// change mid-render drops the file and asks for a re-export.
export async function runFinalJob(videoId: ObjectId, fingerprint: string) {
  const videos = await videosCollection();
  const claimed = await videos.findOneAndUpdate(
    { _id: videoId, finalFingerprint: fingerprint, finalStatus: "queued" },
    { $set: { finalStatus: "in_progress", updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!claimed) return;

  try {
    if (!claimed.edit || !claimed.reelUrl) throw new Error("缺少成片或圖層設定");
    const buffer = await renderFinalVideo(claimed.reelUrl, claimed.edit);
    const finalUrl = await persistBuffer(
      buffer,
      `explainer/${videoId.toHexString()}/final-${hashText(fingerprint)}.mp4`,
      "video/mp4",
    );
    const latest = await videos.findOne({ _id: videoId });
    if (!latest || finalFingerprint(latest) !== fingerprint) {
      await videos.updateOne(
        { _id: videoId, finalFingerprint: fingerprint },
        { $set: { finalStatus: "failed", finalError: "匯出期間圖層有變動，請重新匯出", updatedAt: new Date() } },
      );
      return;
    }
    await videos.updateOne(
      { _id: videoId, finalFingerprint: fingerprint },
      { $set: { finalUrl, finalStatus: "completed", updatedAt: new Date() }, $unset: { finalError: "" } },
    );
  } catch (error) {
    await videos.updateOne(
      { _id: videoId, finalFingerprint: fingerprint },
      { $set: { finalStatus: "failed", finalError: finalErrorMessage(error), updatedAt: new Date() } },
    );
  }
}
```

- [ ] **Step 2: `edit-actions.ts`**

```ts
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { ObjectId } from "mongodb";
import { requireAppUser } from "@/service/auth";
import { videosCollection } from "@/dao";
import { persistBuffer } from "@/service/higgsfield/persist";
import { isReelCurrent } from "@/service/reel/fingerprint";
import {
  brandAssetPath,
  checkBrandUpload,
  editAssetUrls,
  finalFingerprint,
  hasEdit,
  isBrandAssetUrl,
  isFinalBusy,
  isFinalCurrent,
} from "@/service/video-edit/edit-state";
import { runFinalJob } from "@/service/video-edit/final-job";
import { toPublicVideo, type PublicVideo } from "@/presentation/serialize";
import { videoEditSchema } from "@/model/video-edit";

type Fail = { ok: false; error: string };
type ProjectResult = { ok: true; project: PublicVideo } | Fail;

async function ownedVideo(videoId: string, clerkUserId: string) {
  if (!ObjectId.isValid(videoId)) return null;
  const videos = await videosCollection();
  return videos.findOne({ _id: new ObjectId(videoId), clerkUserId });
}

// Autosave from the Video tab. Asset URLs must live in this user's Blob folder.
export async function updateVideoEditAction(videoId: string, edit: unknown): Promise<ProjectResult> {
  const user = await requireAppUser();
  const parsed = videoEditSchema.safeParse(edit);
  if (!parsed.success) return { ok: false, error: "圖層設定格式錯誤" };
  if (!editAssetUrls(parsed.data).every((url) => isBrandAssetUrl(url, user.clerkUserId))) {
    return { ok: false, error: "素材網址無效，請重新上傳" };
  }
  const video = await ownedVideo(videoId, user.clerkUserId);
  if (!video) return { ok: false, error: "找不到影片" };
  const videos = await videosCollection();
  await videos.updateOne({ _id: video._id }, { $set: { edit: parsed.data, updatedAt: new Date() } });
  const updated = await videos.findOne({ _id: video._id });
  return updated ? { ok: true, project: toPublicVideo(updated) } : { ok: false, error: "找不到影片" };
}

export async function uploadBrandAssetAction(
  formData: FormData,
): Promise<{ ok: true; url: string; kind: "image" | "video" } | Fail> {
  const user = await requireAppUser();
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "沒有收到檔案" };
  const checked = checkBrandUpload(file);
  if (!checked.ok) return checked;
  const url = await persistBuffer(
    Buffer.from(await file.arrayBuffer()),
    brandAssetPath(user.clerkUserId, randomUUID(), checked.ext),
    file.type,
  );
  return { ok: true, url, kind: checked.kind };
}

// Queue the branded render. Idempotent for a fingerprint already queued, running, or done.
export async function exportFinalVideoAction(videoId: string): Promise<ProjectResult> {
  const user = await requireAppUser();
  const video = await ownedVideo(videoId, user.clerkUserId);
  if (!video) return { ok: false, error: "找不到影片" };
  if (!isReelCurrent(video)) return { ok: false, error: "成片合成中，完成後再匯出" };
  if (!hasEdit(video.edit)) return { ok: false, error: "先加入圖層或開頭結尾" };

  const fingerprint = finalFingerprint(video);
  const videos = await videosCollection();
  const alreadyRunning = isFinalBusy(video.finalStatus) && video.finalFingerprint === fingerprint;
  if (!isFinalCurrent(video) && !alreadyRunning) {
    await videos.updateOne(
      { _id: video._id },
      {
        $set: { finalStatus: "queued", finalFingerprint: fingerprint, updatedAt: new Date() },
        $unset: { finalError: "" },
      },
    );
    after(() => runFinalJob(video._id, fingerprint));
    revalidatePath(`/app/projects/${video.projectId.toHexString()}`);
  }
  const updated = await videos.findOne({ _id: video._id });
  return updated ? { ok: true, project: toPublicVideo(updated) } : { ok: false, error: "找不到影片" };
}
```

- [ ] **Step 3: presentation 包裝**

`src/presentation/actions/video-edit.ts`（照 `presentation/actions/reel.ts` 的寫法）：

```ts
"use server";

import * as edit from "@/service/video-edit/edit-actions";
import * as templates from "@/service/video-edit/template-actions";

export async function updateVideoEditAction(...args: Parameters<typeof edit.updateVideoEditAction>) {
  return edit.updateVideoEditAction(...args);
}
export async function uploadBrandAssetAction(...args: Parameters<typeof edit.uploadBrandAssetAction>) {
  return edit.uploadBrandAssetAction(...args);
}
export async function exportFinalVideoAction(...args: Parameters<typeof edit.exportFinalVideoAction>) {
  return edit.exportFinalVideoAction(...args);
}
export async function listTemplatesAction() {
  return templates.listTemplatesAction();
}
export async function applyTemplateAction(...args: Parameters<typeof templates.applyTemplateAction>) {
  return templates.applyTemplateAction(...args);
}
export async function saveTemplateAction(...args: Parameters<typeof templates.saveTemplateAction>) {
  return templates.saveTemplateAction(...args);
}
export async function overwriteTemplateAction(...args: Parameters<typeof templates.overwriteTemplateAction>) {
  return templates.overwriteTemplateAction(...args);
}
export async function renameTemplateAction(...args: Parameters<typeof templates.renameTemplateAction>) {
  return templates.renameTemplateAction(...args);
}
export async function deleteTemplateAction(...args: Parameters<typeof templates.deleteTemplateAction>) {
  return templates.deleteTemplateAction(...args);
}
```

- [ ] **Step 4: 上傳上限**

`next.config.ts`：`bodySizeLimit: "6mb"` 改為 `"60mb"`，註解改為：

```ts
      // Frame annotations (data URL) and Video-tab brand uploads (videos up to 50MB).
      bodySizeLimit: "60mb",
```

- [ ] **Step 5: 輪詢涵蓋匯出**

`use-project-poll.ts`：

```ts
import { isFinalBusy } from "@/service/video-edit/edit-state";
...
  const reelBusy = project ? isReelBusy(project.reelStatus) || isFinalBusy(project.finalStatus) : false;
```

並把 settle 判斷改為 `if (!isProjectBusy(next) && !isReelBusy(next.reelStatus) && !isFinalBusy(next.finalStatus))`。註解補「or the branded export is rendering」。

- [ ] **Step 6: 驗證**

Run: `npx tsc --noEmit && npm run lint && npx tsx --test src/service/video-edit/*.test.ts`
Expected: 無錯誤、全部 PASS。

- [ ] **Step 7: Commit**

```bash
git add src/service/video-edit/edit-actions.ts src/service/video-edit/final-job.ts src/presentation/actions/video-edit.ts next.config.ts src/presentation/components/app/projects/new/use-project-poll.ts
git commit -m "feat(video-edit): edit, upload, and export actions with background render"
```

---

### Task 9: 預覽元件（播放器＋可拖曳圖層＋開頭結尾卡）

**Files:**
- Create: `src/presentation/components/app/projects/new/video-edit-preview.tsx`
- Create: `src/presentation/components/app/projects/new/use-element-size.ts`

**Interfaces:**
- Consumes: `layerPlacement`、`placementStyle`、`placementFromDrag`、`widthPctFromBox`（Task 3）；`ASPECT_CLASS`（`@/presentation/components/project/frame-tile`）。
- Produces:

```ts
export type EditSelection = "" | "intro" | "outro" | string; // string = layer id
export function useElementSize<T extends HTMLElement>(): [React.RefObject<T | null>, { width: number; height: number }];
export function VideoEditPreview(props: {
  reelUrl?: string;
  aspectRatio: AspectRatio;
  edit: VideoEdit;
  selected: EditSelection;
  onSelect: (id: EditSelection) => void;
  onLayerChange: (id: string, patch: Partial<BrandLayer>) => void;
}): React.ReactElement;
```

- [ ] **Step 1: `use-element-size.ts`**

```ts
"use client";

import { useEffect, useRef, useState } from "react";

// Live pixel size of an element, for mapping % placement onto the preview.
export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}
```

- [ ] **Step 2: `video-edit-preview.tsx`**

```tsx
"use client";

import { useRef, useState } from "react";
import { ASPECT_CLASS } from "@/presentation/components/project/frame-tile";
import { useElementSize } from "@/presentation/components/app/projects/new/use-element-size";
import {
  layerPlacement,
  placementFromDrag,
  placementStyle,
  widthPctFromBox,
} from "@/service/video-edit/layer-placement";
import type { AspectRatio } from "@/model/project";
import type { BookendClip, BrandLayer, VideoEdit } from "@/model/video-edit";

export type EditSelection = "" | "intro" | "outro" | string;

type Drag = { id: string; mode: "move" | "resize"; startX: number; startY: number; left: number; top: number; w: number; h: number };

// Reel player with brand layers drawn on top. The selected layer drags to a
// corner and resizes from its bottom-right handle; values save as percentages.
export function VideoEditPreview({
  reelUrl,
  aspectRatio,
  edit,
  selected,
  onSelect,
  onLayerChange,
}: {
  reelUrl?: string;
  aspectRatio: AspectRatio;
  edit: VideoEdit;
  selected: EditSelection;
  onSelect: (id: EditSelection) => void;
  onLayerChange: (id: string, patch: Partial<BrandLayer>) => void;
}) {
  const [frameRef, frame] = useElementSize<HTMLDivElement>();
  const [drag, setDrag] = useState<Drag | null>(null);
  const [live, setLive] = useState<{ left: number; top: number; w: number } | null>(null);
  const boxes = useRef(new Map<string, HTMLImageElement>());
  const showing = selected === "intro" || selected === "outro" ? edit[selected] : undefined;

  function startDrag(event: React.PointerEvent, layer: BrandLayer, mode: Drag["mode"]) {
    const img = boxes.current.get(layer.id);
    const host = frameRef.current;
    if (!img || !host) return;
    event.stopPropagation();
    (event.target as Element).setPointerCapture(event.pointerId);
    const a = img.getBoundingClientRect();
    const b = host.getBoundingClientRect();
    onSelect(layer.id);
    setDrag({ id: layer.id, mode, startX: event.clientX, startY: event.clientY, left: a.left - b.left, top: a.top - b.top, w: a.width, h: a.height });
    setLive({ left: a.left - b.left, top: a.top - b.top, w: a.width });
  }

  function moveDrag(event: React.PointerEvent) {
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    setLive(
      drag.mode === "move"
        ? { left: drag.left + dx, top: drag.top + dy, w: drag.w }
        : { left: drag.left, top: drag.top, w: Math.max(8, drag.w + dx) },
    );
  }

  function endDrag() {
    if (!drag || !live) return;
    const boxH = (drag.h / drag.w) * live.w;
    const patch =
      drag.mode === "move"
        ? placementFromDrag({ left: live.left, top: live.top, boxW: live.w, boxH, frameW: frame.width, frameH: frame.height })
        : { widthPct: widthPctFromBox(live.w, frame.width) };
    onLayerChange(drag.id, patch);
    setDrag(null);
    setLive(null);
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div
        ref={frameRef}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onClick={() => onSelect("")}
        className={`relative w-full overflow-hidden rounded-lg bg-black ${aspectRatio === "9:16" ? "max-w-[22rem]" : "max-w-3xl"} ${ASPECT_CLASS[aspectRatio]}`}
      >
        {showing ? (
          <BookendMedia clip={showing} />
        ) : reelUrl ? (
          <video key={reelUrl} src={reelUrl} controls className="absolute inset-0 h-full w-full object-contain" />
        ) : (
          <p className="absolute inset-0 grid place-items-center text-sm text-white/70">成片合成中…</p>
        )}
        {showing || !frame.width
          ? null
          : edit.layers.map((layer) => {
              const dragging = drag?.id === layer.id ? live : null;
              const style = dragging
                ? { width: dragging.w, left: dragging.left, top: dragging.top }
                : placementStyle(layerPlacement(layer, frame.width, frame.height));
              const active = selected === layer.id;
              return (
                <div
                  key={layer.id}
                  className={`absolute touch-none ${active ? "outline outline-2 outline-[var(--studio-teal)]" : ""}`}
                  style={{ ...style, opacity: layer.opacity }}
                  onPointerDown={(event) => startDrag(event, layer, "move")}
                  onClick={(event) => event.stopPropagation()}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={(node) => {
                      if (node) boxes.current.set(layer.id, node);
                      else boxes.current.delete(layer.id);
                    }}
                    src={layer.assetUrl}
                    alt=""
                    draggable={false}
                    className="block h-auto w-full cursor-move select-none"
                  />
                  {active ? (
                    <span
                      aria-label="調整大小"
                      onPointerDown={(event) => startDrag(event, layer, "resize")}
                      className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize rounded-sm border border-white bg-[var(--studio-teal)]"
                    />
                  ) : null}
                </div>
              );
            })}
      </div>
      <div className="flex gap-3">
        <BookendCard label="開頭" clip={edit.intro} active={selected === "intro"} onClick={() => onSelect(selected === "intro" ? "" : "intro")} />
        <BookendCard label="正片" active={!showing} onClick={() => onSelect("")} />
        <BookendCard label="結尾" clip={edit.outro} active={selected === "outro"} onClick={() => onSelect(selected === "outro" ? "" : "outro")} />
      </div>
    </div>
  );
}

function BookendMedia({ clip }: { clip: BookendClip }) {
  return clip.kind === "video" ? (
    <video key={clip.assetUrl} src={clip.assetUrl} controls autoPlay className="absolute inset-0 h-full w-full object-cover" />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={clip.assetUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
  );
}

function BookendCard({ label, clip, active, onClick }: { label: string; clip?: BookendClip; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-20 flex-col overflow-hidden rounded-md border text-left text-[11px] font-semibold ${active ? "border-2 border-[var(--studio-teal)]" : "border-[var(--studio-line)]"}`}
    >
      <span className="relative block aspect-video bg-[var(--studio-fill)]">
        {clip?.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={clip.assetUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : clip?.kind === "video" ? (
          <video src={clip.assetUrl} muted className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
      </span>
      <span className="bg-white px-1.5 py-1">{label}</span>
    </button>
  );
}
```

- [ ] **Step 3: 驗證**

Run: `npx tsc --noEmit && npm run lint`
Expected: 無錯誤（此時元件尚未被引用，Task 11 才接上）。

- [ ] **Step 4: Commit**

```bash
git add src/presentation/components/app/projects/new/video-edit-preview.tsx src/presentation/components/app/projects/new/use-element-size.ts
git commit -m "feat(video-edit): preview with draggable brand layers"
```

---

### Task 10: 左欄面板（樣板、圖層、開頭結尾、屬性、匯出）

**Files:**
- Create: `src/presentation/components/app/projects/new/brand-upload-button.tsx`
- Create: `src/presentation/components/app/projects/new/template-name-dialog.tsx`
- Create: `src/presentation/components/app/projects/new/video-edit-templates.tsx`
- Create: `src/presentation/components/app/projects/new/video-edit-layers.tsx`
- Create: `src/presentation/components/app/projects/new/video-edit-properties.tsx`
- Create: `src/presentation/components/app/projects/new/video-edit-export.tsx`
- Create: `src/presentation/components/app/projects/new/use-file-download.ts`（抽自 `reel-player.tsx` 的下載邏輯；`reel-player.tsx` 在 Task 11 隨 `reel-export.tsx` 一起刪除）

**Interfaces:**
- Consumes: `uploadBrandAssetAction`（Task 8）、`PublicTemplate`、`PublicVideo`（Task 2）、`EDIT_LIMITS`、`BRAND_ANCHORS`（Task 2）、`isEditDirty`、`isFinalCurrent`、`isFinalBusy`、`hasEdit`（Task 4）、`isReelCurrent`（既有）、`EditSelection`（Task 9）。
- Produces:

```ts
export function useFileDownload(): { saving: boolean; error: string; download: (src: string, filename: string) => Promise<void> };
export function BrandUploadButton(props: { label: string; accept: string; disabled?: boolean; onUploaded: (asset: { url: string; kind: "image" | "video" }) => void; onError: (message: string) => void }): React.ReactElement;
export function TemplateNameDialog(props: { title: string; initialName?: string; submitLabel: string; pending: boolean; error: string; onSubmit: (name: string) => void; onClose: () => void }): React.ReactElement;
export function VideoEditTemplates(props: {
  templates: PublicTemplate[]; edit: VideoEdit; editTemplateId?: string; busy: boolean;
  onApply: (templateId: string) => void; onSaveNew: (name: string) => Promise<string>;   // resolves "" on success, else error
  onOverwrite: (templateId: string) => void; onRename: (templateId: string, name: string) => Promise<string>; onDelete: (templateId: string) => void;
}): React.ReactElement;
export function VideoEditLayers(props: {
  edit: VideoEdit; selected: EditSelection; busy: boolean;
  onSelect: (id: EditSelection) => void; onAddLayer: (url: string) => void; onRemoveLayer: (id: string) => void; onMoveLayer: (id: string, delta: -1 | 1) => void;
  onSetBookend: (slot: "intro" | "outro", asset: { url: string; kind: "image" | "video" }) => void; onRemoveBookend: (slot: "intro" | "outro") => void; onError: (message: string) => void;
}): React.ReactElement;
export function VideoEditProperties(props: { edit: VideoEdit; selected: EditSelection; onLayerChange: (id: string, patch: Partial<BrandLayer>) => void; onBookendChange: (slot: "intro" | "outro", patch: Partial<BookendClip>) => void }): React.ReactElement | null;
export function VideoEditExport(props: { project: PublicVideo; edit: VideoEdit; saving: boolean; pending: boolean; onExport: () => void }): React.ReactElement;
```

- [ ] **Step 1: `use-file-download.ts`（從 ReelPlayer 抽出）**

```ts
"use client";

import { useState } from "react";

// Blob URLs are cross-origin, so fetch then save instead of <a download>.
export function useFileDownload() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function download(src: string, filename: string) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(src);
      if (!response.ok) throw new Error("下載失敗，請再試一次");
      const href = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = href;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(href);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "下載失敗，請再試一次");
    } finally {
      setSaving(false);
    }
  }

  return { saving, error, download };
}
```

- [ ] **Step 2: `brand-upload-button.tsx`**

```tsx
"use client";

import { useRef, useState } from "react";
import { Spinner } from "@/presentation/components/spinner";
import { uploadBrandAssetAction } from "@/presentation/actions/video-edit";
import { checkBrandUpload } from "@/service/video-edit/edit-state";

// Hidden file input behind a studio ghost button; checks type/size before posting.
export function BrandUploadButton({
  label,
  accept,
  disabled = false,
  onUploaded,
  onError,
}: {
  label: string;
  accept: string;
  disabled?: boolean;
  onUploaded: (asset: { url: string; kind: "image" | "video" }) => void;
  onError: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const checked = checkBrandUpload(file);
    if (!checked.ok) {
      onError(checked.error);
      return;
    }
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const result = await uploadBrandAssetAction(form);
    setUploading(false);
    if (!result.ok) onError(result.error);
    else onUploaded({ url: result.url, kind: result.kind });
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-md bg-[var(--studio-fill)] px-2.5 text-xs font-semibold text-[var(--studio-ink)] hover:bg-[#e7e8eb] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {uploading ? <Spinner className="h-3.5 w-3.5" /> : null}
        {uploading ? "上傳中…" : label}
      </button>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(event) => void onChange(event)} />
    </>
  );
}
```

- [ ] **Step 3: `template-name-dialog.tsx`**（照 `create-folder-modal.tsx` 的 Escape 關閉與 overlay 點擊關閉）

```tsx
"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Spinner } from "@/presentation/components/spinner";
import { StudioButton } from "@/presentation/studio/studio-button";
import { EDIT_LIMITS } from "@/model/video-edit";

// Name prompt for「儲存為新樣板」and rename.
export function TemplateNameDialog({
  title,
  initialName = "",
  submitLabel,
  pending,
  error,
  onSubmit,
  onClose,
}: {
  title: string;
  initialName?: string;
  submitLabel: string;
  pending: boolean;
  error: string;
  onSubmit: (name: string) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialName);

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-sm rounded-xl border border-[var(--studio-line)] bg-white p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-base font-semibold">{title}</h2>
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(name);
          }}
        >
          <input
            ref={inputRef}
            value={name}
            maxLength={EDIT_LIMITS.templateName.max}
            onChange={(event) => setName(event.target.value)}
            placeholder="例如：品牌 A 直式"
            disabled={pending}
            className="min-h-9 w-full rounded-lg border border-[var(--studio-line)] px-3 text-sm"
          />
          {error ? <p className="text-xs text-[#e11d48]">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <StudioButton variant="ghost" onClick={onClose} disabled={pending}>取消</StudioButton>
            <StudioButton type="submit" disabled={pending || !name.trim()}>
              {pending ? <Spinner className="h-4 w-4" /> : null}
              {submitLabel}
            </StudioButton>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: `video-edit-templates.tsx`**

```tsx
"use client";

import { useState } from "react";
import { StudioButton } from "@/presentation/studio/studio-button";
import { TemplateNameDialog } from "@/presentation/components/app/projects/new/template-name-dialog";
import { hasEdit, isEditDirty } from "@/service/video-edit/edit-state";
import type { PublicTemplate } from "@/presentation/serialize";
import type { VideoEdit } from "@/model/video-edit";

type Dialog = { mode: "new" } | { mode: "rename"; template: PublicTemplate } | null;

// Template picker, save-as-new, overwrite-source, rename, delete.
export function VideoEditTemplates({
  templates,
  edit,
  editTemplateId,
  busy,
  onApply,
  onSaveNew,
  onOverwrite,
  onRename,
  onDelete,
}: {
  templates: PublicTemplate[];
  edit: VideoEdit;
  editTemplateId?: string;
  busy: boolean;
  onApply: (templateId: string) => void;
  onSaveNew: (name: string) => Promise<string>;
  onOverwrite: (templateId: string) => void;
  onRename: (templateId: string, name: string) => Promise<string>;
  onDelete: (templateId: string) => void;
}) {
  const [picked, setPicked] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [dialogError, setDialogError] = useState("");
  const [dialogPending, setDialogPending] = useState(false);
  const [managing, setManaging] = useState(false);
  const source = templates.find((template) => template.id === editTemplateId);
  const canOverwrite = Boolean(source && hasEdit(edit) && isEditDirty(edit, source));

  async function submitDialog(name: string) {
    if (!dialog) return;
    setDialogPending(true);
    const error = dialog.mode === "new" ? await onSaveNew(name) : await onRename(dialog.template.id, name);
    setDialogPending(false);
    if (error) setDialogError(error);
    else setDialog(null);
  }

  function confirmOverwrite() {
    if (!source) return;
    if (window.confirm(`會覆寫〈${source.name}〉，之前套用過的影片不會變。`)) onOverwrite(source.id);
  }

  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-bold text-[var(--studio-muted)]">樣板</h3>
      <div className="flex gap-2">
        <select
          value={picked}
          onChange={(event) => setPicked(event.target.value)}
          className="min-h-9 min-w-0 flex-1 rounded-lg border border-[var(--studio-line)] px-2 text-sm"
        >
          <option value="">{templates.length ? "選擇樣板…" : "還沒有樣板"}</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>{template.name}</option>
          ))}
        </select>
        <StudioButton variant="ghost" disabled={!picked || busy} onClick={() => onApply(picked)}>套用</StudioButton>
      </div>
      <div className="flex flex-wrap gap-2">
        <StudioButton
          variant="ghost"
          className="min-h-8 text-xs"
          disabled={!hasEdit(edit) || busy}
          onClick={() => {
            setDialogError("");
            setDialog({ mode: "new" });
          }}
        >
          儲存為新樣板
        </StudioButton>
        {canOverwrite && source ? (
          <StudioButton className="min-h-8 text-xs" disabled={busy} onClick={confirmOverwrite}>
            更新樣板〈{source.name}〉
          </StudioButton>
        ) : null}
        {templates.length ? (
          <button type="button" onClick={() => setManaging((v) => !v)} className="text-xs font-semibold text-[var(--studio-muted)] hover:text-[var(--studio-ink)]">
            {managing ? "完成" : "管理"}
          </button>
        ) : null}
      </div>
      {managing ? (
        <ul className="space-y-1 rounded-lg bg-[var(--studio-fill)] p-2 text-xs">
          {templates.map((template) => (
            <li key={template.id} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate">{template.name}</span>
              <button type="button" className="font-semibold text-[var(--studio-muted)] hover:text-[var(--studio-ink)]" onClick={() => { setDialogError(""); setDialog({ mode: "rename", template }); }}>改名</button>
              <button type="button" className="font-semibold text-[#e11d48]" onClick={() => { if (window.confirm(`刪除〈${template.name}〉？已套用的影片不受影響。`)) onDelete(template.id); }}>刪除</button>
            </li>
          ))}
        </ul>
      ) : null}
      {dialog ? (
        <TemplateNameDialog
          title={dialog.mode === "new" ? "儲存為新樣板" : "樣板改名"}
          initialName={dialog.mode === "rename" ? dialog.template.name : ""}
          submitLabel={dialog.mode === "new" ? "儲存" : "改名"}
          pending={dialogPending}
          error={dialogError}
          onSubmit={(name) => void submitDialog(name)}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </section>
  );
}
```

- [ ] **Step 5: `video-edit-layers.tsx`**

```tsx
"use client";

import { BrandUploadButton } from "@/presentation/components/app/projects/new/brand-upload-button";
import type { EditSelection } from "@/presentation/components/app/projects/new/video-edit-preview";
import type { BookendClip, VideoEdit } from "@/model/video-edit";

const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp";
const MEDIA_ACCEPT = `${IMAGE_ACCEPT},video/mp4,video/quicktime`;

// Layer list (top of stack first) plus intro / outro slots.
export function VideoEditLayers({
  edit,
  selected,
  busy,
  onSelect,
  onAddLayer,
  onRemoveLayer,
  onMoveLayer,
  onSetBookend,
  onRemoveBookend,
  onError,
}: {
  edit: VideoEdit;
  selected: EditSelection;
  busy: boolean;
  onSelect: (id: EditSelection) => void;
  onAddLayer: (url: string) => void;
  onRemoveLayer: (id: string) => void;
  onMoveLayer: (id: string, delta: -1 | 1) => void;
  onSetBookend: (slot: "intro" | "outro", asset: { url: string; kind: "image" | "video" }) => void;
  onRemoveBookend: (slot: "intro" | "outro") => void;
  onError: (message: string) => void;
}) {
  const topFirst = [...edit.layers].reverse();
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold text-[var(--studio-muted)]">圖層</h3>
        <BrandUploadButton label="＋ 圖片／Logo" accept={IMAGE_ACCEPT} disabled={busy} onUploaded={(asset) => onAddLayer(asset.url)} onError={onError} />
      </div>
      {topFirst.length === 0 ? (
        <p className="text-xs text-[var(--studio-muted)]">加一張 logo 或圖片，會疊在整支正片上。</p>
      ) : (
        <ul className="space-y-1">
          {topFirst.map((layer, i) => (
            <li
              key={layer.id}
              className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs ${selected === layer.id ? "border-[var(--studio-teal)] bg-[var(--studio-cyan-soft)]" : "border-[var(--studio-line)] bg-white"}`}
            >
              <button type="button" onClick={() => onSelect(layer.id)} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={layer.assetUrl} alt="" className="h-7 w-7 rounded object-contain bg-[var(--studio-fill)]" />
                <span className="truncate">圖層 {topFirst.length - i}</span>
              </button>
              <button type="button" aria-label="上移" disabled={i === 0} onClick={() => onMoveLayer(layer.id, 1)} className="px-1 disabled:opacity-30">↑</button>
              <button type="button" aria-label="下移" disabled={i === topFirst.length - 1} onClick={() => onMoveLayer(layer.id, -1)} className="px-1 disabled:opacity-30">↓</button>
              <button type="button" aria-label="刪除圖層" onClick={() => onRemoveLayer(layer.id)} className="px-1 text-[#e11d48]">✕</button>
            </li>
          ))}
        </ul>
      )}
      {(["intro", "outro"] as const).map((slot) => (
        <BookendRow
          key={slot}
          label={slot === "intro" ? "開頭" : "結尾"}
          clip={edit[slot]}
          active={selected === slot}
          busy={busy}
          onSelect={() => onSelect(slot)}
          onUploaded={(asset) => onSetBookend(slot, asset)}
          onRemove={() => onRemoveBookend(slot)}
          onError={onError}
        />
      ))}
    </section>
  );
}

function BookendRow({
  label, clip, active, busy, onSelect, onUploaded, onRemove, onError,
}: {
  label: string;
  clip?: BookendClip;
  active: boolean;
  busy: boolean;
  onSelect: () => void;
  onUploaded: (asset: { url: string; kind: "image" | "video" }) => void;
  onRemove: () => void;
  onError: (message: string) => void;
}) {
  return (
    <div className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs ${active ? "border-[var(--studio-teal)] bg-[var(--studio-cyan-soft)]" : "border-[var(--studio-line)] bg-white"}`}>
      <button type="button" onClick={onSelect} disabled={!clip} className="min-w-0 flex-1 cursor-pointer text-left font-semibold disabled:cursor-default">
        {label}
        <span className="ml-1 font-normal text-[var(--studio-muted)]">
          {clip ? (clip.kind === "video" ? "影片" : `圖片 · ${clip.durationSec} 秒`) : "未設定"}
        </span>
      </button>
      <BrandUploadButton label={clip ? "替換" : "上傳"} accept={MEDIA_ACCEPT} disabled={busy} onUploaded={onUploaded} onError={onError} />
      {clip ? <button type="button" aria-label={`移除${label}`} onClick={onRemove} className="px-1 text-[#e11d48]">✕</button> : null}
    </div>
  );
}
```

- [ ] **Step 6: `video-edit-properties.tsx`**

```tsx
"use client";

import { BRAND_ANCHORS, EDIT_LIMITS, type BookendClip, type BrandAnchor, type BrandLayer, type VideoEdit } from "@/model/video-edit";
import type { EditSelection } from "@/presentation/components/app/projects/new/video-edit-preview";

const ANCHOR_LABEL: Record<BrandAnchor, string> = {
  "top-left": "左上", "top-right": "右上", "bottom-left": "左下", "bottom-right": "右下", center: "置中",
};

// Numeric controls for the selected layer or image bookend.
export function VideoEditProperties({
  edit,
  selected,
  onLayerChange,
  onBookendChange,
}: {
  edit: VideoEdit;
  selected: EditSelection;
  onLayerChange: (id: string, patch: Partial<BrandLayer>) => void;
  onBookendChange: (slot: "intro" | "outro", patch: Partial<BookendClip>) => void;
}) {
  if (selected === "intro" || selected === "outro") {
    const clip = edit[selected];
    if (!clip || clip.kind !== "image") return null;
    const { min, max } = EDIT_LIMITS.imageDurationSec;
    return (
      <section className="space-y-2">
        <h3 className="text-[11px] font-bold text-[var(--studio-muted)]">{selected === "intro" ? "開頭" : "結尾"}屬性</h3>
        <Slider label="秒數" value={clip.durationSec} min={min} max={max} step={0.5} suffix=" 秒" onChange={(v) => onBookendChange(selected, { durationSec: v })} />
      </section>
    );
  }
  const layer = edit.layers.find((item) => item.id === selected);
  if (!layer) return null;
  const L = EDIT_LIMITS;
  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-bold text-[var(--studio-muted)]">圖層屬性</h3>
      <div className="grid grid-cols-5 gap-1">
        {BRAND_ANCHORS.map((anchor) => (
          <button
            key={anchor}
            type="button"
            onClick={() => onLayerChange(layer.id, { anchor })}
            className={`min-h-8 rounded-md text-[11px] font-semibold ${layer.anchor === anchor ? "bg-[var(--studio-teal)] text-white" : "bg-[var(--studio-fill)]"}`}
          >
            {ANCHOR_LABEL[anchor]}
          </button>
        ))}
      </div>
      <Slider label="邊距" value={layer.marginPct} min={L.marginPct.min} max={L.marginPct.max} step={0.5} suffix="%" onChange={(v) => onLayerChange(layer.id, { marginPct: v })} />
      <Slider label="寬度" value={layer.widthPct} min={L.widthPct.min} max={L.widthPct.max} step={1} suffix="%" onChange={(v) => onLayerChange(layer.id, { widthPct: v })} />
      <Slider label="透明度" value={Math.round(layer.opacity * 100)} min={0} max={100} step={5} suffix="%" onChange={(v) => onLayerChange(layer.id, { opacity: v / 100 })} />
    </section>
  );
}

function Slider({
  label, value, min, max, step, suffix, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number; suffix: string; onChange: (value: number) => void;
}) {
  return (
    <label className="block text-xs">
      <span className="flex justify-between">
        <span className="font-semibold">{label}</span>
        <span className="tabular-nums text-[var(--studio-muted)]">{value}{suffix}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-1 w-full accent-[var(--studio-teal)]" />
    </label>
  );
}
```

- [ ] **Step 7: `video-edit-export.tsx`**

```tsx
"use client";

import { Spinner } from "@/presentation/components/spinner";
import { StudioButton } from "@/presentation/studio/studio-button";
import { useFileDownload } from "@/presentation/components/app/projects/new/use-file-download";
import { isReelCurrent } from "@/service/reel/fingerprint";
import { hasEdit, isFinalBusy, isFinalCurrent } from "@/service/video-edit/edit-state";
import type { PublicVideo } from "@/presentation/serialize";
import type { VideoEdit } from "@/model/video-edit";

function baseName(project: PublicVideo) {
  const raw = project.phaseA?.localizedTitle || project.phaseA?.englishTitle || "video";
  return raw.replace(/[\\/:*?"<>|]+/g, " ").trim() || "video";
}

// Export / download state for the branded file, with the plain reel as fallback.
export function VideoEditExport({
  project,
  edit,
  saving,
  pending,
  onExport,
}: {
  project: PublicVideo;
  edit: VideoEdit;
  saving: boolean;
  pending: boolean;
  onExport: () => void;
}) {
  const { saving: downloading, error, download } = useFileDownload();
  const reelReady = isReelCurrent(project);
  const withEdit = { ...project, edit };
  const current = isFinalCurrent(withEdit);
  const busy = isFinalBusy(project.finalStatus) || pending;
  const failed = project.finalStatus === "failed" && !busy;
  const stale = Boolean(project.finalUrl) && !current;
  const edited = hasEdit(edit);

  return (
    <section className="space-y-2 border-t border-[var(--studio-line)] pt-4">
      {edited ? (
        <StudioButton className="w-full" disabled={!reelReady || busy || saving || current} onClick={onExport}>
          {busy ? <Spinner className="h-4 w-4" /> : null}
          {busy ? "匯出中…" : current ? "已是最新版本" : failed ? "重新匯出" : "匯出影片"}
        </StudioButton>
      ) : null}
      {!reelReady ? <p className="text-[11px] text-[var(--studio-muted)]">成片合成中，完成後再匯出。</p> : null}
      {failed && project.finalError ? <p role="alert" className="text-[11px] text-[#e11d48]">{project.finalError}</p> : null}
      {edited && project.finalUrl ? (
        <StudioButton variant="ghost" className="w-full" disabled={downloading} onClick={() => void download(project.finalUrl!, `${baseName(project)}.mp4`)}>
          {downloading ? <Spinner className="h-4 w-4" /> : null}
          {stale ? "下載（舊版）" : "下載影片"}
        </StudioButton>
      ) : null}
      {stale && !busy ? <p className="text-[11px] text-[var(--studio-muted)]">圖層改過了，重新匯出才會套用。</p> : null}
      {project.reelUrl && reelReady ? (
        <button type="button" disabled={downloading} onClick={() => void download(project.reelUrl!, `${baseName(project)}-原片.mp4`)} className="text-[11px] font-semibold text-[var(--studio-muted)] underline-offset-2 hover:underline">
          下載不含圖層的原片
        </button>
      ) : null}
      {error ? <p role="alert" className="text-[11px] text-[#e11d48]">{error}</p> : null}
    </section>
  );
}
```

- [ ] **Step 8: 驗證**

Run: `npx tsc --noEmit && npm run lint`
Expected: 無錯誤。

- [ ] **Step 9: Commit**

```bash
git add src/presentation/components/app/projects/new/brand-upload-button.tsx src/presentation/components/app/projects/new/template-name-dialog.tsx src/presentation/components/app/projects/new/video-edit-templates.tsx src/presentation/components/app/projects/new/video-edit-layers.tsx src/presentation/components/app/projects/new/video-edit-properties.tsx src/presentation/components/app/projects/new/video-edit-export.tsx src/presentation/components/app/projects/new/use-file-download.ts
git commit -m "feat(video-edit): layers, templates, properties, and export panels"
```

---

### Task 11: `VideoEditDesk` 接上 Video 分頁

**Files:**
- Create: `src/presentation/components/app/projects/new/video-edit-desk.tsx`
- Modify: `src/presentation/components/app/projects/new/new-project-form.tsx`（reel desk 分支）
- Delete: `src/presentation/components/app/projects/new/reel-export.tsx`、`src/presentation/components/app/projects/new/reel-player.tsx`

**Interfaces:**
- Consumes: Task 8 actions、Task 9 `VideoEditPreview`、Task 10 全部面板、`StudioFrame`（Task 1）、`isReelBusy`/`isReelCurrent`（既有）。
- Produces:

```ts
export function VideoEditDesk(props: {
  project: PublicVideo;
  pending: string;           // "reel" while composeReel is sending
  error: string;
  onComposeReel: () => void;
  onProjectChange: (project: PublicVideo) => void;
}): React.ReactElement;
```

- [ ] **Step 1: `video-edit-desk.tsx`**

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StudioFrame } from "@/presentation/studio/studio-frame";
import { VideoEditExport } from "@/presentation/components/app/projects/new/video-edit-export";
import { VideoEditLayers } from "@/presentation/components/app/projects/new/video-edit-layers";
import { VideoEditPreview, type EditSelection } from "@/presentation/components/app/projects/new/video-edit-preview";
import { VideoEditProperties } from "@/presentation/components/app/projects/new/video-edit-properties";
import { VideoEditTemplates } from "@/presentation/components/app/projects/new/video-edit-templates";
import {
  applyTemplateAction,
  deleteTemplateAction,
  exportFinalVideoAction,
  listTemplatesAction,
  overwriteTemplateAction,
  renameTemplateAction,
  saveTemplateAction,
  updateVideoEditAction,
} from "@/presentation/actions/video-edit";
import { isReelBusy, isReelCurrent } from "@/service/reel/fingerprint";
import { EDIT_LIMITS, emptyEdit, type BookendClip, type BrandLayer, type VideoEdit } from "@/model/video-edit";
import type { PublicTemplate, PublicVideo } from "@/presentation/serialize";

const SAVE_DELAY_MS = 600;

// Video tab: local edit state is the source of truth; it autosaves to the
// video after a short pause and flushes before template or export actions.
export function VideoEditDesk({
  project,
  pending,
  error,
  onComposeReel,
  onProjectChange,
}: {
  project: PublicVideo;
  pending: string;
  error: string;
  onComposeReel: () => void;
  onProjectChange: (project: PublicVideo) => void;
}) {
  const [edit, setEdit] = useState<VideoEdit>(() => project.edit ?? emptyEdit());
  const [selected, setSelected] = useState<EditSelection>("");
  const [templates, setTemplates] = useState<PublicTemplate[]>([]);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const timer = useRef<number | null>(null);
  const dirty = useRef(false);
  const latest = useRef(edit);
  latest.current = edit;

  // Same auto-compose rule the old reel inspector used.
  const reelCurrent = isReelCurrent(project);
  const reelBusy = isReelBusy(project.reelStatus) || pending === "reel";
  const reelFailed = project.reelStatus === "failed" && !reelCurrent;
  useEffect(() => {
    if (reelCurrent || reelBusy || reelFailed) return;
    onComposeReel();
  }, [reelCurrent, reelBusy, reelFailed, onComposeReel]);

  useEffect(() => {
    void listTemplatesAction().then((result) => {
      if (result.ok) setTemplates(result.templates);
    });
  }, []);

  const save = useCallback(async () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    if (!dirty.current) return true;
    dirty.current = false;
    setSaving(true);
    const result = await updateVideoEditAction(project.id, latest.current);
    setSaving(false);
    if (!result.ok) {
      setMessage(result.error);
      return false;
    }
    onProjectChange(result.project);
    return true;
  }, [project.id, onProjectChange]);

  function change(next: (current: VideoEdit) => VideoEdit) {
    setEdit((current) => next(current));
    dirty.current = true;
    setMessage("");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void save(), SAVE_DELAY_MS);
  }

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  function patchLayer(id: string, patch: Partial<BrandLayer>) {
    change((current) => ({ ...current, layers: current.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
  }

  function addLayer(url: string) {
    const layer: BrandLayer = { id: crypto.randomUUID(), kind: "image", assetUrl: url, anchor: "top-right", marginPct: 4, widthPct: 18, opacity: 1 };
    change((current) => ({ ...current, layers: [...current.layers, layer] }));
    setSelected(layer.id);
  }

  function moveLayer(id: string, delta: -1 | 1) {
    change((current) => {
      const layers = [...current.layers];
      const from = layers.findIndex((l) => l.id === id);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= layers.length) return current;
      [layers[from], layers[to]] = [layers[to], layers[from]];
      return { ...current, layers };
    });
  }

  function setBookend(slot: "intro" | "outro", asset: { url: string; kind: "image" | "video" }) {
    const clip: BookendClip = { kind: asset.kind, assetUrl: asset.url, durationSec: EDIT_LIMITS.imageDurationSec.default };
    change((current) => ({ ...current, [slot]: clip }));
    setSelected(slot);
  }

  function removeBookend(slot: "intro" | "outro") {
    change((current) => {
      const next = { ...current };
      delete next[slot];
      return next;
    });
    if (selected === slot) setSelected("");
  }

  // Template and export actions run after the pending autosave lands.
  async function run<T>(work: () => Promise<T>) {
    setBusy(true);
    const saved = await save();
    const result = saved ? await work() : undefined;
    setBusy(false);
    return result;
  }

  async function applyTemplate(templateId: string) {
    const result = await run(() => applyTemplateAction(project.id, templateId));
    if (!result) return;
    if (!result.ok) return setMessage(result.error);
    setEdit(result.project.edit ?? emptyEdit());
    setSelected("");
    onProjectChange(result.project);
  }

  async function saveNew(name: string) {
    const result = await run(() => saveTemplateAction(project.id, name));
    if (!result) return "儲存失敗，請再試一次";
    if (!result.ok) return result.error;
    setTemplates((list) => [result.template, ...list]);
    onProjectChange(result.project);
    return "";
  }

  async function overwrite(templateId: string) {
    const result = await run(() => overwriteTemplateAction(project.id, templateId));
    if (!result) return;
    if (!result.ok) return setMessage(result.error);
    setTemplates((list) => list.map((t) => (t.id === templateId ? result.template : t)));
  }

  async function rename(templateId: string, name: string) {
    const result = await renameTemplateAction(templateId, name);
    if (!result.ok) return result.error;
    setTemplates((list) => list.map((t) => (t.id === templateId ? result.template : t)));
    return "";
  }

  async function remove(templateId: string) {
    const result = await deleteTemplateAction(templateId);
    if (!result.ok) return setMessage(result.error);
    setTemplates((list) => list.filter((t) => t.id !== templateId));
  }

  async function exportVideo() {
    const result = await run(() => exportFinalVideoAction(project.id));
    if (!result) return;
    if (!result.ok) return setMessage(result.error);
    onProjectChange(result.project);
  }

  const shownError = message || error || (reelFailed ? project.reelError || "成片合成失敗" : "");

  return (
    <StudioFrame
      preview={
        <VideoEditPreview
          reelUrl={reelCurrent ? project.reelUrl : undefined}
          aspectRatio={project.aspectRatio}
          edit={edit}
          selected={selected}
          onSelect={setSelected}
          onLayerChange={patchLayer}
        />
      }
      inspector={
        <div className="flex flex-col gap-5 p-4">
          <header>
            <p className="text-sm font-semibold">Video</p>
            <p className="mt-1 text-xs text-[var(--studio-muted)]">
              {saving ? "儲存中…" : "加 logo、開頭與結尾，存成樣板下次一鍵套用。"}
            </p>
          </header>
          <VideoEditTemplates
            templates={templates}
            edit={edit}
            editTemplateId={project.editTemplateId}
            busy={busy}
            onApply={(id) => void applyTemplate(id)}
            onSaveNew={saveNew}
            onOverwrite={(id) => void overwrite(id)}
            onRename={rename}
            onDelete={(id) => void remove(id)}
          />
          <VideoEditLayers
            edit={edit}
            selected={selected}
            busy={busy}
            onSelect={setSelected}
            onAddLayer={addLayer}
            onRemoveLayer={(id) => {
              change((current) => ({ ...current, layers: current.layers.filter((l) => l.id !== id) }));
              if (selected === id) setSelected("");
            }}
            onMoveLayer={moveLayer}
            onSetBookend={setBookend}
            onRemoveBookend={removeBookend}
            onError={setMessage}
          />
          <VideoEditProperties
            edit={edit}
            selected={selected}
            onLayerChange={patchLayer}
            onBookendChange={(slot, patch) =>
              change((current) => (current[slot] ? { ...current, [slot]: { ...current[slot]!, ...patch } } : current))
            }
          />
          <VideoEditExport project={project} edit={edit} saving={saving || busy} pending={busy} onExport={() => void exportVideo()} />
          {reelFailed ? (
            <button type="button" onClick={onComposeReel} className="self-start text-xs font-semibold text-[var(--studio-teal)]">重新合成成片</button>
          ) : null}
          {shownError ? <p role="alert" className="text-xs font-medium text-[#e11d48]">{shownError}</p> : null}
        </div>
      }
    />
  );
}
```

- [ ] **Step 2: 接到 `new-project-form.tsx`**

reel desk 分支（Task 1 改成 `StudioFrame` 的那段）換成：

```tsx
          ) : reelDesk && project ? (
            <VideoEditDesk
              key={project.id}
              project={project}
              pending={pending}
              error={error}
              onComposeReel={onComposeReel}
              onProjectChange={setProject}
            />
```

import 換成 `import { VideoEditDesk } from "@/presentation/components/app/projects/new/video-edit-desk";`，移除 `ReelExport` 與 Task 1 加的 `StudioFrame` import（若檔案其他地方沒用到）。

- [ ] **Step 3: 清掉不再使用的 `ReelExport`**

Run: `rg "ReelExport|reel-export|ReelPlayer|reel-player" src`
Expected: 只剩這兩個檔案彼此引用 → 刪除 `reel-export.tsx` 與 `reel-player.tsx`。

- [ ] **Step 4: 全部驗證**

Run: `npx tsc --noEmit && npm run lint && npx tsx --test src/service/video-edit/*.test.ts src/service/reel/*.test.ts src/service/video/storage.test.ts`
Expected: 無錯誤、全部 PASS。

- [ ] **Step 5: 瀏覽器端到端**

用 `npm run dev -- --port 3000`，開一支 `ready` 的影片並切到 Video 分頁，依序確認：
1. 分頁標籤是「Video」，底部沒有 filmstrip；成片未就緒時自動開始合成。
2. 「＋ 圖片／Logo」上傳 PNG → 右上出現圖層；拖到左下放開後吸附左下；拉右下角把手變寬；左欄滑桿數值同步。
3. 上傳圖片當開頭 → 點「開頭」卡片會切換預覽；秒數滑桿可調。
4. 重新整理頁面，圖層仍在（autosave）。
5. 「儲存為新樣板」→ 輸入名稱 → 下拉清單出現；再改一個圖層 → 出現「更新樣板〈名稱〉」→ 確認覆寫。
6. 打開另一支 ready 影片 → 套用該樣板 → 圖層位置依比例正確。
7. 「匯出影片」→ 顯示匯出中 → 完成後「下載影片」可下載，播放時 logo 位置與預覽一致、開頭在前。
8. 再改圖層 → 下載按鈕變「下載（舊版）」並提示重新匯出。

- [ ] **Step 6: Commit**

```bash
git add -A src/presentation/components/app/projects/new
git commit -m "feat(video-edit): Video tab editor with templates and branded export"
```

---

## Self-Review

- **Spec 覆蓋：** 分頁改名與隱藏 filmstrip → Task 1；資料模型與 `final*` 欄位 → Task 2；比例無關定位 → Task 3；指紋、髒檢查、上傳限制、名稱規則、素材網址限制 → Task 4；overlay＋bookend＋淡化＋串接 → Task 5–6；樣板 CRUD 與覆寫不回頭改影片 → Task 7；autosave、上傳、匯出、背景工作、輪詢、`bodySizeLimit` → Task 8；預覽拖曳、開頭結尾卡 → Task 9；左欄面板、下載舊版提示、原片下載 → Task 10；接線與端到端 → Task 11。錯誤處理（素材失敗、格式、名稱重複、他人資源）分布在 Task 4、7、8。
- **Placeholder：** 無 TBD；每個程式步驟都附完整程式碼。
- **型別一致：** `EditSelection`、`LayerPlacement`、`FinalSegmentInput`、`PublicTemplate`、`isFinalBusy`、`hashText` 在定義與使用處名稱一致；`finalFingerprint` 在 Task 4 定義、Task 8 使用。
