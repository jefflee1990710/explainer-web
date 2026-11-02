# Life Quick Generate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Quick Generate (default) and Advanced settings outer tabs under LOOK on `/app/life`, with fixed OOTD Generate and Random post-type Generate.

**Architecture:** Keep LOOK and Advanced three-mode forms intact. Introduce an outer `studioMode` (`quick` | `advanced`) on `LifeDesk`. Quick uses a thin panel that calls a dedicated `onQuickGenerate(templateId)` path with only character + look + `createMode: "post-template"`. Helpers for the fixed template id and random pick live next to the Life post-template model so they stay client-safe and unit-testable.

**Tech Stack:** React client components, existing `generateLifeShotAction`, `LIFE_POST_TEMPLATES`, Tailwind studio tokens, Node test runner (`npx tsx --test`).

**Spec:** `docs/superpowers/specs/2026-11-02-life-quick-generate-design.md`

## Global Constraints

- No backend / `generateLifeShotAction` API signature changes.
- No LOOK / `LifePresetTree` behavior changes.
- Credit cost stays `FRAME_COST` for Generate and Random.
- Quick Generate does not include post-type picker, pose, scene, wardrobe, composition ref, remarks, or custom instruction UI.
- Quick API calls omit scene, composition ref, custom instruction, remarks, pose, and wardrobe overrides.
- Fixed Generate template id is exactly `street-ootd-full`.
- Random picks uniformly from `LIFE_POST_TEMPLATES`.
- Outer default tab is Quick Generate.
- Advanced keeps existing three create modes; `LIFE_CREATE_MODES` order is `["post-template", "replace-person", "scene-place"]` and Advanced default `createMode` is `"post-template"` (already partially applied in the working tree — include in the desk wiring commit if still uncommitted).
- Copy: Traditional Chinese primary labels + short English badges, matching Life tabs.
- Tests must not call live image generation or Higgsfield.
- New page-only UI components go in `src/presentation/components/app/life/` as separate files.
- Reply / UI copy language for the product remains Traditional Chinese.

## File map

| File | Responsibility |
| --- | --- |
| `src/model/life-post-template.ts` | Export `QUICK_LIFE_TEMPLATE_ID` and `pickRandomLifePostTemplateId()` |
| `src/model/life-post-template.test.ts` | Unit tests for the quick helpers (extend existing file) |
| `src/presentation/components/app/life/life-studio-mode-tabs.tsx` | Outer Quick / Advanced tablist |
| `src/presentation/components/app/life/life-quick-generate.tsx` | Quick copy + Generate + Random buttons |
| `src/presentation/components/app/life/life-desk.tsx` | Wire `studioMode`, Quick handler, conditional Advanced body |
| `src/model/life-shot-kind.ts` | Confirm create-mode order (prerequisite) |
| `src/presentation/components/app/life/life-create-tabs.tsx` | Confirm meta order matches modes (prerequisite) |

---

### Task 1: Quick template helpers

**Files:**
- Modify: `src/model/life-post-template.ts`
- Modify: `src/model/life-post-template.test.ts`
- Test: `src/model/life-post-template.test.ts`

**Interfaces:**
- Consumes: `LIFE_POST_TEMPLATES`, `lifePostTemplateById`
- Produces:
  - `export const QUICK_LIFE_TEMPLATE_ID = "street-ootd-full" as const`
  - `export function pickRandomLifePostTemplateId(random?: () => number): string`
    - `random` defaults to `Math.random`
    - returns `LIFE_POST_TEMPLATES[Math.floor(random() * LIFE_POST_TEMPLATES.length)].id`
    - if catalog empty (should not happen), throw

- [ ] **Step 1: Write the failing tests**

Append to `src/model/life-post-template.test.ts`:

```ts
import {
  LIFE_POST_TEMPLATES,
  QUICK_LIFE_TEMPLATE_ID,
  lifePostTemplateById,
  pickRandomLifePostTemplateId,
} from "@/model/life-post-template";

test("QUICK_LIFE_TEMPLATE_ID is street-ootd-full and exists in the catalog", () => {
  assert.equal(QUICK_LIFE_TEMPLATE_ID, "street-ootd-full");
  assert.ok(lifePostTemplateById(QUICK_LIFE_TEMPLATE_ID));
});

test("pickRandomLifePostTemplateId returns a catalog id using the provided RNG", () => {
  const id = pickRandomLifePostTemplateId(() => 0);
  assert.equal(id, LIFE_POST_TEMPLATES[0].id);
  const last = pickRandomLifePostTemplateId(() => 0.999999);
  assert.equal(last, LIFE_POST_TEMPLATES[LIFE_POST_TEMPLATES.length - 1].id);
});

test("pickRandomLifePostTemplateId only returns known template ids", () => {
  for (let i = 0; i < 40; i++) {
    const id = pickRandomLifePostTemplateId();
    assert.ok(lifePostTemplateById(id), `unknown id: ${id}`);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/model/life-post-template.test.ts`

Expected: FAIL — `QUICK_LIFE_TEMPLATE_ID` / `pickRandomLifePostTemplateId` not exported.

- [ ] **Step 3: Implement helpers**

At the bottom of `src/model/life-post-template.ts` (after `lifePostTemplatePreviewSrc`):

```ts
/** Fixed post template used by Life Quick Generate. */
export const QUICK_LIFE_TEMPLATE_ID = "street-ootd-full" as const;

/** Uniform random catalog id. Pass `random` in tests to make the pick deterministic. */
export function pickRandomLifePostTemplateId(random: () => number = Math.random): string {
  if (LIFE_POST_TEMPLATES.length === 0) {
    throw new Error("LIFE_POST_TEMPLATES is empty");
  }
  const index = Math.min(
    LIFE_POST_TEMPLATES.length - 1,
    Math.floor(random() * LIFE_POST_TEMPLATES.length),
  );
  return LIFE_POST_TEMPLATES[index].id;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test src/model/life-post-template.test.ts`

Expected: PASS (all tests in the file).

- [ ] **Step 5: Commit**

```bash
git add src/model/life-post-template.ts src/model/life-post-template.test.ts
git commit -m "$(cat <<'EOF'
feat(life): add Quick Generate template helpers

EOF
)"
```

---

### Task 2: Outer studio mode tabs

**Files:**
- Create: `src/presentation/components/app/life/life-studio-mode-tabs.tsx`

**Interfaces:**
- Consumes: none from Task 1
- Produces:
  - `export type LifeStudioMode = "quick" | "advanced"`
  - `export function LifeStudioModeTabs(props: { value: LifeStudioMode; disabled?: boolean; onChange: (mode: LifeStudioMode) => void }): JSX.Element`

- [ ] **Step 1: Create the component**

```tsx
"use client";

export type LifeStudioMode = "quick" | "advanced";

const TABS: { id: LifeStudioMode; title: string; badge: string }[] = [
  { id: "quick", title: "快速生成", badge: "Quick Generate" },
  { id: "advanced", title: "進階設定", badge: "Advanced settings" },
];

// Outer Quick / Advanced switcher under LOOK on /app/life.
export function LifeStudioModeTabs({
  value,
  disabled,
  onChange,
}: {
  value: LifeStudioMode;
  disabled?: boolean;
  onChange: (mode: LifeStudioMode) => void;
}) {
  return (
    <div className="shrink-0 border-b border-accent-ink/12 bg-paper/95 px-4 py-3">
      <div
        role="tablist"
        aria-label="Life 工作室模式"
        className="grid grid-cols-2 gap-1.5 rounded-xl bg-accent-ink/6 p-1"
      >
        {TABS.map((tab) => {
          const active = value === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={disabled}
              onClick={() => onChange(tab.id)}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg px-2 py-1.5 text-center transition disabled:cursor-not-allowed disabled:opacity-60 ${
                active
                  ? "bg-accent-ink text-lime shadow-xs"
                  : "text-foreground/75 hover:bg-paper/70 hover:text-foreground"
              }`}
            >
              <span className="text-xs font-bold leading-tight">{tab.title}</span>
              <span
                className={`text-[10px] font-medium leading-tight ${
                  active ? "text-paper/80" : "text-muted"
                }`}
              >
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck the new file**

Run: `npx tsc --noEmit --pretty false 2>&1 | rg "life-studio-mode-tabs|error TS" | head -40`

Expected: no errors mentioning `life-studio-mode-tabs`.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/components/app/life/life-studio-mode-tabs.tsx
git commit -m "$(cat <<'EOF'
feat(life): add Quick / Advanced studio mode tabs

EOF
)"
```

---

### Task 3: Quick Generate panel

**Files:**
- Create: `src/presentation/components/app/life/life-quick-generate.tsx`

**Interfaces:**
- Consumes: `FRAME_COST` from `@/service/credit-costs`; `Spinner` (same import path `life-desk.tsx` uses)
- Produces:
  - `export function LifeQuickGenerate(props: {
      disabled: boolean;
      pending: boolean;
      error: string;
      onGenerate: () => void;
      onRandom: () => void;
    }): JSX.Element`

- [ ] **Step 1: Create the component**

Match desk button styling (accent primary, secondary outline). Show error inline above the buttons when `error` is non-empty.

```tsx
"use client";

import { Spinner } from "@/presentation/components/ui/spinner";
import { FRAME_COST } from "@/service/credit-costs";
import { useI18n } from "@/util/i18n/provider";

// One-click Life generate: fixed street OOTD or random post template.
export function LifeQuickGenerate({
  disabled,
  pending,
  error,
  onGenerate,
  onRandom,
}: {
  disabled: boolean;
  pending: boolean;
  error: string;
  onGenerate: () => void;
  onRandom: () => void;
}) {
  const { t } = useI18n();
  const busy = pending || disabled;

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-between gap-4 p-4">
      <div className="space-y-2 rounded-xl border border-accent-ink/10 bg-accent-ink/3 px-3 py-3">
        <p className="text-xs font-bold text-foreground">用目前造型快速出圖</p>
        <p className="text-[11px] leading-relaxed text-muted">
          「生成」固定用街頭全身 OOTD；「隨機」從全部貼文類型抽一個立刻出圖。姿勢、場景與其他選項請切到進階設定。
        </p>
      </div>

      <div className="mt-auto space-y-2">
        {error ? (
          <p className="text-[11px] font-semibold text-red-600">{error}</p>
        ) : (
          <p className="text-[11px] text-muted">{t("life.uploadHint")}</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onGenerate}
            className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center rounded-full bg-accent px-5 text-xs font-bold text-white shadow-[2px_2px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
          >
            {pending ? <Spinner className="mr-2 h-3.5 w-3.5" /> : null}
            {pending ? "排入背景佇列中..." : t("life.generate")}
            <span className="ml-2 font-medium opacity-85">
              · {t("life.cost", { cost: FRAME_COST })}
            </span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onRandom}
            className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center rounded-full border border-accent-ink/20 bg-paper px-5 text-xs font-bold text-foreground transition hover:border-accent-ink disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
          >
            隨機 · Random
            <span className="ml-2 font-medium text-muted">
              · {t("life.cost", { cost: FRAME_COST })}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
```

If `Spinner` import path in `life-desk.tsx` differs, copy that exact import — do not invent a new path.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit --pretty false 2>&1 | rg "life-quick-generate|error TS" | head -40`

Expected: no errors mentioning `life-quick-generate`.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/components/app/life/life-quick-generate.tsx
git commit -m "$(cat <<'EOF'
feat(life): add Quick Generate panel UI

EOF
)"
```

---

### Task 4: Wire LifeDesk Quick / Advanced

**Files:**
- Modify: `src/presentation/components/app/life/life-desk.tsx`
- Modify (if still uncommitted): `src/model/life-shot-kind.ts`, `src/presentation/components/app/life/life-create-tabs.tsx`

**Interfaces:**
- Consumes:
  - `QUICK_LIFE_TEMPLATE_ID`, `pickRandomLifePostTemplateId`, `lifePostTemplateById` from `@/model/life-post-template`
  - `LifeStudioMode`, `LifeStudioModeTabs` from `./life-studio-mode-tabs`
  - `LifeQuickGenerate` from `./life-quick-generate`
- Produces: desk behavior per spec (no new exports required)

- [ ] **Step 1: Confirm prerequisite create-mode order**

Ensure these are true in the working tree (apply if missing):

`src/model/life-shot-kind.ts`:

```ts
export const LIFE_CREATE_MODES = ["post-template", "replace-person", "scene-place"] as const;
```

`life-desk.tsx` Advanced default:

```ts
const [createMode, setCreateMode] = useState<LifeCreateMode>("post-template");
```

`life-create-tabs.tsx` `TAB_META` key order should list `post-template` first (display order still comes from `LIFE_CREATE_MODES.map`).

- [ ] **Step 2: Add imports and studio mode state**

Near other life imports in `life-desk.tsx`:

```ts
import {
  lifePostTemplateById,
  pickRandomLifePostTemplateId,
  QUICK_LIFE_TEMPLATE_ID,
} from "@/model/life-post-template";
import { LifeQuickGenerate } from "@/presentation/components/app/life/life-quick-generate";
import {
  LifeStudioModeTabs,
  type LifeStudioMode,
} from "@/presentation/components/app/life/life-studio-mode-tabs";
```

(Remove duplicate `lifePostTemplateById` import if one already exists.)

State next to `createMode`:

```ts
const [studioMode, setStudioMode] = useState<LifeStudioMode>("quick");
```

- [ ] **Step 3: Add `onQuickGenerate`**

Place next to `onGenerate`. Quick path must not send scene / remarks / composition / custom instruction / pose / wardrobe:

```ts
async function onQuickGenerate(templateId: string) {
  if (!character?.ready) {
    setError(t("life.needBlueprint"));
    return;
  }
  const template = lifePostTemplateById(templateId);
  if (!template) {
    setError("找不到貼文類型 (Post Type)");
    return;
  }
  setPending("generate");
  setError("");
  try {
    const result = await generateLifeShotAction({
      characterId: character.id,
      createMode: "post-template",
      place: character.persona?.city || "Scene",
      kind: template.kind,
      source: "upload",
      templateId: template.id,
      versionId: look.versionId || undefined,
    });
    setPending("");
    if (!result.ok) {
      setError(translateAppError(result.error, t));
      if (isCreditGateError(result.error)) setCreditGate(true);
      return;
    }
    setShots((current) => [result.shot, ...current]);
    setRecentOpen(true);
    // Keep LOOK; do not call resetCreateForm() on Quick success.
  } catch {
    setPending("");
    setError(t("errors.lifeGenerateFailed"));
  }
}
```

Keep existing `onGenerate` for Advanced unchanged (still validates template/scene and may call `resetCreateForm()`).

- [ ] **Step 4: Wrap the create section with outer tabs**

Inside the main column, after `LifePresetTree`, replace the bare create `<section>` body so it becomes:

```tsx
<section
  aria-label={t("life.place")}
  className="flex min-h-[22rem] min-w-0 flex-col overflow-hidden rounded-2xl border border-accent-ink/10 bg-paper/90 lg:min-h-0 lg:flex-1"
>
  <LifeStudioModeTabs
    value={studioMode}
    disabled={pending !== ""}
    onChange={(next) => {
      setStudioMode(next);
      setError("");
    }}
  />

  {studioMode === "quick" ? (
    <LifeQuickGenerate
      disabled={!character?.ready}
      pending={pending === "generate"}
      error={error}
      onGenerate={() => void onQuickGenerate(QUICK_LIFE_TEMPLATE_ID)}
      onRandom={() => void onQuickGenerate(pickRandomLifePostTemplateId())}
    />
  ) : (
    <>
      <LifeCreateTabs
        value={createMode}
        disabled={pending !== ""}
        onChange={(nextMode) => {
          setCreateMode(nextMode);
          setError("");
        }}
      />
      {/* existing scrollable form body + bottom action dock stay here unchanged */}
    </>
  )}
</section>
```

Do not duplicate the Advanced form — move the existing `LifeCreateTabs` + form body + bottom dock into the `studioMode === "advanced"` branch only.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit --pretty false 2>&1 | head -60`

Expected: exit 0 (or no new errors in the files touched by this plan).

- [ ] **Step 6: Re-run helper tests**

Run: `npx tsx --test src/model/life-post-template.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add \
  src/presentation/components/app/life/life-desk.tsx \
  src/model/life-shot-kind.ts \
  src/presentation/components/app/life/life-create-tabs.tsx \
  src/service/mcp/life-tools.ts
git commit -m "$(cat <<'EOF'
feat(life): default Quick Generate with random post type

EOF
)"
```

Only stage `life-tools.ts` if its describe-string reorder is part of this work; do not stage unrelated jutsu / director dirty files.

---

### Task 5: Manual verification checklist

**Files:** none (manual)

- [ ] **Step 1: Run the app and open `/app/life`**

Expected:
1. LOOK strip still above the create card.
2. Outer tabs default to **快速生成 / Quick Generate**.
3. Quick shows Generate + Random with cost.
4. Generate queues a shot with street OOTD (no template dialog).
5. Random queues a shot without opening Advanced.
6. Advanced shows 1. 貼文類型與姿勢, 2. 人物替換, 3. 放入場景.
7. Switching tabs preserves LOOK / character.
8. Insufficient credits still opens the existing credit dialog.

- [ ] **Step 2: No commit required unless fixes were needed**

If a bug is found, fix in a focused follow-up commit, then re-check the failing item.

---

## Spec coverage self-check

| Spec requirement | Task |
| --- | --- |
| Outer Quick / Advanced tabs under LOOK | Task 2, 4 |
| Default Quick Generate | Task 4 (`useState("quick")`) |
| Generate → `street-ootd-full` | Task 1 + 4 |
| Random → uniform catalog pick | Task 1 + 4 |
| Advanced keeps three modes + forms | Task 4 |
| Quick omits scene/pose/wardrobe/etc. | Task 4 `onQuickGenerate` |
| Keep LOOK on Quick success | Task 4 |
| Preserve state across mode switch | Task 4 (no reset on tab change) |
| `FRAME_COST` on both buttons | Task 3 |
| No API changes / no live gen tests | Global + Task 1 |
| Post-template first in Advanced | Task 4 Step 1 |

## Placeholder / consistency self-check

- No TBD / TODO left in tasks.
- `LifeStudioMode` / `QUICK_LIFE_TEMPLATE_ID` / `pickRandomLifePostTemplateId` / `onQuickGenerate` names are consistent across tasks.
- Spinner import must match existing desk import path at implementation time.
