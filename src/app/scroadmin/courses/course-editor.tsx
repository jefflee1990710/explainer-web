"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import type { PublicAcademyCourse } from "@/model/academy-course";
import {
  createAcademyCourseAction,
  updateAcademyCourseAction,
} from "@/presentation/actions/academy";
import { MarkdownContent } from "@/presentation/components/markdown-content";
import { useI18n } from "@/presentation/components/i18n-provider";
import { MediaUploader } from "@/app/scroadmin/courses/media-uploader";

type EditorState = {
  title: string;
  slug: string;
  excerpt: string;
  module: string;
  content: string;
  coverImage: string;
  published: boolean;
  sortOrder: string;
};

function emptyState(): EditorState {
  return {
    title: "",
    slug: "",
    excerpt: "",
    module: "",
    content: "# New lesson\n\nWrite the markdown here.\n",
    coverImage: "",
    published: false,
    sortOrder: "0",
  };
}

function fromCourse(course: PublicAcademyCourse): EditorState {
  return {
    title: course.title,
    slug: course.slug,
    excerpt: course.excerpt,
    module: course.module || "",
    content: course.content,
    coverImage: course.coverImage || "",
    published: course.published,
    sortOrder: String(course.sortOrder),
  };
}

// Split markdown editor: metadata + Blob media insert on the left, live preview on the right.
export function CourseEditor({ course }: { course?: PublicAcademyCourse }) {
  const { t } = useI18n();
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [state, setState] = useState<EditorState>(course ? fromCourse(course) : emptyState());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function patch(partial: Partial<EditorState>) {
    setState((current) => ({ ...current, ...partial }));
  }

  function insertMarkdown(markdown: string, coverUrl?: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      patch({
        content: `${state.content}${markdown}`,
        coverImage: state.coverImage || coverUrl || "",
      });
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = `${state.content.slice(0, start)}${markdown}${state.content.slice(end)}`;
    patch({
      content: next,
      coverImage: state.coverImage || coverUrl || "",
    });
    requestAnimationFrame(() => {
      textarea.focus();
      const caret = start + markdown.length;
      textarea.setSelectionRange(caret, caret);
    });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const payload = {
      title: state.title,
      slug: state.slug || undefined,
      excerpt: state.excerpt || undefined,
      module: state.module || undefined,
      content: state.content,
      coverImage: state.coverImage || undefined,
      published: state.published,
      sortOrder: Number(state.sortOrder) || 0,
    };
    const result = course
      ? await updateAcademyCourseAction(course.id, payload)
      : await createAcademyCourseAction(payload);
    setBusy(false);
    if (!result.ok) {
      setError(
        result.error === "forbidden" || result.error === "unauthenticated"
          ? t("scroAdmin.errorForbidden")
          : "error" in result
            ? result.error
            : t("scroAdmin.errorGeneric"),
      );
      return;
    }
    setMessage(course ? t("scroAdmin.saved") : t("scroAdmin.created"));
    router.push(`/scroadmin/courses/${result.course.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/scroadmin/courses" className="text-sm font-medium text-zinc-600 hover:text-[#12141c]">
          {t("scroAdmin.back")}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {course?.published ? (
            <Link
              href={`/academy/${encodeURIComponent(course.slug)}`}
              className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold"
            >
              {t("scroAdmin.viewPublic")}
            </Link>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-10 items-center rounded-full bg-[#12141c] px-5 py-2 text-sm font-semibold text-[#c6f24b] disabled:opacity-50"
          >
            {busy
              ? course
                ? t("scroAdmin.saving")
                : t("scroAdmin.creating")
              : course
                ? t("scroAdmin.save")
                : t("scroAdmin.create")}
          </button>
        </div>
      </div>

      {message ? <p className="text-sm font-medium text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

      <div className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-5 md:grid-cols-2">
        <label className="block text-sm">
          <span className="font-semibold">{t("scroAdmin.titleLabel")}</span>
          <input
            required
            value={state.title}
            onChange={(event) => patch({ title: event.target.value })}
            className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#12141c]"
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">{t("scroAdmin.slugLabel")}</span>
          <input
            value={state.slug}
            onChange={(event) => patch({ slug: event.target.value })}
            className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#12141c]"
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">{t("scroAdmin.moduleLabel")}</span>
          <input
            value={state.module}
            onChange={(event) => patch({ module: event.target.value })}
            className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#12141c]"
          />
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="font-semibold">{t("scroAdmin.excerptLabel")}</span>
          <textarea
            value={state.excerpt}
            onChange={(event) => patch({ excerpt: event.target.value })}
            rows={2}
            className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#12141c]"
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">{t("scroAdmin.coverUrlLabel")}</span>
          <input
            value={state.coverImage}
            onChange={(event) => patch({ coverImage: event.target.value })}
            className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#12141c]"
          />
        </label>
        <div className="flex flex-wrap items-end gap-4">
          <label className="block text-sm">
            <span className="font-semibold">{t("scroAdmin.sortOrderLabel")}</span>
            <input
              type="number"
              value={state.sortOrder}
              onChange={(event) => patch({ sortOrder: event.target.value })}
              className="mt-1.5 w-28 rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#12141c]"
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={state.published}
              onChange={(event) => patch({ published: event.target.checked })}
              className="h-4 w-4 accent-[#12141c]"
            />
            {t("scroAdmin.publishedLabel")}
          </label>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">{t("scroAdmin.contentLabel")}</p>
          </div>
          <MediaUploader onInsert={insertMarkdown} />
          <textarea
            ref={textareaRef}
            required
            value={state.content}
            onChange={(event) => patch({ content: event.target.value })}
            rows={22}
            className="mt-3 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 font-mono text-sm leading-6 outline-none focus:border-[#12141c]"
          />
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="mb-4 text-sm font-semibold">{t("scroAdmin.preview")}</p>
          {state.coverImage ? (
            <img
              src={state.coverImage}
              alt=""
              className="mb-5 aspect-16/10 w-full rounded-xl object-cover"
            />
          ) : null}
          <h2 className="mb-4 font-display text-2xl font-bold">{state.title || t("scroAdmin.newCourse")}</h2>
          <MarkdownContent content={state.content} />
        </div>
      </div>
    </form>
  );
}
