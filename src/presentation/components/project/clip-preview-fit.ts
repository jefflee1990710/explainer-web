import type { AspectRatio } from "@/model/project";

export const PREVIEW_START_FLEX = 1;
export const PREVIEW_VIDEO_FLEX = 2.5;
export const PREVIEW_END_FLEX = 1;
export const PREVIEW_FLEX_SUM = PREVIEW_START_FLEX + PREVIEW_VIDEO_FLEX + PREVIEW_END_FLEX;

export type PreviewBox = { width: number; height: number };

export type PreviewStageFit = {
  start: PreviewBox;
  video: PreviewBox;
  end: PreviewBox;
  rowWidth: number;
  rowHeight: number;
};

function aspectWh(aspect: AspectRatio) {
  if (aspect === "16:9") return { w: 16, h: 9 };
  if (aspect === "9:16") return { w: 9, h: 16 };
  return { w: 1, h: 1 };
}

// Contain start | video | end in the preview pane. Tall 9:16 shrinks width
// instead of overflowing; wide 16:9 uses the pane width.
export function previewStageFit(input: {
  aspectRatio: AspectRatio;
  containerWidth: number;
  containerHeight: number;
  gap?: number;
  caption?: number;
}): PreviewStageFit {
  const gap = input.gap ?? 16;
  const caption = input.caption ?? 28;
  const { w: aw, h: ah } = aspectWh(input.aspectRatio);
  const gaps = gap * 2;
  const fromHeight = Math.max(0, input.containerHeight - caption) * (aw / ah);
  const fromWidth = Math.max(0, input.containerWidth - gaps) / PREVIEW_FLEX_SUM;
  const unitW = Math.min(fromHeight, fromWidth);
  const mediaH = unitW * (ah / aw);
  return {
    start: { width: unitW * PREVIEW_START_FLEX, height: mediaH },
    video: { width: unitW * PREVIEW_VIDEO_FLEX, height: mediaH },
    end: { width: unitW * PREVIEW_END_FLEX, height: mediaH },
    rowWidth: unitW * PREVIEW_FLEX_SUM + gaps,
    rowHeight: mediaH + caption,
  };
}
