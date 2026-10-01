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

// Side stills are a fraction of the clip height so the clip can grow.
// Landscape frames are wide, so they take a smaller share and the 16:9 clip gets taller.
const PORTRAIT_SIDE_SCALE = 0.78;
const LANDSCAPE_SIDE_SCALE = 0.32;

function aspectWh(aspect: AspectRatio) {
  if (aspect === "16:9") return { w: 16, h: 9 };
  if (aspect === "9:16") return { w: 9, h: 16 };
  return { w: 1, h: 1 };
}

// Clip keeps its real aspect and is taller than the side stills.
// Width and height both stay inside the pane.
function fitHero(input: {
  containerWidth: number;
  containerHeight: number;
  gap: number;
  caption: number;
  aw: number;
  ah: number;
  sideScale: number;
}): PreviewStageFit {
  const gaps = input.gap * 2;
  const availW = Math.max(0, input.containerWidth - gaps);
  const availH = Math.max(0, input.containerHeight - input.caption);
  const widthUnits = input.sideScale * 2 + 1;
  let videoW = widthUnits > 0 ? availW / widthUnits : 0;
  let videoH = input.aw > 0 ? videoW * (input.ah / input.aw) : 0;
  if (videoH > availH) {
    videoH = availH;
    videoW = input.ah > 0 ? videoH * (input.aw / input.ah) : 0;
  }
  const sideH = videoH * input.sideScale;
  const sideW = input.ah > 0 ? sideH * (input.aw / input.ah) : 0;
  return {
    start: { width: sideW, height: sideH },
    video: { width: videoW, height: videoH },
    end: { width: sideW, height: sideH },
    rowWidth: sideW * 2 + videoW + gaps,
    rowHeight: videoH + input.caption,
  };
}

// Contain start | video | end in the preview pane. 9:16 and 16:9 clips keep
// their real aspect and grow taller than the side stills.
export function previewStageFit(input: {
  aspectRatio: AspectRatio;
  containerWidth: number;
  containerHeight: number;
  gap?: number;
  caption?: number;
}): PreviewStageFit {
  const gap = input.gap ?? 16;
  const caption = input.caption ?? 28;
  if (input.aspectRatio === "9:16" || input.aspectRatio === "16:9") {
    const { w: aw, h: ah } = aspectWh(input.aspectRatio);
    return fitHero({
      containerWidth: input.containerWidth,
      containerHeight: input.containerHeight,
      gap,
      caption,
      aw,
      ah,
      sideScale: input.aspectRatio === "9:16" ? PORTRAIT_SIDE_SCALE : LANDSCAPE_SIDE_SCALE,
    });
  }
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
