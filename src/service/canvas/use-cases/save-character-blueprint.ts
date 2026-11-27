// Saves a finished canvas blueprint as a library character. Run already paid for the Seedream image.

import { ObjectId } from "mongodb";
import { charactersCollection } from "@/dao";
import type { Character } from "@/model/character";
import { requireAppUser } from "@/service/auth";
import { resolveUserUsdBalance } from "@/service/billing/credit-balance";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import {
  canvasBlueprintVersionFields,
  parseCanvasCharacterSave,
} from "@/service/canvas/core/character-blueprint";
import { characterAllowance, countedCharacterFilter } from "@/service/character/character-limit";

export type SaveCanvasCharacterBlueprintResult =
  | { ok: true; character: Character }
  | { ok: false; error: string };

export async function saveCanvasCharacterBlueprint(input: {
  name?: string;
  blueprintUrl?: string;
  prompt?: string;
  referenceImageUrls?: string[];
}): Promise<SaveCanvasCharacterBlueprintResult> {
  const parsed = parseCanvasCharacterSave(input);
  if (!parsed.ok) return parsed;

  try {
    const user = await requireAppUser();
    const sub = await getActiveSubscription(user.clerkUserId);
    const balance = resolveUserUsdBalance(user);
    const hasPaidPack =
      balance.bonusCreditUsd > 0 ||
      Boolean(user.processedCheckoutIds && user.processedCheckoutIds.length > 0);
    const allowance = characterAllowance(
      isSubscriptionActive(sub) && sub ? sub.planId : null,
      user.email,
      hasPaidPack,
    );
    const characters = await charactersCollection();
    if (allowance != null) {
      const count = await characters.countDocuments(countedCharacterFilter(user.clerkUserId));
      if (count >= allowance) return { ok: false, error: "已達這個方案的角色上限" };
    }

    const now = new Date();
    const versionId = new ObjectId();
    const version = { id: versionId, ...canvasBlueprintVersionFields({ ...parsed.value, now }) };
    const insert = await characters.insertOne({
      userId: user._id,
      clerkUserId: user.clerkUserId,
      name: parsed.value.name,
      styleId: "realistic",
      versions: [version],
      defaultVersionId: versionId,
      baseVersionId: versionId,
      createdAt: now,
      updatedAt: now,
    });
    const character = (await characters.findOne({ _id: insert.insertedId })) as Character | null;
    if (!character) return { ok: false, error: "建立角色失敗" };
    return { ok: true, character };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "建立角色失敗" };
  }
}
