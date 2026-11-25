"use client";

// Teleport setup: source video, scene photo or scene text, optional mood, and the section.

import { useRef, useState } from "react";
import type { CanvasAspectRatio } from "@/model/canvas";
import type { TeleportGroupInput } from "@/service/canvas/scro-groups/teleport";
import { AspectRatioField } from "./aspect-ratio-field";
import { MediaPickField } from "./media-pick-field";
import { DIALOG_FIELD, DIALOG_LABEL, DIALOG_TEXTAREA, ScroDialogShell } from "./scro-dialog-shell";
import type { MediaPickOption } from "./scro-group-options";
import { SectionFields } from "./section-fields";
import { ComposedTextarea } from "@/app/app/canvas/nodes/composed-text-field";

type Props = {
  open: boolean;
  isZh: boolean;
  videoOptions: readonly MediaPickOption[];
  imageOptions: readonly MediaPickOption[];
  onCancel: () => void;
  onSubmit: (values: TeleportGroupInput) => void;
};

export function TeleportDialog({ open, isZh, videoOptions, imageOptions, onCancel, onSubmit }: Props) {
  const [video, setVideo] = useState<MediaPickOption | null>(null);
  const [sceneKind, setSceneKind] = useState<"image" | "text">("image");
  const [scenePhoto, setScenePhoto] = useState<MediaPickOption | null>(null);
  const sceneTextRef = useRef("");
  const [sceneText, setSceneTextState] = useState("");
  const setSceneText = (next: string) => {
    sceneTextRef.current = next;
    setSceneTextState(next);
  };
  const moodRef = useRef("");
  const [mood, setMoodState] = useState("");
  const setMood = (next: string) => {
    moodRef.current = next;
    setMoodState(next);
  };
  const [section, setSection] = useState({ start: 0, length: 6 });
  const [aspectRatio, setAspectRatio] = useState<CanvasAspectRatio>("9:16");

  const canSubmit =
    Boolean(video) && (sceneKind === "image" ? Boolean(scenePhoto) : sceneText.trim().length > 0);

  return (
    <ScroDialogShell
      open={open}
      isZh={isZh}
      title={isZh ? "建立 Teleport 換場" : "New Teleport"}
      description={
        isZh
          ? "會放入裁剪、換場渲染（$0.20/秒）和調色節點；用文字描述場景時會多一個 Seedream 場景圖節點（$0.14）。"
          : "Adds trim, teleport render ($0.20/s), and colour grade nodes. A text scene adds a Seedream scene plate ($0.14)."
      }
      submitLabel={isZh ? "建立節點" : "Add nodes"}
      canSubmit={canSubmit}
      onCancel={onCancel}
      onSubmit={() =>
        video &&
        onSubmit({
          video: video.ref,
          scene:
            sceneKind === "image" && scenePhoto
              ? { kind: "image", ref: scenePhoto.ref }
              : { kind: "text", text: sceneTextRef.current.trim() },
          ...(moodRef.current.trim() ? { mood: moodRef.current } : {}),
          sectionStart: section.start,
          sectionLength: section.length,
          aspectRatio,
        })
      }
    >
      <MediaPickField
        label={isZh ? "原片" : "Source video"}
        isZh={isZh}
        kind="video"
        options={videoOptions}
        value={video}
        onChange={setVideo}
      />
      <label className={DIALOG_LABEL}>
        {isZh ? "新場景" : "New scene"}
        <select
          value={sceneKind}
          onChange={(e) => setSceneKind(e.target.value as "image" | "text")}
          className={DIALOG_FIELD}
        >
          <option value="image">{isZh ? "用場景相片" : "Scene photo"}</option>
          <option value="text">{isZh ? "用文字描述" : "Describe in text"}</option>
        </select>
      </label>
      {sceneKind === "image" ? (
        <MediaPickField
          label={isZh ? "場景相片" : "Scene photo"}
          isZh={isZh}
          kind="image"
          options={imageOptions}
          value={scenePhoto}
          onChange={setScenePhoto}
        />
      ) : (
        <label className="block text-[11px] text-white/55">
          {isZh ? "場景描述" : "Scene description"}
          <ComposedTextarea
            value={sceneText}
            onValue={setSceneText}
            rows={2}
            placeholder={isZh ? "例如：夜晚下雨的東京街頭" : "e.g. A Tokyo street at night in the rain"}
            className={DIALOG_TEXTAREA}
          />
        </label>
      )}
      <label className="block text-[11px] text-white/55">
        {isZh ? "氣氛（選填）" : "Mood (optional)"}
        <ComposedTextarea value={mood} onValue={setMood} rows={2} className={DIALOG_TEXTAREA} />
      </label>
      <SectionFields isZh={isZh} start={section.start} length={section.length} onChange={setSection} />
      <AspectRatioField isZh={isZh} value={aspectRatio} onChange={setAspectRatio} />
    </ScroDialogShell>
  );
}
