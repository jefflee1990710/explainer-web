import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { requireAppUser } from "@/service/auth";
import { videoTemplatesCollection, videosCollection } from "@/dao";
import { hasEdit, normalizeTemplateName } from "@/service/video-edit/edit-state";
import { toPublicTemplate, toPublicVideo, type PublicTemplate, type PublicVideo } from "@/presentation/serialize";
import type { VideoEdit } from "@/model/video-edit";

type Fail = { ok: false; error: string };

// Only the content fields; ids, owner, and dates never copy across.
function editOf(source: VideoEdit): VideoEdit {
  return {
    layers: source.layers.map((layer) => ({ ...layer })),
    ...(source.intro ? { intro: { ...source.intro } } : {}),
    ...(source.outro ? { outro: { ...source.outro } } : {}),
    ...(source.defaultTransition ? { defaultTransition: { ...source.defaultTransition } } : {}),
    ...(source.transitions ? { transitions: { ...source.transitions } } : {}),
  };
}

async function ownedVideo(videoId: string, clerkUserId: string) {
  if (!ObjectId.isValid(videoId)) return null;
  const videos = await videosCollection();
  return videos.findOne({ _id: new ObjectId(videoId), clerkUserId });
}

async function ownedTemplate(templateId: string, clerkUserId: string) {
  if (!ObjectId.isValid(templateId)) return null;
  const templates = await videoTemplatesCollection();
  return templates.findOne({ _id: new ObjectId(templateId), clerkUserId });
}

async function nameTaken(clerkUserId: string, name: string, exceptId?: ObjectId) {
  const templates = await videoTemplatesCollection();
  const found = await templates.findOne({ clerkUserId, name, ...(exceptId ? { _id: { $ne: exceptId } } : {}) });
  return Boolean(found);
}

// The unique index backs up nameTaken when two requests race.
async function templatesWithNameIndex() {
  const templates = await videoTemplatesCollection();
  await templates.createIndex({ clerkUserId: 1, name: 1 }, { unique: true }).catch(() => {});
  return templates;
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

function revalidateVideo(projectId: ObjectId) {
  revalidatePath(`/app/projects/${projectId.toHexString()}`);
}

export async function listTemplatesAction(): Promise<{ ok: true; templates: PublicTemplate[] } | Fail> {
  const user = await requireAppUser();
  const templates = await videoTemplatesCollection();
  const rows = await templates.find({ clerkUserId: user.clerkUserId }).sort({ updatedAt: -1 }).toArray();
  return { ok: true, templates: rows.map(toPublicTemplate) };
}

// Copy the template onto the video; later edits stay on the video.
export async function applyTemplateAction(
  videoId: string,
  templateId: string,
): Promise<{ ok: true; project: PublicVideo } | Fail> {
  const user = await requireAppUser();
  const video = await ownedVideo(videoId, user.clerkUserId);
  const template = await ownedTemplate(templateId, user.clerkUserId);
  if (!video || !template) return { ok: false, error: "找不到影片或樣板" };
  const videos = await videosCollection();
  await videos.updateOne(
    { _id: video._id },
    { $set: { edit: editOf(template), editTemplateId: template._id, updatedAt: new Date() } },
  );
  revalidateVideo(video.projectId);
  const updated = await videos.findOne({ _id: video._id });
  return updated ? { ok: true, project: toPublicVideo(updated) } : { ok: false, error: "找不到影片" };
}

export async function saveTemplateAction(
  videoId: string,
  rawName: string,
): Promise<{ ok: true; project: PublicVideo; template: PublicTemplate } | Fail> {
  const user = await requireAppUser();
  const checked = normalizeTemplateName(rawName);
  if (!checked.ok) return checked;
  const video = await ownedVideo(videoId, user.clerkUserId);
  if (!video) return { ok: false, error: "找不到影片" };
  if (!video.edit || !hasEdit(video.edit)) return { ok: false, error: "先加入圖層或開頭結尾" };
  if (await nameTaken(user.clerkUserId, checked.name)) return { ok: false, error: "已有同名樣板" };

  const now = new Date();
  const templates = await templatesWithNameIndex();
  const doc = { clerkUserId: user.clerkUserId, name: checked.name, ...editOf(video.edit), createdAt: now, updatedAt: now };
  let inserted;
  try {
    inserted = await templates.insertOne(doc);
  } catch (error) {
    if (isDuplicateKey(error)) return { ok: false, error: "已有同名樣板" };
    throw error;
  }
  const videos = await videosCollection();
  await videos.updateOne({ _id: video._id }, { $set: { editTemplateId: inserted.insertedId, updatedAt: now } });
  revalidateVideo(video.projectId);
  const updated = await videos.findOne({ _id: video._id });
  if (!updated) return { ok: false, error: "找不到影片" };
  return {
    ok: true,
    project: toPublicVideo(updated),
    template: toPublicTemplate({ ...doc, _id: inserted.insertedId }),
  };
}

// Overwrite only the template this video came from. Other videos keep their copies.
export async function overwriteTemplateAction(
  videoId: string,
  templateId: string,
): Promise<{ ok: true; template: PublicTemplate } | Fail> {
  const user = await requireAppUser();
  const video = await ownedVideo(videoId, user.clerkUserId);
  const template = await ownedTemplate(templateId, user.clerkUserId);
  if (!video || !template) return { ok: false, error: "找不到影片或樣板" };
  if (!video.editTemplateId?.equals(template._id)) return { ok: false, error: "這支影片不是從這個樣板來的" };
  if (!video.edit || !hasEdit(video.edit)) return { ok: false, error: "先加入圖層或開頭結尾" };

  const next = { ...editOf(video.edit), updatedAt: new Date() };
  // A removed intro/outro must also leave the template.
  const unset: Record<string, ""> = {};
  if (!next.intro) unset.intro = "";
  if (!next.outro) unset.outro = "";
  const templates = await videoTemplatesCollection();
  await templates.updateOne(
    { _id: template._id },
    Object.keys(unset).length ? { $set: next, $unset: unset } : { $set: next },
  );
  const updated = await templates.findOne({ _id: template._id });
  return updated ? { ok: true, template: toPublicTemplate(updated) } : { ok: false, error: "找不到樣板" };
}

export async function renameTemplateAction(
  templateId: string,
  rawName: string,
): Promise<{ ok: true; template: PublicTemplate } | Fail> {
  const user = await requireAppUser();
  const checked = normalizeTemplateName(rawName);
  if (!checked.ok) return checked;
  const template = await ownedTemplate(templateId, user.clerkUserId);
  if (!template) return { ok: false, error: "找不到樣板" };
  if (await nameTaken(user.clerkUserId, checked.name, template._id)) return { ok: false, error: "已有同名樣板" };
  const templates = await templatesWithNameIndex();
  try {
    await templates.updateOne({ _id: template._id }, { $set: { name: checked.name, updatedAt: new Date() } });
  } catch (error) {
    if (isDuplicateKey(error)) return { ok: false, error: "已有同名樣板" };
    throw error;
  }
  const updated = await templates.findOne({ _id: template._id });
  return updated ? { ok: true, template: toPublicTemplate(updated) } : { ok: false, error: "找不到樣板" };
}

// Videos keep their edit copies; a dangling editTemplateId just hides the update button.
export async function deleteTemplateAction(templateId: string): Promise<{ ok: true } | Fail> {
  const user = await requireAppUser();
  const template = await ownedTemplate(templateId, user.clerkUserId);
  if (!template) return { ok: false, error: "找不到樣板" };
  const templates = await videoTemplatesCollection();
  await templates.deleteOne({ _id: template._id });
  return { ok: true };
}
