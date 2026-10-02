import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { generateText, Output } from "ai";
import { z } from "zod";
import { skillsCollection } from "@/dao";
import { requireAppUser } from "@/service/auth";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import { customSkillSlug } from "@/service/director/behavior-slug";
import { selectableSkillFilter } from "@/service/director/selectable-skills";
import { directorModel } from "@/service/director/model";
import { chatRateLimited } from "@/service/director/chat-rate-limit";
import {
  directorChatSystemPrompt,
  directorChatUserPrompt,
  normalizeChatSummary,
} from "@/service/director/director-chat-prompt";
import {
  applyDirectorEdits,
  DIRECTOR_FILE_MAX,
  draftPaths,
  SKILL_PATH,
  type DirectorDraft,
  type DirectorEdit,
} from "@/service/director/director-edits";
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
  edits: z.array(z.object({ path: z.string(), content: z.string() })),
});

export type CreateDirectorResult = { ok: true; id: string } | { ok: false; error: string };
export type SaveDirectorResult = { ok: true; director: PublicDirector } | { ok: false; error: string };
export type DeleteDirectorResult = { ok: true } | { ok: false; error: string };
export type DirectorChatResult =
  | {
      ok: true;
      summary: string;
      edits: DirectorEdit[];
      changedPaths: string[];
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

// Client draft coerced to strings and checked against the stored file set and size limit.
function parseDraft(
  skill: Skill,
  raw: { systemPrompt: unknown; references: unknown },
): { ok: true; draft: DirectorDraft } | { ok: false; error: string } {
  const references = Array.isArray(raw.references)
    ? raw.references.map((ref) => ({
        path: String(ref?.path ?? ""),
        content: String(ref?.content ?? ""),
      }))
    : [];
  const draft: DirectorDraft = { systemPrompt: String(raw.systemPrompt ?? ""), references };

  const stored = new Set(draftPaths(skill));
  const incoming = draftPaths(draft);
  const sameSet =
    incoming.length === stored.size &&
    new Set(incoming).size === incoming.length &&
    incoming.every((path) => stored.has(path));
  if (!sameSet) return { ok: false, error: "不可新增或刪除檔案" };

  const tooLong =
    draft.systemPrompt.length > DIRECTOR_FILE_MAX ||
    references.some((ref) => ref.content.length > DIRECTOR_FILE_MAX);
  if (tooLong) return { ok: false, error: "檔案內容過長" };

  // Keep references in the stored order.
  const byPath = new Map(references.map((ref) => [ref.path, ref.content]));
  return {
    ok: true,
    draft: {
      systemPrompt: draft.systemPrompt,
      references: skill.references.map((ref) => ({ path: ref.path, content: byPath.get(ref.path) ?? "" })),
    },
  };
}

// Active custom director owned by this user, or null for invalid / missing / not-owned / deleted ids.
async function ownedDirector(id: string, clerkUserId: string): Promise<Skill | null> {
  if (!ObjectId.isValid(id)) return null;
  const skills = await skillsCollection();
  return (await skills.findOne({
    _id: new ObjectId(id),
    ownerClerkUserId: clerkUserId,
    isActive: true,
  })) as Skill | null;
}

// Detail-page read: a system skill or one of the user's own directors.
export async function loadDirectorForUser(clerkUserId: string, id: string): Promise<Skill | null> {
  if (!ObjectId.isValid(id)) return null;
  const skills = await skillsCollection();
  return (await skills.findOne({
    ...selectableSkillFilter(clerkUserId),
    _id: new ObjectId(id),
  })) as Skill | null;
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
    if (!template) return { ok: false, error: "找不到模板" };

    const _id = new ObjectId();
    const now = new Date();
    await skills.insertOne({
      _id,
      slug: customSkillSlug(_id),
      title: meta.title,
      titleZh: meta.title,
      description: meta.description,
      systemPrompt: template.systemPrompt,
      references: template.references.map((ref) => ({ path: ref.path, content: ref.content })),
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

// Save name, description, and file contents of a custom director.
export async function saveDirectorAction(input: {
  id: string;
  title: string;
  description: string;
  systemPrompt: string;
  references: DirectorDraft["references"];
}): Promise<SaveDirectorResult> {
  try {
    const user = await requireAppUser();
    const skill = await ownedDirector(String(input?.id ?? ""), user.clerkUserId);
    if (!skill) return { ok: false, error: "找不到 Director" };
    const meta = parseMeta(input.title, input.description);
    if (!meta.ok) return meta;
    const parsed = parseDraft(skill, input);
    if (!parsed.ok) return parsed;

    const skills = await skillsCollection();
    const updated = (await skills.findOneAndUpdate(
      { _id: skill._id, ownerClerkUserId: user.clerkUserId, isActive: true },
      {
        $set: {
          title: meta.title,
          titleZh: meta.title,
          description: meta.description,
          systemPrompt: parsed.draft.systemPrompt,
          references: parsed.draft.references,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    )) as Skill | null;
    if (!updated) return { ok: false, error: "找不到 Director" };

    revalidateDirector(input.id);
    return { ok: true, director: toPublicDirector(updated) };
  } catch (error) {
    return fail(error, "儲存 Director 失敗");
  }
}

// Soft-delete a custom director; videos loading it by skillId keep working.
export async function deleteDirectorAction(id: string): Promise<DeleteDirectorResult> {
  try {
    const user = await requireAppUser();
    if (!ObjectId.isValid(id)) return { ok: false, error: "找不到 Director" };
    const skills = await skillsCollection();
    const now = new Date();
    const removed = await skills.updateOne(
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

// Ask the AI to edit the current draft; persists the exchange, never the draft.
export async function sendDirectorChatAction(input: {
  id: string;
  message: string;
  draft: DirectorDraft;
}): Promise<DirectorChatResult> {
  try {
    const user = await requireAppUser();
    const skill = await ownedDirector(String(input?.id ?? ""), user.clerkUserId);
    if (!skill) return { ok: false, error: "找不到 Director" };

    const sub = await getActiveSubscription(user.clerkUserId);
    if (!isSubscriptionActive(sub)) return { ok: false, error: "需要訂閱才能使用 AI 修改" };

    const message = String(input.message ?? "").trim();
    if (!message || message.length > MESSAGE_MAX) return { ok: false, error: "訊息過長" };

    const parsed = parseDraft(skill, {
      systemPrompt: input.draft?.systemPrompt,
      references: input.draft?.references,
    });
    if (!parsed.ok) return parsed;
    const draft = parsed.draft;

    if (chatRateLimited(skill.chat, new Date())) return { ok: false, error: "AI 修改太頻繁，請稍後再試" };

    let output: z.infer<typeof directorChatSchema>;
    try {
      ({ output } = await generateText({
        model: directorModel(),
        output: Output.object({ schema: directorChatSchema }),
        system: directorChatSystemPrompt(),
        prompt: directorChatUserPrompt({
          draft,
          history: (skill.chat || []).slice(-HISTORY_SENT),
          message,
        }),
      }));
    } catch (error) {
      console.error("director chat failed", error);
      return { ok: false, error: "AI 修改失敗，請再試一次" };
    }

    const applied = applyDirectorEdits(draft, output.edits);
    if (!applied.ok) return applied;
    if (applied.changedPaths.length === 0) return { ok: false, error: "AI 沒有修改任何檔案" };

    // One final edit per changed file (duplicates and no-op edits dropped).
    const edits: DirectorEdit[] = applied.changedPaths.map((path) => ({
      path,
      content:
        path === SKILL_PATH
          ? applied.draft.systemPrompt
          : applied.draft.references.find((ref) => ref.path === path)?.content ?? "",
    }));
    const now = new Date();
    const userMsg: DirectorChatMessage = { role: "user", content: message, createdAt: now };
    const assistantMsg: DirectorChatMessage = {
      role: "assistant",
      content: normalizeChatSummary(output.summary, applied.changedPaths.length),
      changedPaths: applied.changedPaths,
      createdAt: now,
    };

    const skills = await skillsCollection();
    const pushed = await skills.updateOne(
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
      changedPaths: applied.changedPaths,
      chat: toPublicDirectorChat(chat),
    };
  } catch (error) {
    return fail(error, "AI 修改失敗，請再試一次");
  }
}
