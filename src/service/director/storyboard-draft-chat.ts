import { generateText, Output } from "ai";
import { z } from "zod";
import {
  STORYBOARD_CHARACTER_POSITIONS,
  STORYBOARD_DIAGRAM_LAYOUTS,
  type StoryboardCharacterPosition,
  type StoryboardClipDraft,
  type StoryboardDiagramLayout,
  type StoryboardSketchElement,
  type VoLanguage,
} from "@/model/project";
import { storyboardModel, storyboardProviderOptions } from "@/service/director/model";
import { persistBuffer } from "@/service/higgsfield/persist";

export const MAX_CLIP_DRAFTS = 12;
export const MAX_DRAFT_EXPLANATION_LENGTH = 800;
export const MAX_DRAFT_VO_LENGTH = 400;
export const MAX_CHARACTER_ACTION_LENGTH = 160;
export const MAX_VISUAL_NODES = 8;
export const MAX_VISUAL_NODE_LENGTH = 120;

export type StoryboardDraftChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const DIAGRAM_LAYOUT_LABELS: Record<StoryboardDiagramLayout, string> = {
  auto: "Auto director choice",
  "split-compare": "Split Comparison (Before vs. After / Old vs. New)",
  "process-flow": "Step-by-Step Process Flow (1 → 2 → 3)",
  funnel: "Funnel / Filter Breakdown",
  "balance-scale": "Balance Scale / Trade-off Seesaw",
  iceberg: "Iceberg / Surface vs. Root Cause Stack",
  timeline: "Milestone Roadmap Timeline",
  "character-scene": "Character-Focused Story Scene",
};

const CHARACTER_POSITION_LABELS: Record<StoryboardCharacterPosition, string> = {
  auto: "Auto placement",
  left: "Lower-left presenter zone (20–30% width, facing right toward the diagram)",
  right: "Lower-right presenter zone (20–30% width, facing left toward the diagram)",
  center: "Center hero position on canvas",
  none: "No character on screen (100% diagram / visual elements only)",
};

function isDiagramLayout(value: unknown): value is StoryboardDiagramLayout {
  return (
    typeof value === "string" &&
    (STORYBOARD_DIAGRAM_LAYOUTS as readonly string[]).includes(value)
  );
}

function isCharacterPosition(value: unknown): value is StoryboardCharacterPosition {
  return (
    typeof value === "string" &&
    (STORYBOARD_CHARACTER_POSITIONS as readonly string[]).includes(value)
  );
}

function sanitizeVisualNodes(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const cleaned = raw
    .map((item) => String(item ?? "").trim().slice(0, MAX_VISUAL_NODE_LENGTH))
    .filter(Boolean)
    .slice(0, MAX_VISUAL_NODES);
  return cleaned.length > 0 ? cleaned : undefined;
}

function sanitizeSketchElements(raw: unknown): StoryboardSketchElement[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const validTypes = new Set(["person", "rect", "circle", "arrow", "line", "text"]);
  const out: StoryboardSketchElement[] = [];
  for (const item of raw.slice(0, 24)) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const type = String(rec.type ?? "");
    if (!validTypes.has(type)) continue;
    const x = Number(rec.x);
    const y = Number(rec.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const el: StoryboardSketchElement = {
      type: type as StoryboardSketchElement["type"],
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    };
    if (Number.isFinite(Number(rec.width))) el.width = Math.max(4, Math.min(100, Number(rec.width)));
    if (Number.isFinite(Number(rec.height))) el.height = Math.max(4, Math.min(100, Number(rec.height)));
    if (Number.isFinite(Number(rec.x2))) el.x2 = Math.max(0, Math.min(100, Number(rec.x2)));
    if (Number.isFinite(Number(rec.y2))) el.y2 = Math.max(0, Math.min(100, Number(rec.y2)));
    if (typeof rec.label === "string" && rec.label.trim()) {
      el.label = rec.label.trim().slice(0, 60);
    }
    if (typeof rec.color === "string" && rec.color.trim()) {
      el.color = rec.color.trim().slice(0, 24);
    }
    out.push(el);
  }
  return out.length > 0 ? out : undefined;
}

// Generate normalized (0..100) wireframe sketch elements for a chosen diagram layout, character position, and visual node labels.
export function buildPresetSketchElements(input: {
  diagramLayout?: StoryboardDiagramLayout;
  characterPosition?: StoryboardCharacterPosition;
  visualNodes?: string[];
  characterAction?: string;
}): StoryboardSketchElement[] {
  const layout = input.diagramLayout && input.diagramLayout !== "auto"
    ? input.diagramLayout
    : "process-flow";
  const pos = input.characterPosition ?? "left";
  const nodes = (input.visualNodes ?? []).filter(Boolean);
  const elements: StoryboardSketchElement[] = [];

  // Diagram region shifts slightly to make room for a left or right cartoon presenter.
  const diagramLeft = pos === "left" ? 30 : 8;
  const diagramRight = pos === "right" ? 70 : 92;
  const diagramWidth = diagramRight - diagramLeft;

  if (layout === "split-compare") {
    const halfW = Math.floor((diagramWidth - 6) / 2);
    const midX = diagramLeft + halfW + 3;
    elements.push(
      {
        type: "rect",
        x: diagramLeft,
        y: 18,
        width: halfW,
        height: 54,
        label: nodes[0] || "Before / Old",
        color: "#e11d48",
      },
      {
        type: "line",
        x: midX,
        y: 14,
        x2: midX,
        y2: 76,
        color: "#12141c",
      },
      {
        type: "rect",
        x: midX + 3,
        y: 18,
        width: halfW,
        height: 54,
        label: nodes[1] || "After / New",
        color: "#059669",
      },
    );
    if (nodes[2]) {
      elements.push({
        type: "text",
        x: diagramLeft + Math.floor(diagramWidth * 0.25),
        y: 78,
        label: nodes[2],
        color: "#12141c",
      });
    }
  } else if (layout === "process-flow") {
    const count = Math.min(4, Math.max(3, nodes.length || 3));
    const stepW = Math.floor((diagramWidth - (count - 1) * 6) / count);
    for (let i = 0; i < count; i++) {
      const boxX = diagramLeft + i * (stepW + 6);
      elements.push({
        type: "rect",
        x: boxX,
        y: 28,
        width: stepW,
        height: 32,
        label: nodes[i] || `Step ${i + 1}`,
        color: i === count - 1 ? "#059669" : "#2563eb",
      });
      if (i < count - 1) {
        elements.push({
          type: "arrow",
          x: boxX + stepW + 1,
          y: 44,
          x2: boxX + stepW + 5,
          y2: 44,
          color: "#ff4d2e",
        });
      }
    }
  } else if (layout === "funnel") {
    const centerX = diagramLeft + Math.floor(diagramWidth / 2);
    const tiers = [
      { w: diagramWidth, y: 16, label: nodes[0] || "Top Intake", color: "#2563eb" },
      { w: Math.floor(diagramWidth * 0.72), y: 40, label: nodes[1] || "Filter Stage", color: "#d97706" },
      { w: Math.floor(diagramWidth * 0.46), y: 64, label: nodes[2] || "Core Output", color: "#059669" },
    ];
    for (const tier of tiers) {
      elements.push({
        type: "rect",
        x: centerX - Math.floor(tier.w / 2),
        y: tier.y,
        width: tier.w,
        height: 18,
        label: tier.label,
        color: tier.color,
      });
    }
  } else if (layout === "balance-scale") {
    const centerX = diagramLeft + Math.floor(diagramWidth / 2);
    elements.push(
      {
        type: "circle",
        x: diagramLeft + 4,
        y: 24,
        width: 24,
        height: 24,
        label: nodes[0] || "Option A",
        color: "#e11d48",
      },
      {
        type: "line",
        x: diagramLeft + 10,
        y: 52,
        x2: diagramRight - 10,
        y2: 52,
        color: "#12141c",
      },
      {
        type: "circle",
        x: diagramRight - 28,
        y: 24,
        width: 24,
        height: 24,
        label: nodes[1] || "Option B",
        color: "#059669",
      },
      {
        type: "rect",
        x: centerX - 8,
        y: 54,
        width: 16,
        height: 18,
        label: nodes[2] || "Fulcrum",
        color: "#d97706",
      },
    );
  } else if (layout === "iceberg") {
    elements.push(
      {
        type: "rect",
        x: diagramLeft + Math.floor(diagramWidth * 0.2),
        y: 14,
        width: Math.floor(diagramWidth * 0.6),
        height: 22,
        label: nodes[0] || "Surface Symptom",
        color: "#2563eb",
      },
      {
        type: "line",
        x: diagramLeft,
        y: 41,
        x2: diagramRight,
        y2: 41,
        color: "#0284c7",
      },
      {
        type: "rect",
        x: diagramLeft + 4,
        y: 46,
        width: diagramWidth - 8,
        height: 36,
        label: nodes[1] || "Hidden Root Structure",
        color: "#1e293b",
      },
    );
  } else if (layout === "timeline") {
    elements.push({
      type: "arrow",
      x: diagramLeft + 4,
      y: 50,
      x2: diagramRight - 4,
      y2: 50,
      color: "#12141c",
    });
    const count = Math.min(4, Math.max(3, nodes.length || 3));
    const gap = Math.floor((diagramWidth - 16) / (count - 1));
    for (let i = 0; i < count; i++) {
      const cx = diagramLeft + 6 + i * gap;
      elements.push({
        type: "circle",
        x: cx - 8,
        y: i % 2 === 0 ? 22 : 58,
        width: 18,
        height: 18,
        label: nodes[i] || `Milestone ${i + 1}`,
        color: i === count - 1 ? "#059669" : "#ff4d2e",
      });
    }
  } else if (layout === "character-scene") {
    for (let i = 0; i < Math.min(3, nodes.length); i++) {
      elements.push({
        type: "rect",
        x: 56,
        y: 16 + i * 24,
        width: 34,
        height: 18,
        label: nodes[i],
        color: "#2563eb",
      });
    }
  }

  // Place the cartoon character marker when characterPosition is not "none".
  if (pos !== "none") {
    const personX = pos === "right" ? 74 : pos === "center" ? 38 : 6;
    const personY = pos === "center" ? 28 : 42;
    elements.push({
      type: "person",
      x: personX,
      y: personY,
      width: 20,
      height: 44,
      label: input.characterAction?.trim() || "Host",
      color: "#ff4d2e",
    });
  }

  return elements;
}

const draftChatOutputSchema = z.object({
  reply: z
    .string()
    .describe(
      "Short, helpful reply in the user's language (Traditional Chinese / Cantonese or English) summarizing the drafted or updated clips.",
    ),
  clips: z
    .array(
      z.object({
        clipNumber: z.number().int().min(1).max(MAX_CLIP_DRAFTS),
        explanation: z
          .string()
          .describe(
            "Concrete visual & explanation staging for this clip: what appears on screen, how the concept is explained visually, layout, and action.",
          ),
        voDraft: z
          .string()
          .optional()
          .describe("Suggested voiceover or spoken dialogue line for this clip."),
        diagramLayout: z
          .enum(STORYBOARD_DIAGRAM_LAYOUTS)
          .optional()
          .describe("Best-fitting visual diagram layout archetype for this clip."),
        characterPosition: z
          .enum(STORYBOARD_CHARACTER_POSITIONS)
          .optional()
          .describe("Where the cartoon host stands on the canvas in this clip."),
        characterAction: z
          .string()
          .optional()
          .describe(
            "Short phrase describing the cartoon character's expression and body action (e.g. '指住圖表講解', '抱頭苦惱', '推開舊做法').",
          ),
        visualNodes: z
          .array(z.string())
          .max(MAX_VISUAL_NODES)
          .optional()
          .describe(
            "3 to 5 concrete cartoon teaching objects, icons, or labeled diagram cards (e.g. '「舊方法」混亂紅線團', '「新系統」綠色直線橋') shown on the board.",
          ),
      }),
    )
    .min(1)
    .max(MAX_CLIP_DRAFTS),
});

// Sanitize and normalize user/client clip drafts, keeping rows with any explanation, VO, sketch, or structured cartoon control.
export function sanitizeClipDraftsInput(raw: unknown): StoryboardClipDraft[] {
  if (!Array.isArray(raw)) return [];
  const drafts: StoryboardClipDraft[] = [];
  for (let i = 0; i < raw.length && drafts.length < MAX_CLIP_DRAFTS; i++) {
    const item = raw[i];
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const explanation = String(record.explanation ?? "")
      .trim()
      .slice(0, MAX_DRAFT_EXPLANATION_LENGTH);
    const voDraft = String(record.voDraft ?? "")
      .trim()
      .slice(0, MAX_DRAFT_VO_LENGTH);
    const sketchUrl = String(record.sketchUrl ?? "").trim();
    const diagramLayout = isDiagramLayout(record.diagramLayout)
      ? record.diagramLayout
      : undefined;
    const characterPosition = isCharacterPosition(record.characterPosition)
      ? record.characterPosition
      : undefined;
    const characterAction = String(record.characterAction ?? "")
      .trim()
      .slice(0, MAX_CHARACTER_ACTION_LENGTH);
    const visualNodes = sanitizeVisualNodes(record.visualNodes);
    const sketchElements = sanitizeSketchElements(record.sketchElements);

    const hasStructuredControl = Boolean(
      (diagramLayout && diagramLayout !== "auto") ||
        (characterPosition && characterPosition !== "auto") ||
        characterAction ||
        visualNodes?.length ||
        sketchElements?.length,
    );

    if (!explanation && !voDraft && !sketchUrl && !hasStructuredControl) continue;
    const rawNum = Number(record.clipNumber);
    const clipNumber =
      Number.isInteger(rawNum) && rawNum >= 1 ? rawNum : drafts.length + 1;
    drafts.push({
      clipNumber,
      explanation,
      ...(voDraft ? { voDraft } : {}),
      ...(sketchUrl ? { sketchUrl } : {}),
      ...(diagramLayout ? { diagramLayout } : {}),
      ...(characterPosition ? { characterPosition } : {}),
      ...(characterAction ? { characterAction } : {}),
      ...(visualNodes ? { visualNodes } : {}),
      ...(sketchElements ? { sketchElements } : {}),
    });
  }
  return drafts.map((draft, index) => ({
    ...draft,
    clipNumber: index + 1,
  }));
}

// Upload any inline PNG data: URLs in clipDrafts to Vercel Blob so MongoDB only stores clean HTTPS URLs.
export async function uploadClipDraftSketches(
  clerkUserId: string,
  drafts: StoryboardClipDraft[],
): Promise<StoryboardClipDraft[]> {
  const out: StoryboardClipDraft[] = [];
  const safeUser = clerkUserId.replace(/[^a-zA-Z0-9_-]/g, "");
  for (const draft of drafts) {
    let sketchUrl = draft.sketchUrl;
    if (sketchUrl && sketchUrl.startsWith("data:image/")) {
      const match = sketchUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (match) {
        const mime = match[1];
        const buffer = Buffer.from(match[2], "base64");
        if (buffer.byteLength > 0 && buffer.byteLength <= 6 * 1024 * 1024) {
          sketchUrl = await persistBuffer(
            buffer,
            `explainer/brands/${safeUser}/draft-sketch-${Date.now()}-clip-${draft.clipNumber}.png`,
            mime,
          );
        } else {
          sketchUrl = undefined;
        }
      } else {
        sketchUrl = undefined;
      }
    }
    out.push({
      ...draft,
      sketchUrl: sketchUrl && /^https?:\/\//i.test(sketchUrl) ? sketchUrl : undefined,
    });
    if (!out[out.length - 1].sketchUrl) {
      delete out[out.length - 1].sketchUrl;
    }
  }
  return out;
}

// Formats the user's pre-planned clip drafts (including structured cartoon & diagram controls) into instructions for the Phase A AI Director.
export function buildStoryboardDraftPhaseABlock(
  drafts: StoryboardClipDraft[] | undefined,
): string {
  if (!drafts || drafts.length === 0) return "";
  const lines = drafts.map((draft) => {
    const parts = [`- Clip ${draft.clipNumber}:`];
    if (draft.diagramLayout && draft.diagramLayout !== "auto") {
      parts.push(
        `  Diagram Layout Archetype: ${draft.diagramLayout} (${DIAGRAM_LAYOUT_LABELS[draft.diagramLayout]})`,
      );
    }
    if (
      (draft.characterPosition && draft.characterPosition !== "auto") ||
      draft.characterAction?.trim()
    ) {
      const posPart =
        draft.characterPosition && draft.characterPosition !== "auto"
          ? `position=${draft.characterPosition} (${CHARACTER_POSITION_LABELS[draft.characterPosition]})`
          : "position=auto";
      const actPart = draft.characterAction?.trim()
        ? `; action=${draft.characterAction.trim()}`
        : "";
      parts.push(`  Character Staging: ${posPart}${actPart}`);
    }
    if (draft.visualNodes && draft.visualNodes.length > 0) {
      parts.push(
        `  Required On-Canvas Cartoon Objects & Labels (must appear step-by-step in startScene/endScene): ${draft.visualNodes.join(" | ")}`,
      );
    }
    if (draft.explanation.trim()) {
      parts.push(`  Visual & Scene Explanation: ${draft.explanation.trim()}`);
    }
    if (draft.voDraft?.trim()) {
      parts.push(`  Suggested VO / Dialogue: ${draft.voDraft.trim()}`);
    }
    if (draft.sketchUrl) {
      parts.push(
        `  Layout Sketch: Attached as [Clip ${draft.clipNumber} Hand-Drawn Sketch] — follow its spatial layout, diagram placement, and staging.`,
      );
    }
    return parts.join("\n");
  });
  return [
    "\nUser Storyboard Clip Drafts (the user pre-designed these specific clips in the storyboard draft step; you MUST incorporate their diagram layout, character position/action, required on-canvas cartoon objects/labels, visual explanations, VO drafts, and any attached hand-drawn layout sketches for the corresponding clips):",
    ...lines,
    "",
  ].join("\n");
}

// Merge AI-generated clip drafts with existing user sketches and synthesize preset wireframe sketchElements when needed.
export function mergeAiDraftsWithExistingSketches(
  aiClips: Array<{
    clipNumber: number;
    explanation: string;
    voDraft?: string;
    diagramLayout?: StoryboardDiagramLayout;
    characterPosition?: StoryboardCharacterPosition;
    characterAction?: string;
    visualNodes?: string[];
  }>,
  existing: StoryboardClipDraft[],
): StoryboardClipDraft[] {
  const existingByClip = new Map<number, StoryboardClipDraft>();
  for (const item of existing) {
    existingByClip.set(item.clipNumber, item);
  }
  return aiClips.slice(0, MAX_CLIP_DRAFTS).map((clip, index) => {
    const clipNumber = index + 1;
    const prev = existingByClip.get(clip.clipNumber) ?? existingByClip.get(clipNumber);
    const sketchUrl = prev?.sketchUrl;
    const explanation = clip.explanation.trim().slice(0, MAX_DRAFT_EXPLANATION_LENGTH);
    const voDraft = clip.voDraft?.trim().slice(0, MAX_DRAFT_VO_LENGTH);
    const diagramLayout = isDiagramLayout(clip.diagramLayout)
      ? clip.diagramLayout
      : prev?.diagramLayout;
    const characterPosition = isCharacterPosition(clip.characterPosition)
      ? clip.characterPosition
      : prev?.characterPosition;
    const characterAction =
      clip.characterAction?.trim().slice(0, MAX_CHARACTER_ACTION_LENGTH) ||
      prev?.characterAction;
    const visualNodes = sanitizeVisualNodes(clip.visualNodes) ?? prev?.visualNodes;
    const sketchElements =
      prev?.sketchElements && prev.sketchElements.length > 0
        ? prev.sketchElements
        : diagramLayout || characterPosition || visualNodes?.length
          ? buildPresetSketchElements({
              diagramLayout,
              characterPosition,
              characterAction,
              visualNodes,
            })
          : undefined;

    return {
      clipNumber,
      explanation,
      ...(voDraft ? { voDraft } : {}),
      ...(sketchUrl ? { sketchUrl } : {}),
      ...(diagramLayout ? { diagramLayout } : {}),
      ...(characterPosition ? { characterPosition } : {}),
      ...(characterAction ? { characterAction } : {}),
      ...(visualNodes ? { visualNodes } : {}),
      ...(sketchElements ? { sketchElements } : {}),
    };
  });
}

// Runs the AI Storyboard Draft Assistant chat to draft or refine pre-Phase-A clip breakdowns, diagram layouts, character actions, and visual nodes.
export async function draftStoryboardClipsWithAi(input: {
  skillSlug: string;
  styleId: string;
  source: string;
  spokenScript?: string;
  language?: VoLanguage;
  currentDrafts: StoryboardClipDraft[];
  history: StoryboardDraftChatMessage[];
  message: string;
}): Promise<{ reply: string; drafts: StoryboardClipDraft[] }> {
  const currentText =
    input.currentDrafts.length > 0
      ? input.currentDrafts
          .map(
            (d) =>
              `Clip ${d.clipNumber}:\n  Diagram Layout: ${d.diagramLayout || "auto"}\n  Character Position: ${d.characterPosition || "auto"}\n  Character Action: ${d.characterAction || "(none)"}\n  Visual Nodes: ${(d.visualNodes ?? []).join(" | ") || "(none)"}\n  Explanation: ${d.explanation || "(empty)"}\n  VO: ${d.voDraft || "(empty)"}${d.sketchUrl ? "\n  (User has drawn a layout sketch on the canvas for this clip)" : ""}`,
          )
          .join("\n\n")
      : "(No clip drafts yet — create a complete set of clips from the script)";

  const historyText =
    input.history.length > 0
      ? input.history
          .slice(-6)
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n")
      : "(none)";

  const generated = await generateText({
    model: storyboardModel(),
    providerOptions: storyboardProviderOptions(),
    output: Output.object({ schema: draftChatOutputSchema }),
    system: `You are an expert AI Storyboard Draft Assistant helping a creator plan step-by-step cartoon and diagram explainers before full storyboard generation.
Director mode: ${input.skillSlug || "cartoon-explainer-video-director"}
Visual style: ${input.styleId || "realistic"}
Target language: ${input.language || "yue"}

Rules:
- Read the user's main script/instruction and their chat request.
- Output the full list of drafted clips (usually 3 to 6 clips unless the user asks for a specific number) in sequential order (Clip 1, Clip 2, ...).
- For EACH clip, populate:
  1. "diagramLayout": pick the most effective visual explanation layout from ["split-compare", "process-flow", "funnel", "balance-scale", "iceberg", "timeline", "character-scene"]. Vary layouts across clips so the video stays dynamic.
  2. "characterPosition": pick where the cartoon host stands ("left", "right", "center", or "none" when the diagram fills 100% of the canvas). Alternate "left" and "right" across clips.
  3. "characterAction": a short, vivid action/emotion phrase for the cartoon host (e.g. "指住圖表講解", "抱頭苦惱", "推開舊方法", "舉起放大鏡", "叮一聲諗通").
  4. "visualNodes": 3 to 4 concrete cartoon props, icons, or labeled diagram pieces in 「」 (e.g. ["「舊方法」混亂線團", "「新系統」綠色直線", "省時 80% 獎盃"]) that appear step-by-step on the canvas.
  5. "explanation": clear step-by-step description of Beat 1 (Start) and Beat 2 (End) on the board.
  6. "voDraft": the spoken voiceover/dialogue line for that clip.
- Write "explanation", "voDraft", "characterAction", "visualNodes", and "reply" in the same language as the user's script/request (e.g. Traditional Chinese / Hong Kong Cantonese when the script or prompt is in Chinese/Cantonese).
- If the user asks to modify only a specific clip (e.g. "Change Clip 2"), keep the other clips intact and update that clip.`,
    prompt: `Main Script / Instruction:\n${input.source.trim() || "(empty)"}${
      input.spokenScript?.trim() ? `\n\nSpoken Script:\n${input.spokenScript.trim()}` : ""
    }\n\nCurrent Clip Drafts:\n${currentText}\n\nRecent Chat History:\n${historyText}\n\nUser Request:\n${input.message.trim()}`,
  });

  const output = generated.output;
  if (!output || !output.clips?.length) {
    throw new Error("AI 分鏡草稿產生失敗，請再試一次");
  }

  return {
    reply: output.reply.trim(),
    drafts: mergeAiDraftsWithExistingSketches(output.clips, input.currentDrafts),
  };
}
