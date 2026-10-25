import { LIFE_POSES, lifePoseImagePath, lifePosePreviewSrc } from "@/model/life-pose";
import { LIFE_POSE_NAMES_ZH } from "@/util/i18n/messages/life-poses.names";
import {
  characterLookPreviewSrc,
  isFullBodyTop,
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
  const rows: Array<{
    id: string;
    part: PoseEditPart;
    label: string;
    previewUrl: string;
    coversLegs: boolean;
  }> = [];
  for (const part of POSE_EDIT_PARTS) {
    for (const option of optionsForLookPart(part)) {
      if (option.id === "none") continue;
      const preview = characterLookPreviewSrc(part, option.id);
      if (!preview) continue;
      rows.push({
        id: option.id,
        part,
        label: outfitLabel(option),
        previewUrl: absolute(appUrl, preview),
        // 連身上衣蓋住下身；其他部位一律 false。
        coversLegs: part === "top" && isFullBodyTop(option.id),
      });
    }
  }
  return rows;
}
