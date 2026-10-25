import type { AcademyLessonDraft } from "@/service/academy/catalog/lessons";

export type LessonMediaUrls = {
  image1?: string;
  image2?: string;
  video?: string;
};

// True when a lesson has the two diagrams and the one explainer clip.
export function lessonMediaReady(media?: LessonMediaUrls): media is Required<LessonMediaUrls> {
  return Boolean(media?.image1 && media.image2 && media.video);
}

// Drop the media placeholders into the lesson markdown.
export function assembleLessonMarkdown(
  lesson: AcademyLessonDraft,
  media: Required<LessonMediaUrls>,
): string {
  return lesson.markdown
    .replaceAll("{{image1}}", `![${lesson.images[0].alt}](${media.image1})`)
    .replaceAll("{{image2}}", `![${lesson.images[1].alt}](${media.image2})`)
    .replaceAll("{{video}}", `![${lesson.title} video](${media.video})`);
}
