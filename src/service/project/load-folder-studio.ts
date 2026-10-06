import { ObjectId } from "mongodb";
import { charactersCollection, productsCollection, projectsCollection, videosCollection } from "@/dao";
import type { AppUser } from "@/model/user";
import type { Character } from "@/model/character";
import type { Folder } from "@/model/folder";
import type { Project } from "@/model/project";
import { listSelectableSkills } from "@/service/director/selectable-skills";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import { listSelectableStyles } from "@/service/style/list";
import { toPublicCharacter, toPublicFolder, toPublicProduct, toPublicSkills, VIDEO_LIST_PROJECTION } from "@/presentation/serialize";
import type { Product } from "@/model/product";

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
  const productsCol = await productsCollection();
  const [skillDocs, selectableStyles, characterDocs, productDocs, sub] = await Promise.all([
    listSelectableSkills(user.clerkUserId),
    listSelectableStyles(user.clerkUserId),
    charactersCol
      .find({ clerkUserId: user.clerkUserId })
      .sort({ updatedAt: -1 })
      .toArray() as Promise<Character[]>,
    productsCol
      .find({ clerkUserId: user.clerkUserId })
      .sort({ updatedAt: -1 })
      .toArray() as Promise<Product[]>,
    getActiveSubscription(user.clerkUserId),
  ]);
  return {
    skills: toPublicSkills(skillDocs),
    styles: [...selectableStyles.system, ...selectableStyles.mine],
    characters: characterDocs.map(toPublicCharacter),
    products: productDocs.map(toPublicProduct),
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
