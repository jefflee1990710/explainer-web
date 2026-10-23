import { apiJson, fromResult, readJson, withApiUser } from "@/service/api/respond";
import {
  generateLifeShotAction,
  listLifePage,
} from "@/service/character/life";
import type { LifeRemarkInput } from "@/service/character/life-prompt";
import type { LifeCreateMode } from "@/model/life-shot-kind";
import type { LifeShotKind, LifeShotSource } from "@/model/life-shot";
import type { CharacterWardrobePicks } from "@/service/character/character-look";

// Life desk bootstrap: ready characters + recent shots.
export const GET = withApiUser(async ({ auth }) => {
  const page = await listLifePage(auth.user.clerkUserId);
  return apiJson(page);
});

// Enqueue a life shot (replace-person / scene-place / post-template).
export const POST = withApiUser(async ({ request }) => {
  const body = await readJson<{
    characterId?: string;
    createMode?: LifeCreateMode;
    place?: string;
    kind?: LifeShotKind;
    sceneImageUrl?: string;
    source?: LifeShotSource;
    customInstruction?: string;
    annotatedSceneDataUrl?: string;
    remarks?: LifeRemarkInput[];
    templateId?: string;
    compositionRefUrl?: string;
    poseId?: string;
    wardrobe?: CharacterWardrobePicks;
    versionId?: string;
  }>(request);

  if (!body.characterId || !body.source) {
    return apiJson({ error: "缺少 characterId 或 source" }, 400);
  }

  return fromResult(
    await generateLifeShotAction({
      characterId: body.characterId,
      createMode: body.createMode,
      place: body.place,
      kind: body.kind,
      sceneImageUrl: body.sceneImageUrl,
      source: body.source,
      customInstruction: body.customInstruction,
      annotatedSceneDataUrl: body.annotatedSceneDataUrl,
      remarks: body.remarks,
      templateId: body.templateId,
      compositionRefUrl: body.compositionRefUrl,
      poseId: body.poseId,
      wardrobe: body.wardrobe,
      versionId: body.versionId,
    }),
    201,
  );
});
