import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { generateText, Output } from "ai";
import { z } from "zod";
import { directorsCollection, skillsCollection } from "@/dao";
import type { IDirectorBehavior } from "@/model/director";
import type { DirectorChatMessage, Skill } from "@/model/skill";
import { requireAppUser } from "@/service/auth";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import { loadDirectorImageParts } from "@/service/character/cast-prompt";
import { analyzeReferenceVideoToDirector } from "@/service/director/analyze-reference-video";
import { customSkillSlug } from "@/service/director/behavior-slug";
import { getDirectorById, getDirectorBySlug } from "@/service/director/catalog";
import { directorAsSkill } from "@/service/director/catalog-skill";
import { chatRateLimited } from "@/service/director/chat-rate-limit";
import {
  compileDirectorPrompts,
  DEFAULT_CUSTOM_DIRECTOR_BEHAVIOR,
  normalizeDirectorBehavior,
} from "@/service/director/compile-director-prompts";
import {
  directorChatSystemPrompt,
  directorChatUserPrompt,
  normalizeChatSummary,
} from "@/service/director/director-chat-prompt";
import {
  applyDirectorEdits,
  draftFieldValue,
  parseDraft,
  type DirectorDraft,
  type DirectorEdit,
  type DraftField,
} from "@/service/director/director-edits";
import { directorModel } from "@/service/director/model";
import { emptyPerformance } from "@/service/director/performance";
import { emptyProfile, parseSystemProfile } from "@/service/director/profile";
import {
  customSelectableFilter,
  isHiddenPickerSkill,
  systemSelectableFilter,
} from "@/service/director/selectable-skills";
import {
  toPublicDirector,
  toPublicDirectorChat,
  type PublicDirector,
} from "@/presentation/serialize";

const TITLE_MAX = 60;
const DESCRIPTION_MAX = 300;
const MESSAGE_MAX = 2000;
const HISTORY_SENT = 20;
const CHAT_KEPT = 100;

const directorChatSchema = z.object({
  summary: z.string(),
  edits: z.array(z.object({ field: z.string(), content: z.string() })),
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

async function ownedDirector(id: string, clerkUserId: string): Promise<Skill | null> {
  if (!ObjectId.isValid(id)) return null;
  const directors = await directorsCollection();
  return (await directors.findOne({
    _id: new ObjectId(id),
    ...customSelectableFilter(clerkUserId),
  })) as Skill | null;
}

// Detail-page read: checks built-in catalog first, then legacy skills, then the user's `directors` collection.
export async function loadDirectorForUser(clerkUserId: string, id: string): Promise<Skill | null> {
  if (!ObjectId.isValid(id)) return null;
  const fromCatalog = getDirectorById(id);
  if (fromCatalog && !isHiddenPickerSkill(fromCatalog)) {
    return directorAsSkill(fromCatalog);
  }
  const oid = new ObjectId(id);
  const directors = await directorsCollection();
  const custom = (await directors.findOne({
    ...customSelectableFilter(clerkUserId),
    _id: oid,
  })) as Skill | null;
  if (custom) return custom;

  const skills = await skillsCollection();
  const system = (await skills.findOne({
    ...systemSelectableFilter(),
    _id: oid,
  })) as Skill | null;
  return system;
}

export async function toPublicDirectorWithPreview(skill: Skill): Promise<PublicDirector> {
  if (skill.previewUrl || !skill.baseSlug) return toPublicDirector(skill);
  const fromCatalog = getDirectorBySlug(skill.baseSlug);
  if (fromCatalog?.previewUrl) return toPublicDirector(skill, fromCatalog.previewUrl);
  const skills = await skillsCollection();
  const template = await skills.findOne({
    slug: skill.baseSlug,
    ownerClerkUserId: { $exists: false },
  });
  return toPublicDirector(skill, template?.previewUrl);
}

// Create a 100% standalone custom director in `directorsCollection()` — either deep-copied from a template or blank.
export async function createDirectorAction(input: {
  templateSlug?: string;
  title: string;
  description: string;
  suggestedUseCase?: string;
}): Promise<CreateDirectorResult> {
  try {
    const user = await requireAppUser();
    const meta = parseMeta(input?.title, input?.description);
    if (!meta.ok) return meta;

    const rawSlug = String(input?.templateSlug ?? "").trim();
    const isBlank = !rawSlug || rawSlug === "__blank__";

    let sourceSkill: Skill | null = null;
    if (!isBlank) {
      const catalogTemplate = getDirectorBySlug(rawSlug);
      if (catalogTemplate && !isHiddenPickerSkill(catalogTemplate)) {
        sourceSkill = directorAsSkill(catalogTemplate);
      } else {
        const skills = await skillsCollection();
        const dbTemplate = (await skills.findOne({
          slug: rawSlug,
          ownerClerkUserId: { $exists: false },
          isActive: true,
        })) as Skill | null;
        if (dbTemplate && !isHiddenPickerSkill(dbTemplate)) {
          sourceSkill = dbTemplate;
        }
      }
      if (!sourceSkill) return { ok: false, error: "找不到模板" };
    }

    const _id = new ObjectId();
    const slug = customSkillSlug(_id);
    const now = new Date();

    const copiedProfile = sourceSkill?.profile
      ? { ...parseSystemProfile(sourceSkill.profile) }
      : sourceSkill?.customProfile
        ? { ...emptyProfile(), ...sourceSkill.customProfile }
        : emptyProfile();

    const copiedBehavior = normalizeDirectorBehavior(
      sourceSkill?.behavior,
      DEFAULT_CUSTOM_DIRECTOR_BEHAVIOR,
    );

    const copiedPerformance = sourceSkill?.performance?.en
      ? { ...sourceSkill.performance.en }
      : copiedBehavior.speechMode === "lip-sync"
        ? emptyPerformance()
        : undefined;

    const compiled = compileDirectorPrompts({
      slug,
      title: meta.title,
      description: meta.description,
      suggestedUseCase: input.suggestedUseCase || sourceSkill?.suggestedUseCase,
      behavior: copiedBehavior,
      profile: copiedProfile,
      performance: copiedPerformance,
      extraInstructions: "",
    });

    const directors = await directorsCollection();
    await directors.insertOne({
      _id,
      slug,
      title: meta.title,
      description: meta.description,
      suggestedUseCase:
        input.suggestedUseCase?.trim() ||
        sourceSkill?.suggestedUseCase ||
        copiedProfile.bestFor ||
        meta.description,
      // 100% standalone copy: carries its own compiled systemPrompt, references, behavior, and profile.
      systemPrompt: sourceSkill?.systemPrompt
        ? `${sourceSkill.systemPrompt}\n\n${compiled.systemPrompt}`
        : compiled.systemPrompt,
      references:
        sourceSkill?.references && sourceSkill.references.length > 0
          ? sourceSkill.references.map((r) => ({ ...r }))
          : compiled.references,
      behavior: copiedBehavior,
      profile: copiedProfile,
      customProfile: copiedProfile,
      extraInstructions: "",
      ...(copiedPerformance
        ? {
            performance: {
              en: copiedPerformance,
              yue: sourceSkill?.performance?.yue ?? copiedPerformance,
            },
            customPerformance: copiedPerformance,
          }
        : {}),
      inputSchema: sourceSkill?.inputSchema
        ? {
            ...sourceSkill.inputSchema,
            aspectRatios: [...sourceSkill.inputSchema.aspectRatios],
            durationPresets: [...sourceSkill.inputSchema.durationPresets],
          }
        : {
            requiresSource: true,
            aspectRatios: ["16:9", "9:16", "1:1"],
            durationPresets: ["micro", "short", "punchy", "full"],
            optionalCharacterImage: true,
          },
      higgsfieldDefaults: sourceSkill?.higgsfieldDefaults
        ? { ...sourceSkill.higgsfieldDefaults }
        : {
            imageModel: "alibaba/qwen-image-3/text-to-image",
            imageQuality: "medium",
            imageResolution: "1k",
            videoModel: "minimax/h3/image-to-video",
          },
      ...(sourceSkill?.previewUrl ? { previewUrl: sourceSkill.previewUrl } : {}),
      isActive: true,
      sortOrder: sourceSkill?.sortOrder ?? 50,
      ownerClerkUserId: user.clerkUserId,
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

// Analyze a reference video / IG Reel URL or uploaded MP4 file and create a standalone custom director.
export async function createDirectorFromReferenceVideoAction(
  formData: FormData,
): Promise<CreateDirectorResult> {
  try {
    const user = await requireAppUser();
    const videoUrl = String(formData.get("videoUrl") ?? "").trim();
    const titleHint = String(formData.get("title") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();
    const file = formData.get("file");

    let videoBytes: Uint8Array | undefined;
    let mimeType = "video/mp4";
    if (file instanceof File && file.size > 0) {
      if (file.size > 40 * 1024 * 1024) {
        return { ok: false, error: "參考影片檔案請細於 40MB" };
      }
      videoBytes = new Uint8Array(await file.arrayBuffer());
      mimeType = file.type || "video/mp4";
    }

    const blueprint = await analyzeReferenceVideoToDirector({
      videoUrl,
      videoBytes,
      mimeType,
      titleHint,
      notes,
    });

    const _id = new ObjectId();
    const slug = customSkillSlug(_id);
    const now = new Date();
    const compiled = compileDirectorPrompts({
      slug,
      title: blueprint.title,
      description: blueprint.description,
      suggestedUseCase: blueprint.suggestedUseCase,
      behavior: blueprint.behavior,
      profile: blueprint.profile,
      performance: blueprint.performance,
      extraInstructions: blueprint.extraInstructions,
    });

    const directors = await directorsCollection();
    await directors.insertOne({
      _id,
      slug,
      title: blueprint.title,
      description: blueprint.description,
      suggestedUseCase: blueprint.suggestedUseCase,
      systemPrompt: compiled.systemPrompt,
      references: compiled.references,
      behavior: blueprint.behavior,
      profile: blueprint.profile,
      customProfile: blueprint.profile,
      extraInstructions: blueprint.extraInstructions,
      ...(blueprint.performance
        ? {
            performance: { en: blueprint.performance, yue: blueprint.performance },
            customPerformance: blueprint.performance,
          }
        : {}),
      inputSchema: {
        requiresSource: !blueprint.behavior.requiresSpokenScript,
        aspectRatios: ["16:9", "9:16", "1:1"],
        durationPresets: ["micro", "short", "punchy", "full"],
        optionalCharacterImage: true,
      },
      higgsfieldDefaults: {
        imageModel: "alibaba/qwen-image-3/text-to-image",
        imageQuality: "medium",
        imageResolution: "1k",
        videoModel: "minimax/h3/image-to-video",
      },
      isActive: true,
      sortOrder: 50,
      ownerClerkUserId: user.clerkUserId,
      chat: [],
      createdAt: now,
      updatedAt: now,
    });

    const id = _id.toHexString();
    revalidateDirector(id);
    return { ok: true, id };
  } catch (error) {
    return fail(error, "分析參考影片建立導演失敗");
  }
}

// Save name, description, behavior switches, profile fields, performance slots, and extra instructions of a standalone custom director.
export async function saveDirectorAction(input: {
  id: string;
  title: string;
  description: string;
  suggestedUseCase?: string;
  behavior?: Partial<IDirectorBehavior>;
  customProfile: DirectorDraft["customProfile"];
  extraInstructions: string;
  customPerformance?: DirectorDraft["customPerformance"];
}): Promise<SaveDirectorResult> {
  try {
    const user = await requireAppUser();
    const skill = await ownedDirector(String(input?.id ?? ""), user.clerkUserId);
    if (!skill) return { ok: false, error: "找不到 Director" };
    const meta = parseMeta(input.title, input.description);
    if (!meta.ok) return meta;
    const parsed = parseDraft({
      customProfile: input.customProfile,
      extraInstructions: input.extraInstructions,
      customPerformance: input.customPerformance,
      behavior: input.behavior ?? skill.behavior,
    });
    if (!parsed.ok) return parsed;

    const nextBehavior = normalizeDirectorBehavior(
      input.behavior ?? parsed.draft.behavior ?? skill.behavior,
      skill.behavior ?? DEFAULT_CUSTOM_DIRECTOR_BEHAVIOR,
    );
    const nextPerf =
      parsed.draft.customPerformance ??
      skill.customPerformance ??
      (nextBehavior.speechMode === "lip-sync" ? emptyPerformance() : undefined);

    const compiled = compileDirectorPrompts({
      slug: skill.slug,
      title: meta.title,
      description: meta.description,
      suggestedUseCase: input.suggestedUseCase ?? skill.suggestedUseCase,
      behavior: nextBehavior,
      profile: parsed.draft.customProfile,
      performance: nextPerf,
      extraInstructions: parsed.draft.extraInstructions,
    });

    const directors = await directorsCollection();
    const updated = (await directors.findOneAndUpdate(
      { _id: skill._id, ownerClerkUserId: user.clerkUserId, isActive: true },
      {
        $set: {
          title: meta.title,
          description: meta.description,
          suggestedUseCase:
            input.suggestedUseCase?.trim() ||
            parsed.draft.customProfile.bestFor ||
            meta.description,
          behavior: nextBehavior,
          profile: parsed.draft.customProfile,
          customProfile: parsed.draft.customProfile,
          extraInstructions: parsed.draft.extraInstructions,
          systemPrompt: compiled.systemPrompt,
          references: compiled.references,
          ...(nextPerf
            ? {
                performance: {
                  en: nextPerf,
                  yue: skill.performance?.yue ?? nextPerf,
                },
                customPerformance: nextPerf,
              }
            : {}),
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
    const directors = await directorsCollection();
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
    if (!draft.customPerformance && skill.customPerformance) {
      draft.customPerformance = { ...skill.customPerformance };
    }

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
        system: directorChatSystemPrompt(draft),
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

    const directors = await directorsCollection();
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
