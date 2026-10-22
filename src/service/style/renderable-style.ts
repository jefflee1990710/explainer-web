import { defaultStyleBehavior, type IStyleBehavior } from "@/model/style";
import type { StyleId } from "@/model/style-id";
import type { UserStyleDoc } from "@/model/user-style";
import { resolvedStyle } from "@/service/style/load-style";
import type { Style } from "@/service/style/types";
import {
  copyUserStyleFields,
  USER_STYLE_LETTERING_KEYS,
  USER_STYLE_PROMPT_KEYS,
  type UserStyleFields,
} from "@/service/style/user-style-fields";

export type RenderableStyle = {
  id: string;
  baseStyleId?: StyleId;
  behavior?: IStyleBehavior;
} & UserStyleFields;

export function renderableFromSystem(style: Style): RenderableStyle {
  return {
    id: style.id,
    ...copyUserStyleFields(style),
    behavior: style.behavior ?? defaultStyleBehavior(style.id, style.canvas),
  };
}

function userStyleFieldsFromDoc(doc: UserStyleDoc): UserStyleFields {
  const next = {} as UserStyleFields;
  for (const key of USER_STYLE_PROMPT_KEYS) {
    next[key] = doc[key];
  }
  for (const key of USER_STYLE_LETTERING_KEYS) {
    next[key] = doc[key] ?? "";
  }
  return next;
}

export function renderableFromUserStyle(doc: UserStyleDoc): RenderableStyle {
  return {
    id: doc._id.toHexString(),
    ...userStyleFieldsFromDoc(doc),
    baseStyleId: doc.baseStyleId,
    behavior: defaultStyleBehavior(doc.baseStyleId, doc.canvas),
  };
}

// Loads the hardcoded built-in style, automatically falling back unknown/legacy custom IDs to the default style.
export async function loadRenderableStyle(input: {
  styleId?: string;
  ownerClerkUserId: string;
  findUserStyle?: (id: string, owner: string) => Promise<UserStyleDoc | null>;
}): Promise<RenderableStyle> {
  return renderableFromSystem(resolvedStyle(input.styleId));
}
