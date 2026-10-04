import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { generateText, Output } from "ai";
import { z } from "zod";
import { skillsCollection, userDirectorsCollection } from "@/dao";
import { requireAppUser } from "@/service/auth";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import { customSkillSlug } from "@/service/director/behavior-slug";
import { customSelectableFilter, systemSelectableFilter } from "@/service/director/selectable-skills";
import { loadDirectorImageParts } from "@/service/character/cast-prompt";
import { directorModel } from "@/service/director/model";
import { chatRateLimited } from "@/service/director/chat-rate-limit";
import {
  directorChatSystemPrompt,
  directorChatUserPrompt,
  normalizeChatSummary,
} from "@/service/director/director-chat-prompt";
import {
  applyDirectorEdits,
  DRAFT_FIELDS,
  draftFieldValue,
  parseDraft,
  type DirectorDraft,
  type DirectorEdit,
  type DraftField,
} from "@/service/director/director-edits";
import { parseSystemProfile } from "@/service/director/profile";
import {
  toPublicDirector,
  toPublicDirectorChat,
  type PublicDirector,
} from "@/presentation/serialize";
import type { DirectorChatMessage, Skill } from "@/model/skill";

const TITLE_MAX = 60;
const DESCRIPTION_MAX = 300;
const MESSAGE_MAX = 2000;
const HISTORY_SENT = 20;
const CHAT_KEPT = 100;

const directorChatSchema = z.object({
  summary: z.string(),
  edits: z.array(z.object({ field: z.enum(DRAFT_FIELDS), content: z.string() })),
});

export type CreateDirectorResult = { ok: true; id: string } | { ok: false; error: string };
export type SaveDirectorResult = { ok: true; director: PublicDirector } | { ok: false; error: string };
export type DeleteDirectorResult = { ok: true } | { ok: false; error: string };
export type DirectorChatResult =
  | {
      ok: true;
      summary: string;
      edits: DirectorEdit[];
      changedFields: DraftField[];
      chat: PublicDirector["chat"];
    }
  | { ok: false; error: string };

function revalidateDirector(id: string) {
  revalidatePath("/app/directors");
  revalidatePath(`/app/directors/${id}`);
}

function fail(error: unknown, fallback: string): { ok: false; error: string } {
  return { ok: false, error: error instanceof Error ? error.message : fallback };
}

// Validated name + description, or the zh-Hant error to show.
function parseMeta(
  rawTitle: unknown,
  rawDescription: unknown,
): { ok: true; title: string; description: string } | { ok: false; error: string } {
  const title = String(rawTitle ?? "").trim();
  const description = String(rawDescription ?? "").trim();
  if (!title) return { ok: false, error: "請輸入 Director 名稱" };
  if (title.length > TITLE_MAX) return { ok: false, error: `Director 名稱最多 ${TITLE_MAX} 字` };
  if (description.length > DESCRIPTION_MAX) {
    return { ok: false, error: `Director 描述最多 ${DESCRIPTION_MAX} 字` };
  }
  return { ok: true, title, description };
}

// Active custom director owned by this user, or null for invalid / missing / not-owned / deleted ids.
async function ownedDirector(id: string, clerkUserId: string): Promise<Skill | null> {
  if (!ObjectId.isValid(id)) return null;
  const directors = await userDirectorsCollection();
  return (await directors.findOne({
    _id: new ObjectId(id),
    ...customSelectableFilter(clerkUserId),
  })) as Skill | null;
}

// Detail-page read: a system skill or one of the user's own directors.
export async function loadDirectorForUser(clerkUserId: string, id: string): Promise<Skill | null> {
  if (!ObjectId.isValid(id)) return null;
  const oid = new ObjectId(id);
  const skills = await skillsCollection();
  const system = (await skills.findOne({
    ...systemSelectableFilter(),
    _id: oid,
  })) as Skill | null;
  if (system) return system;
  const directors = await userDirectorsCollection();
  return (await directors.findOne({
    ...customSelectableFilter(clerkUserId),
    _id: oid,
  })) as Skill | null;
}

// Custom directors reuse the system template still.
export async function toPublicDirectorWithPreview(skill: Skill): Promise<PublicDirector> {
  if (skill.previewUrl || !skill.baseSlug) return toPublicDirector(skill);
  const skills = await skillsCollection();
  const template = await skills.findOne({
    slug: skill.baseSlug,
    ownerClerkUserId: { $exists: false },
  });
  return toPublicDirector(skill, template?.previewUrl);
}

// Fork a system skill into a new custom director owned by the user.
export async function createDirectorAction(input: {
  templateSlug: string;
  title: string;
  description: string;
}): Promise<CreateDirectorResult> {
  try {
    const user = await requireAppUser();
    const meta = parseMeta(input?.title, input?.description);
    if (!meta.ok) return meta;

    const skills = await skillsCollection();
    const template = (await skills.findOne({
      slug: String(input?.templateSlug ?? ""),
      ownerClerkUserId: { $exists: false },
      isActive: true,
    })) as Skill | null;
    if (!template?.profile) return { ok: false, error: "找不到模板" };

    const _id = new ObjectId();
    const now = new Date();
    const directors = await userDirectorsCollection();
    await directors.insertOne({
      _id,
      slug: customSkillSlug(_id),
      title: meta.title,
      description: meta.description,
      // Custom directors never hold prompt text; they run on the template via baseSlug.
      systemPrompt: "",
      references: [],
      customProfile: { ...parseSystemProfile(template.profile) },
      extraInstructions: "",
      inputSchema: template.inputSchema,
      higgsfieldDefaults: template.higgsfieldDefaults,
      isActive: true,
      sortOrder: template.sortOrder,
      ownerClerkUserId: user.clerkUserId,
      baseSlug: template.slug,
      chat: [],
      createdAt: now,
      updatedAt: now,
    });

    const id = _id.toHexString();
    revalidateDirector(id);
    return { ok: true, id };
  } catch (error) {
    return fail(error, "建立 Director 失敗");
  }
}

// Save name, description, profile fields, and extra instructions of a custom director.
export async function saveDirectorAction(input: {
  id: string;
  title: string;
  description: string;
  customProfile: DirectorDraft["customProfile"];
  extraInstructions: string;
}): Promise<SaveDirectorResult> {
  try {
    const user = await requireAppUser();
    const skill = await ownedDirector(String(input?.id ?? ""), user.clerkUserId);
    if (!skill) return { ok: false, error: "找不到 Director" };
    const meta = parseMeta(input.title, input.description);
    if (!meta.ok) return meta;
    const parsed = parseDraft({ customProfile: input.customProfile, extraInstructions: input.extraInstructions });
    if (!parsed.ok) return parsed;

    const directors = await userDirectorsCollection();
    const updated = (await directors.findOneAndUpdate(
      { _id: skill._id, ownerClerkUserId: user.clerkUserId, isActive: true },
      {
        $set: {
          title: meta.title,
          description: meta.description,
          customProfile: parsed.draft.customProfile,
          extraInstructions: parsed.draft.extraInstructions,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    )) as Skill | null;
    if (!updated) return { ok: false, error: "找不到 Director" };

    revalidateDirector(input.id);
    return { ok: true, director: await toPublicDirectorWithPreview(updated) };
  } catch (error) {
    return fail(error, "儲存 Director 失敗");
  }
}

// Soft-delete a custom director; videos loading it by skillId keep working.
export async function deleteDirectorAction(id: string): Promise<DeleteDirectorResult> {
  try {
    const user = await requireAppUser();
    if (!ObjectId.isValid(id)) return { ok: false, error: "找不到 Director" };
    const directors = await userDirectorsCollection();
    const now = new Date();
    const removed = await directors.updateOne(
      { _id: new ObjectId(id), ownerClerkUserId: user.clerkUserId, isActive: true },
      { $set: { isActive: false, deletedAt: now, updatedAt: now } },
    );
    if (removed.matchedCount !== 1) return { ok: false, error: "找不到 Director" };

    revalidateDirector(id);
    return { ok: true };
  } catch (error) {
    return fail(error, "刪除 Director 失敗");
  }
}

function parseChatImageUrl(value: unknown): string | undefined {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:") return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}

// Ask the AI to edit the current draft; persists the exchange, never the draft.
export async function sendDirectorChatAction(input: {
  id: string;
  message: string;
  imageUrl?: string;
  draft: DirectorDraft;
}): Promise<DirectorChatResult> {
  try {
    const user = await requireAppUser();
    const skill = await ownedDirector(String(input?.id ?? ""), user.clerkUserId);
    if (!skill) return { ok: false, error: "找不到 Director" };

    const sub = await getActiveSubscription(user.clerkUserId);
    if (!isSubscriptionActive(sub)) return { ok: false, error: "需要訂閱才能使用 AI 修改" };

    const message = String(input.message ?? "").trim();
    const imageUrl = parseChatImageUrl(input.imageUrl);
    if (message.length > MESSAGE_MAX) return { ok: false, error: "訊息過長" };
    if (!message && !imageUrl) return { ok: false, error: "請輸入訊息" };
    const promptMessage = message || "Match the attached reference image.";

    const parsed = parseDraft(input?.draft);
    if (!parsed.ok) return parsed;
    const draft = parsed.draft;

    if (chatRateLimited(skill.chat, new Date())) return { ok: false, error: "AI 修改太頻繁，請稍後再試" };

    const promptText = directorChatUserPrompt({
      draft,
      history: (skill.chat || []).slice(-HISTORY_SENT),
      message: promptMessage,
      hasImage: Boolean(imageUrl),
    });

    let imageParts: Awaited<ReturnType<typeof loadDirectorImageParts>> = [];
    if (imageUrl) {
      try {
        imageParts = await loadDirectorImageParts([imageUrl]);
      } catch (error) {
        console.error("director chat image fetch failed", error);
        return { ok: false, error: "素材網址無效，請重新上傳" };
      }
    }

    let output: z.infer<typeof directorChatSchema>;
    try {
      ({ output } = await generateText({
        model: directorModel(),
        output: Output.object({ schema: directorChatSchema }),
        system: directorChatSystemPrompt(),
        ...(imageParts.length
          ? {
              messages: [
                {
                  role: "user" as const,
                  content: [{ type: "text" as const, text: promptText }, ...imageParts],
                },
              ],
            }
          : { prompt: promptText }),
      }));
    } catch (error) {
      console.error("director chat failed", error);
      return { ok: false, error: "AI 修改失敗，請再試一次" };
    }

    const applied = applyDirectorEdits(draft, output.edits);
    if (!applied.ok) return applied;
    if (applied.changedFields.length === 0) return { ok: false, error: "AI 沒有修改任何欄位" };

    // One final edit per changed field (duplicates and no-op edits dropped).
    const edits: DirectorEdit[] = applied.changedFields.map((field) => ({
      field,
      content: draftFieldValue(applied.draft, field),
    }));
    const now = new Date();
    const userMsg: DirectorChatMessage = {
      role: "user",
      content: message,
      ...(imageUrl ? { imageUrl } : {}),
      createdAt: now,
    };
    const assistantMsg: DirectorChatMessage = {
      role: "assistant",
      content: normalizeChatSummary(output.summary, applied.changedFields.length),
      changedPaths: applied.changedFields,
      createdAt: now,
    };

    const directors = await userDirectorsCollection();
    const pushed = await directors.updateOne(
      { _id: skill._id, ownerClerkUserId: user.clerkUserId, isActive: true },
      { $push: { chat: { $each: [userMsg, assistantMsg], $slice: -CHAT_KEPT } } },
    );
    if (pushed.matchedCount !== 1) return { ok: false, error: "找不到 Director" };

    revalidateDirector(input.id);
    const chat = [...(skill.chat || []), userMsg, assistantMsg].slice(-CHAT_KEPT);
    return {
      ok: true,
      summary: assistantMsg.content,
      edits,
      changedFields: applied.changedFields,
      chat: toPublicDirectorChat(chat),
    };
  } catch (error) {
    return fail(error, "AI 修改失敗，請再試一次");
  }
}
