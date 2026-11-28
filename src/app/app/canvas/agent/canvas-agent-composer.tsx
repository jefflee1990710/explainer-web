"use client";

// Text box + send button for the canvas agent. Enter sends, Shift+Enter adds a line.
// A photo can be picked with the add button or dropped onto the box.

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Plus, X } from "lucide-react";
import { uploadCanvasMediaFile } from "@/app/app/canvas/workspace/upload-canvas-media";
import { Spinner } from "@/presentation/components/spinner";
import { ComposedTextarea } from "@/app/app/canvas/nodes/composed-text-field";
import type { CanvasAgentCopy } from "@/app/app/canvas/agent/canvas-agent-copy";

const MESSAGE_MAX = 2000;
const MAX_IMAGES = 4;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

type Attachment = { id: string; file: File; previewUrl: string };

function asImageFile(file: File): File | null {
  if (IMAGE_TYPES.has(file.type)) return file;
  const match = /\.(png|jpe?g|webp)$/i.exec(file.name);
  if (!match) return null;
  if (file.type && file.type !== "application/octet-stream") return null;
  const ext = match[1]?.toLowerCase() ?? "";
  const type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  return new File([file], file.name, { type });
}

export function CanvasAgentComposer({
  copy,
  busy,
  onSend,
}: {
  copy: CanvasAgentCopy;
  busy: boolean;
  onSend: (text: string, imageUrls: string[]) => void;
}) {
  const textRef = useRef("");
  const fileRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const sendingRef = useRef(false);
  const attachmentsRef = useRef<Attachment[]>([]);
  const [input, setInputState] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState("");

  const setInput = (next: string) => {
    textRef.current = next;
    setInputState(next);
  };
  const waiting = busy || uploading;
  const canSend = !waiting && (input.trim().length > 0 || attachments.length > 0);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    return () => {
      for (const item of attachmentsRef.current) URL.revokeObjectURL(item.previewUrl);
    };
  }, []);

  function addFiles(list: FileList | readonly File[]) {
    if (waiting || sendingRef.current) return;
    const images = [...list].map(asImageFile).filter((file): file is File => file !== null);
    if (images.length === 0) {
      if (list.length > 0) setLocalError(copy.imageOnly);
      return;
    }
    const room = MAX_IMAGES - attachmentsRef.current.length;
    if (room <= 0 || images.length > room) setLocalError(copy.imageLimit);
    else setLocalError("");
    const accepted = images.slice(0, Math.max(0, room)).map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    if (accepted.length === 0) return;
    const next = [...attachmentsRef.current, ...accepted];
    attachmentsRef.current = next;
    setAttachments(next);
  }

  function removeAttachment(id: string) {
    const hit = attachmentsRef.current.find((item) => item.id === id);
    if (hit) URL.revokeObjectURL(hit.previewUrl);
    const next = attachmentsRef.current.filter((item) => item.id !== id);
    attachmentsRef.current = next;
    setAttachments(next);
    setLocalError("");
  }

  async function submit() {
    const text = textRef.current.trim();
    const files = attachmentsRef.current;
    if (sendingRef.current || waiting || (!text && files.length === 0)) return;
    setLocalError("");
    sendingRef.current = true;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const item of files) {
        const res = await uploadCanvasMediaFile(item.file);
        if (!res.ok) {
          setLocalError(res.error);
          return;
        }
        if (res.mediaKind !== "image") {
          setLocalError(copy.imageOnly);
          return;
        }
        urls.push(res.url);
      }
      for (const item of files) URL.revokeObjectURL(item.previewUrl);
      attachmentsRef.current = [];
      setAttachments([]);
      onSend(text, urls);
      setInput("");
    } catch {
      setLocalError(copy.imageFailed);
    } finally {
      sendingRef.current = false;
      setUploading(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      onDragEnter={(event) => {
        if (!Array.from(event.dataTransfer.types).includes("Files")) return;
        event.preventDefault();
        dragDepth.current += 1;
        setDragging(true);
      }}
      onDragOver={(event) => {
        if (!Array.from(event.dataTransfer.types).includes("Files")) return;
        event.preventDefault();
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        addFiles(event.dataTransfer.files);
      }}
      className={`flex shrink-0 flex-col gap-2 border-t border-white/8 p-2.5 ${
        dragging ? "bg-[#c6f24b]/8 ring-1 ring-inset ring-[#c6f24b]/70" : ""
      }`}
    >
      {dragging ? <p className="text-center text-[12px] text-[#c6f24b]">{copy.dropImage}</p> : null}
      {attachments.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {attachments.map((item) => (
            <span key={item.id} className="relative h-14 w-14">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview, not a remote asset */}
              <img src={item.previewUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
              <button
                type="button"
                aria-label={copy.removeImage}
                title={copy.removeImage}
                disabled={waiting}
                onClick={() => removeAttachment(item.id)}
                className="absolute -right-1 -top-1 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-[#11141b] text-white ring-1 ring-white/30 disabled:opacity-40"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      {localError ? (
        <p role="alert" className="text-[12px] leading-4 text-rose-300">
          {localError}
        </p>
      ) : null}
      <div className="flex items-end gap-2">
        <button
          type="button"
          aria-label={copy.addImage}
          title={attachments.length >= MAX_IMAGES ? copy.imageLimit : copy.addImage}
          disabled={waiting || attachments.length >= MAX_IMAGES}
          onClick={() => fileRef.current?.click()}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[10px] border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files) addFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <ComposedTextarea
          rows={4}
          maxLength={MESSAGE_MAX}
          value={input}
          disabled={waiting}
          aria-label={copy.placeholder}
          placeholder={copy.placeholder}
          onValue={setInput}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              void submit();
            }
          }}
          className="max-h-40 min-h-24 min-w-0 flex-1 resize-none overflow-y-auto rounded-[10px] border border-white/10 bg-[#0b0e14] px-3 py-2 text-[13px] leading-5 text-white placeholder:text-white/35 focus:border-[#c6f24b]/60 focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label={copy.send}
          title={copy.send}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[10px] bg-[#c6f24b] text-[#11141b] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {waiting ? <Spinner className="h-3.5 w-3.5" /> : <ArrowUp className="h-4 w-4" />}
        </button>
      </div>
    </form>
  );
}
