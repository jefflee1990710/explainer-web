import { ObjectId } from "mongodb";
import { charactersCollection, projectsCollection, videosCollection } from "@/dao";
import type { AppUser } from "@/model/user";
import type { Character } from "@/model/character";
import type { Folder } from "@/model/folder";
import type { Project } from "@/model/project";
import { listSelectableSkills } from "@/service/director/selectable-skills";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import { listPublicStyles } from "@/service/style/list";
import { toPublicCharacter, toPublicFolder, toPublicSkills, VIDEO_LIST_PROJECTION } from "@/presentation/serialize";

export async function loadOwnedFolder(folderId: string, clerkUserId: string) {
  if (!ObjectId.isValid(folderId)) return null;
  const folders = await projectsCollection();
  const folder = (await folders.findOne({
    _id: new ObjectId(folderId),
    clerkUserId,
  })) as Folder | null;
  if (!folder?.name) return null;
  return folder;
}

export async function loadStudioPickers(user: AppUser) {
  const charactersCol = await charactersCollection();
  const [skillDocs, styles, characterDocs, sub] = await Promise.all([
    listSelectableSkills(user.clerkUserId),
    listPublicStyles(),
    charactersCol
      .find({ clerkUserId: user.clerkUserId })
      .sort({ updatedAt: -1 })
      .toArray() as Promise<Character[]>,
    getActiveSubscription(user.clerkUserId),
  ]);
  return {
    skills: toPublicSkills(skillDocs),
    styles,
    characters: characterDocs.map(toPublicCharacter),
    subscribed: isSubscriptionActive(sub),
  };
}

export async function loadFolderVideoCards(folder: Folder) {
  const videos = await videosCollection();
  const videoDocs = (await videos
    .find({ projectId: folder._id }, { projection: VIDEO_LIST_PROJECTION })
    .sort({ updatedAt: -1, createdAt: -1 })
    .toArray()) as Project[];
  return toPublicFolder(folder, videoDocs);
}
