import {
  USER_STYLE_LETTERING_KEYS,
  USER_STYLE_PROMPT_KEYS,
  USER_STYLE_VISUAL_KEYS,
  type UserStyleFields,
  type UserStyleVisualKey,
} from "@/service/style/user-style-fields";
import type { PreviewStatus } from "@/model/user-style";
import type { StyleId } from "@/model/style-id";

// One persisted chat turn, safe to pass into a client component.
export type StyleChatItem = {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  previewUrl?: string;
  changedPaths?: string[];
  createdAt: string;
};

// System catalog row or an owned custom style, with every editable field.
export type StyleDetail = {
  id: string;
  isCustom: boolean;
  name: string;
  description: string;
  canvas: string;
  canvasColor: string;
  look: string;
  palette: string;
  typography: string;
  motion: string;
  negatives: string;
  letteringLayout: string;
  letteringLine1: string;
  letteringLine2: string;
  beatTitleLayout: string;
  reelLayout: string;
  previewUrl?: string;
  // Hash of the prompt that produced previewUrl. Empty until a still finishes.
  previewHash?: string;
  // True when this custom style has its own still, not the inherited template image.
  hasOwnPreview: boolean;
  previewStatus: PreviewStatus;
  baseStyleId?: StyleId;
  templateName?: string;
  updatedAt: string;
  chat: StyleChatItem[];
};

export function fieldsFromDetail(style: StyleDetail): UserStyleFields {
  return {
    name: style.name,
    description: style.description,
    canvas: style.canvas,
    canvasColor: style.canvasColor,
    look: style.look,
    palette: style.palette,
    typography: style.typography,
    motion: style.motion,
    negatives: style.negatives,
    letteringLayout: style.letteringLayout,
    letteringLine1: style.letteringLine1,
    letteringLine2: style.letteringLine2,
    beatTitleLayout: style.beatTitleLayout,
    reelLayout: style.reelLayout,
  };
}

// Field-wise compare so chat edits and typed edits both count as unsaved.
export function styleFieldsDirty(saved: UserStyleFields, draft: UserStyleFields): boolean {
  const keys = [...USER_STYLE_PROMPT_KEYS, ...USER_STYLE_LETTERING_KEYS];
  return keys.some((key) => saved[key] !== draft[key]);
}

export function changedVisualKeys(saved: UserStyleFields, draft: UserStyleFields): UserStyleVisualKey[] {
  return USER_STYLE_VISUAL_KEYS.filter((key) => saved[key] !== draft[key]);
}

// Keep name and description the user is typing; replace only visual fields from chat.
export function mergeVisualFields(draft: UserStyleFields, next: UserStyleFields): UserStyleFields {
  const merged: UserStyleFields = { ...draft };
  for (const key of USER_STYLE_VISUAL_KEYS) {
    merged[key] = next[key];
  }
  return merged;
}

export function catalogStyleLabel(
  translate: (key: string) => string,
  id: string,
  fallback: string,
): string {
  const label = translate(`styles.${id}`);
  return label === `styles.${id}` ? fallback : label;
}
