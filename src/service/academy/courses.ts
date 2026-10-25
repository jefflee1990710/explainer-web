import { ObjectId, type Filter } from "mongodb";
import { academyCoursesCollection } from "@/dao";
import {
  createAcademyCourseInputSchema,
  updateAcademyCourseInputSchema,
  type AcademyCourse,
  type PublicAcademyCourse,
} from "@/model/academy-course";
import {
  assembleLessonMarkdown,
  lessonMediaReady,
  type LessonMediaUrls,
} from "@/service/academy/catalog/assemble";
import { ACADEMY_LESSONS } from "@/service/academy/catalog/lessons";
import lessonMediaJson from "@/service/academy/catalog/lesson-media.json";
import { deriveCourseExcerpt, slugifyAcademyCourse } from "@/service/academy/slug";

const lessonMedia = lessonMediaJson as Record<string, LessonMediaUrls>;

const STARTER_SLUG = "create-reels-that-grow-your-business";

const STARTER_MARKDOWN = `# Create Reels That Grow Your Business

Reels, Shorts, and TikToks are the cheapest way to put a face — or a virtual host — in front of people who do not know you yet. This lesson is the Scro playbook: one idea, one hook, one proof, one ask.

## What you will ship

By the end you can plan a 20–40 second reel that:

1. Stops the scroll in the first second
2. Teaches one useful thing
3. Makes a stranger follow or click

You do not need a crew. You need a locked character, a clear promise, and a repeatable format.

## The 4-beat reel

Every high-retention business reel is the same four beats.

| Beat | Time | Job |
| --- | --- | --- |
| Hook | 0–3s | Name the pain or the result. No logo. No hello. |
| Proof | 3–15s | Show the thing. One scene per idea. |
| Payoff | 15–30s | Deliver the tip, contrast, or product moment. |
| Ask | last 3–5s | Follow, save, comment, or visit the link. One ask only. |

Write the hook first. If the first line is weak, the rest of the video never plays.

## Hooks that grow followers

Say the outcome the viewer already wants.

- "Three product shots that make people tap the shop."
- "This is why your talking-head reel dies at second four."
- "I replaced my weekly photoshoot with one AI character."

Do not start with "Hi, welcome back to my channel." The algorithm has already decided.

## Formats that compound

Pick one format and repeat it three times a week. Familiarity is how a new face becomes a brand.

- **Hot take** — one opinion, one example, one CTA
- **Product UGC** — real packaging, one pain, one demo
- **Tutorial series** — "Day 1 / Day 2" so people subscribe for the next cut
- **Talking-head + B-roll** — face for trust, cutaways for proof

Scro locks the same face, wardrobe, and voice so every episode looks like the same creator.

## How to use Scro after this lesson

1. Create an AI Influencer and lock the look
2. Write a 20–40 second script with the 4-beat table
3. Approve keyframes before you spend credits on motion
4. Publish, then shoot the next episode in the same format

Save this course. The next lesson is just a new hook on the same skeleton.
`;

// Convert a MongoDB course document into a serializable DTO.
export function toPublicAcademyCourse(doc: AcademyCourse): PublicAcademyCourse {
  return {
    id: doc._id.toHexString(),
    slug: doc.slug,
    title: doc.title,
    excerpt: doc.excerpt?.trim() || deriveCourseExcerpt(doc.content),
    module: doc.module,
    content: doc.content,
    coverImage: doc.coverImage,
    published: doc.published,
    sortOrder: doc.sortOrder,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

// Hide the markdown body on public listing cards and locked lesson pages.
export function toAcademyCourseSummary(doc: AcademyCourse): PublicAcademyCourse {
  return {
    ...toPublicAcademyCourse(doc),
    content: "",
  };
}

async function ensureUniqueSlug(baseSlug: string, excludeId?: ObjectId): Promise<string> {
  const collection = await academyCoursesCollection();
  let candidate = baseSlug;
  let counter = 2;
  while (
    await collection.findOne(
      excludeId ? { slug: candidate, _id: { $ne: excludeId } } : { slug: candidate },
      { projection: { _id: 1 } },
    )
  ) {
    candidate = `${baseSlug}-${counter}`;
    counter += 1;
  }
  return candidate;
}

// Insert any catalog lesson that already has its two diagrams and clip.
export async function ensureAcademyLessons(): Promise<void> {
  const ready = ACADEMY_LESSONS.filter((lesson) => lessonMediaReady(lessonMedia[lesson.slug]));
  if (ready.length === 0) return;
  const collection = await academyCoursesCollection();
  const existing = await collection
    .find({ slug: { $in: ready.map((lesson) => lesson.slug) } }, { projection: { slug: 1 } })
    .toArray();
  const have = new Set(existing.map((doc) => doc.slug));
  for (const lesson of ready) {
    if (have.has(lesson.slug)) continue;
    const media = lessonMedia[lesson.slug];
    if (!lessonMediaReady(media)) continue;
    try {
      await createAcademyCourse({
        title: lesson.title,
        slug: lesson.slug,
        excerpt: lesson.excerpt,
        module: lesson.module,
        content: assembleLessonMarkdown(lesson, media),
        coverImage: media.image1,
        published: true,
        sortOrder: lesson.sortOrder,
      });
    } catch {
      // Another request may have inserted this slug first.
    }
  }
}

// Insert a starter reel-growth lesson when the catalog is still empty.
export async function ensureStarterAcademyCourse(): Promise<void> {
  const collection = await academyCoursesCollection();
  const existing = await collection.findOne({ slug: STARTER_SLUG }, { projection: { _id: 1 } });
  if (existing) return;
  const count = await collection.countDocuments();
  if (count > 0) return;
  const now = new Date();
  const doc: AcademyCourse = {
    _id: new ObjectId(),
    slug: STARTER_SLUG,
    title: "Create Reels That Grow Your Business",
    excerpt:
      "The 4-beat reel formula Scro uses to stop the scroll, teach one idea, and turn viewers into followers.",
    content: STARTER_MARKDOWN,
    published: true,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  };
  try {
    await collection.insertOne(doc);
  } catch {
    // Another request may have inserted the starter course first.
  }
}

export type CreateAcademyCourseParams = {
  title: string;
  slug?: string;
  excerpt?: string;
  module?: string;
  content: string;
  coverImage?: string;
  published?: boolean;
  sortOrder?: number;
};

export async function createAcademyCourse(
  raw: CreateAcademyCourseParams,
): Promise<{ ok: true; course: PublicAcademyCourse } | { ok: false; error: string }> {
  const parsed = createAcademyCourseInputSchema.safeParse(raw);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { ok: false, error: firstIssue?.message || "Invalid course payload" };
  }
  const data = parsed.data;
  const slug = await ensureUniqueSlug(slugifyAcademyCourse(data.slug || data.title));
  const now = new Date();
  const doc: AcademyCourse = {
    _id: new ObjectId(),
    slug,
    title: data.title,
    excerpt: data.excerpt || deriveCourseExcerpt(data.content),
    module: data.module || undefined,
    content: data.content,
    coverImage: data.coverImage || undefined,
    published: data.published ?? false,
    sortOrder: data.sortOrder ?? 0,
    createdAt: now,
    updatedAt: now,
  };
  const collection = await academyCoursesCollection();
  await collection.insertOne(doc);
  return { ok: true, course: toPublicAcademyCourse(doc) };
}

export type ListAcademyCoursesOptions = {
  includeUnpublished?: boolean;
};

export async function listAcademyCourses(
  options: ListAcademyCoursesOptions = {},
): Promise<PublicAcademyCourse[]> {
  await ensureAcademyLessons();
  await ensureStarterAcademyCourse();
  const filter: Filter<AcademyCourse> = {};
  if (!options.includeUnpublished) filter.published = true;
  const collection = await academyCoursesCollection();
  const docs = (await collection
    .find(filter)
    .sort({ sortOrder: 1, createdAt: -1 })
    .toArray()) as AcademyCourse[];
  return docs.map(toPublicAcademyCourse);
}

export async function listPublishedAcademySummaries(): Promise<PublicAcademyCourse[]> {
  const courses = await listAcademyCourses();
  return courses.map((course) => ({ ...course, content: "" }));
}

async function findAcademyCourseDoc(
  slugOrId: string,
  includeUnpublished = false,
): Promise<AcademyCourse | null> {
  const normalized = decodeURIComponent(slugOrId).trim();
  if (!normalized) return null;
  const collection = await academyCoursesCollection();
  const pubFilter = includeUnpublished ? {} : { published: true };
  const bySlug = (await collection.findOne({
    slug: normalized,
    ...pubFilter,
  })) as AcademyCourse | null;
  if (bySlug) return bySlug;
  if (ObjectId.isValid(normalized) && normalized.length === 24) {
    return (await collection.findOne({
      _id: new ObjectId(normalized),
      ...pubFilter,
    })) as AcademyCourse | null;
  }
  return null;
}

export async function getAcademyCourseBySlugOrId(
  slugOrId: string,
  includeUnpublished = false,
): Promise<PublicAcademyCourse | null> {
  const doc = await findAcademyCourseDoc(slugOrId, includeUnpublished);
  return doc ? toPublicAcademyCourse(doc) : null;
}

export async function getPublishedAcademySummary(
  slug: string,
): Promise<PublicAcademyCourse | null> {
  const course = await getAcademyCourseBySlugOrId(slug);
  if (!course) return null;
  return { ...course, content: "" };
}

export type UpdateAcademyCourseParams = {
  title?: string;
  slug?: string;
  excerpt?: string;
  module?: string;
  content?: string;
  coverImage?: string;
  published?: boolean;
  sortOrder?: number;
};

export async function updateAcademyCourseBySlugOrId(
  slugOrId: string,
  raw: UpdateAcademyCourseParams,
): Promise<
  { ok: true; course: PublicAcademyCourse } | { ok: false; error: string; notFound?: boolean }
> {
  const existing = await findAcademyCourseDoc(slugOrId, true);
  if (!existing) return { ok: false, error: "Course not found", notFound: true };
  const parsed = updateAcademyCourseInputSchema.safeParse(raw);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { ok: false, error: firstIssue?.message || "Invalid update payload" };
  }
  const data = parsed.data;
  const nextTitle = data.title ?? existing.title;
  const nextContent = data.content ?? existing.content;
  let nextSlug = existing.slug;
  if (data.slug !== undefined) {
    nextSlug = await ensureUniqueSlug(slugifyAcademyCourse(data.slug), existing._id);
  }
  const nextExcerpt =
    data.excerpt !== undefined
      ? data.excerpt || deriveCourseExcerpt(nextContent)
      : data.content !== undefined && !existing.excerpt
        ? deriveCourseExcerpt(nextContent)
        : existing.excerpt;
  const updatedDoc: AcademyCourse = {
    ...existing,
    slug: nextSlug,
    title: nextTitle,
    excerpt: nextExcerpt,
    module: data.module !== undefined ? data.module || undefined : existing.module,
    content: nextContent,
    coverImage: data.coverImage !== undefined ? data.coverImage || undefined : existing.coverImage,
    published: data.published ?? existing.published,
    sortOrder: data.sortOrder ?? existing.sortOrder,
    updatedAt: new Date(),
  };
  const collection = await academyCoursesCollection();
  await collection.updateOne(
    { _id: existing._id },
    {
      $set: {
        slug: updatedDoc.slug,
        title: updatedDoc.title,
        excerpt: updatedDoc.excerpt,
        module: updatedDoc.module,
        content: updatedDoc.content,
        coverImage: updatedDoc.coverImage,
        published: updatedDoc.published,
        sortOrder: updatedDoc.sortOrder,
        updatedAt: updatedDoc.updatedAt,
      },
    },
  );
  return { ok: true, course: toPublicAcademyCourse(updatedDoc) };
}

export async function deleteAcademyCourseBySlugOrId(
  slugOrId: string,
): Promise<{ ok: true; deletedSlug: string } | { ok: false; error: string; notFound?: boolean }> {
  const existing = await findAcademyCourseDoc(slugOrId, true);
  if (!existing) return { ok: false, error: "Course not found", notFound: true };
  const collection = await academyCoursesCollection();
  await collection.deleteOne({ _id: existing._id });
  return { ok: true, deletedSlug: existing.slug };
}
