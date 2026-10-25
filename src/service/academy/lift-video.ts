import { isAcademyVideoUrl } from "@/service/academy/media";

export type LiftedAcademyLessonVideo = {
  src?: string;
  alt?: string;
  body: string;
};

// Pull the first lesson clip out of markdown so the course page can pin it on top.
export function liftAcademyLessonVideo(content: string): LiftedAcademyLessonVideo {
  const source = content.replace(/\r\n/g, "\n");
  const video = /!\[([^\]]*)\]\(([^)\s]+)\)/g;
  let match: RegExpExecArray | null;
  let found: { alt: string; src: string; start: number; end: number } | undefined;
  while ((match = video.exec(source))) {
    if (!isAcademyVideoUrl(match[2])) continue;
    found = {
      alt: match[1].trim(),
      src: match[2].trim(),
      start: match.index,
      end: match.index + match[0].length,
    };
    break;
  }
  if (!found) return { body: content };

  let before = source.slice(0, found.start);
  const after = source.slice(found.end);
  // Drop the leftover heading that used to sit above the mid-lesson clip.
  before = before.replace(/(?:\n|^)#{1,6}\s+(?:Watch the idea|Watch this|Lesson video)\s*$/i, "\n");

  const body = `${before.trimEnd()}\n\n${after.trimStart()}`.replace(/\n{3,}/g, "\n\n").trim();
  return {
    src: found.src,
    alt: found.alt,
    body: body ? `${body}\n` : "",
  };
}
