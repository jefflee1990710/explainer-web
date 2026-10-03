import { ObjectId } from "mongodb";
import { userStylesCollection } from "@/dao/user-styles";
import { isStyleId } from "@/model/style-id";
import type { UserStyleDoc } from "@/model/user-style";
import { hydrateStyles, resolvedStyle } from "@/service/style/load-style";
import type { Style } from "@/service/style/types";
import {
  copyUserStyleFields,
  USER_STYLE_LETTERING_KEYS,
  USER_STYLE_PROMPT_KEYS,
  type UserStyleFields,
} from "@/service/style/user-style-fields";

export type RenderableStyle = { id: string } & UserStyleFields;

export function renderableFromSystem(style: Style): RenderableStyle {
  return { id: style.id, ...copyUserStyleFields(style) };
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
  return { id: doc._id.toHexString(), ...userStyleFieldsFromDoc(doc) };
}

async function defaultFindUserStyle(
  styleId: string,
  ownerClerkUserId: string,
): Promise<UserStyleDoc | null> {
  const collection = await userStylesCollection();
  return collection.findOne({
    _id: new ObjectId(styleId),
    ownerClerkUserId,
  });
}

async function loadSystemRenderable(styleId: string | undefined): Promise<RenderableStyle> {
  try {
    return renderableFromSystem(resolvedStyle(styleId));
  } catch {
    await hydrateStyles();
    return renderableFromSystem(resolvedStyle(styleId));
  }
}

export async function loadRenderableStyle(input: {
  styleId?: string;
  ownerClerkUserId: string;
  findUserStyle?: (id: string, owner: string) => Promise<UserStyleDoc | null>;
}): Promise<RenderableStyle> {
  const { styleId, ownerClerkUserId, findUserStyle = defaultFindUserStyle } = input;

  if (!styleId || styleId === "") {
    return loadSystemRenderable(undefined);
  }

  if (isStyleId(styleId)) {
    return loadSystemRenderable(styleId);
  }

  if (ObjectId.isValid(styleId)) {
    const doc = await findUserStyle(styleId, ownerClerkUserId);
    if (!doc) {
      throw new Error(`Style "${styleId}" is missing`);
    }
    return renderableFromUserStyle(doc);
  }

  throw new Error(`Style "${styleId}" is missing`);
}
