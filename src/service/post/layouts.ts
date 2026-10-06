import {
  POSTER_FILLS,
  POSTER_LAYOUT_IDS,
  type PosterLayout,
  type PosterLayoutId,
  type PosterShapeLayer,
  type PosterTextLayer,
} from "@/model/post";

const ink = POSTER_FILLS.ink;
const sage = POSTER_FILLS.sage;

// One shape on the 2:3 poster frame.
function shape(
  id: string,
  kind: PosterShapeLayer["shape"],
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  extra?: Partial<PosterShapeLayer>,
): PosterShapeLayer {
  return { id, type: "shape", shape: kind, x, y, w, h, fill, ...extra };
}

// The sheet's wordmark slot. Empty until Post Designer fills it.
function headline(
  layout: PosterLayoutId,
  x: number,
  y: number,
  w: number,
  h: number,
  extra?: Partial<PosterTextLayer>,
): PosterTextLayer {
  return {
    id: `${layout}-headline`,
    type: "text",
    role: "headline",
    text: "",
    x,
    y,
    w,
    h,
    fontSize: Math.round((extra?.vertical ? w : h) * 0.72),
    fontWeight: 700,
    align: "left",
    color: ink,
    ...extra,
  };
}

function layout(id: PosterLayoutId, layers: PosterLayout["layers"]): PosterLayout {
  const index = POSTER_LAYOUT_IDS.indexOf(id) + 1;
  return {
    id,
    blueprintPath: `/posters/layouts/${String(index).padStart(2, "0")}.png`,
    layers,
  };
}

// Sixteen arrangements, row-major, matching the cropped blueprint sheet.
export const POSTER_LAYOUTS: PosterLayout[] = [
  layout("layout-01", [
    headline("layout-01", 80, 70, 640, 90),
    shape("layout-01-bar", "rect", 80, 175, 420, 18, ink),
    shape("layout-01-lines", "lineStack", 70, 280, 460, 980, ink, { axis: "horizontal" }),
    shape("layout-01-square", "rect", 580, 360, 320, 320, sage),
    shape("layout-01-lines-right", "lineStack", 560, 740, 360, 500, ink, { axis: "horizontal" }),
  ]),
  layout("layout-02", [
    headline("layout-02", 70, 60, 860, 90, { tracking: 18 }),
    shape("layout-02-bars", "lineStack", 80, 220, 280, 90, ink, { axis: "horizontal" }),
    shape("layout-02-rules", "lineStack", 80, 340, 220, 780, ink, { axis: "horizontal" }),
    shape("layout-02-disc", "quarterCircle", 380, 620, 620, 880, sage, { corner: "br" }),
  ]),
  layout("layout-03", [
    headline("layout-03", 70, 160, 140, 1100, { vertical: true, fontSize: 96 }),
    shape("layout-03-bar", "rect", 280, 180, 360, 36, ink),
    shape("layout-03-square", "rect", 280, 260, 320, 320, sage),
  ]),
  layout("layout-04", [
    headline("layout-04", 420, 70, 500, 90, { align: "right" }),
    shape("layout-04-lines", "lineStack", 520, 220, 400, 520, ink, { axis: "horizontal" }),
    shape("layout-04-peak", "triangle", 40, 860, 920, 560, sage),
  ]),
  layout("layout-05", [
    headline("layout-05", 70, 60, 520, 90),
    shape("layout-05-circle", "circle", 40, 280, 280, 280, sage),
    shape("layout-05-lines", "lineStack", 360, 260, 180, 1000, ink, { axis: "vertical" }),
    shape("layout-05-block", "rect", 620, 420, 300, 640, sage),
  ]),
  layout("layout-06", [
    shape("layout-06-dome", "semicircle", 120, 40, 760, 780, sage, { side: "top" }),
    headline("layout-06", 180, 160, 640, 100, { align: "center" }),
    shape("layout-06-lines", "lineStack", 220, 300, 560, 360, ink, { axis: "horizontal" }),
    shape("layout-06-bar", "rect", 140, 1320, 720, 48, ink),
  ]),
  layout("layout-07", [
    headline("layout-07", 80, 60, 700, 90),
    shape("layout-07-lines", "lineStack", 100, 200, 800, 520, ink, { axis: "horizontal" }),
    shape("layout-07-peak", "triangle", 60, 820, 880, 580, sage),
  ]),
  layout("layout-08", [
    headline("layout-08", 360, 50, 560, 90, { align: "right" }),
    shape("layout-08-lines", "lineStack", 300, 170, 620, 180, ink, { axis: "horizontal" }),
    shape("layout-08-circle", "circle", 70, 420, 220, 220, sage),
    shape("layout-08-column", "rect", 80, 680, 200, 620, sage),
    shape("layout-08-neck", "rect", 400, 430, 90, 180, sage),
    shape("layout-08-body", "rect", 330, 580, 230, 720, sage),
    shape("layout-08-r1", "rect", 640, 430, 260, 220, sage),
    shape("layout-08-r2", "rect", 640, 690, 260, 160, sage),
    shape("layout-08-r3", "rect", 640, 890, 220, 180, sage),
  ]),
  layout("layout-09", [
    headline("layout-09", 80, 50, 640, 90),
    shape("layout-09-lines", "lineStack", 80, 180, 620, 760, ink, { axis: "horizontal" }),
    shape("layout-09-dome", "semicircle", 40, 980, 920, 460, sage, { side: "bottom" }),
  ]),
  layout("layout-10", [
    headline("layout-10", 80, 50, 640, 90),
    shape("layout-10-lines", "lineStack", 80, 180, 520, 420, ink, { axis: "horizontal" }),
    shape("layout-10-tri", "triangle", 180, 640, 320, 260, sage),
    shape("layout-10-peak", "triangle", 40, 980, 920, 440, sage),
  ]),
  layout("layout-11", [
    headline("layout-11", 80, 40, 780, 420, { align: "center", fontSize: 120 }),
    shape("layout-11-a", "lineStack", 220, 520, 560, 140, ink, { axis: "horizontal" }),
    shape("layout-11-b", "lineStack", 300, 680, 400, 120, ink, { axis: "horizontal" }),
    shape("layout-11-c", "lineStack", 380, 820, 240, 100, ink, { axis: "horizontal" }),
    shape("layout-11-square", "rect", 420, 1000, 160, 160, sage),
  ]),
  layout("layout-12", [
    shape("layout-12-frame", "rect", 140, 80, 720, 520, ink),
    shape("layout-12-hole", "rect", 168, 108, 664, 464, POSTER_FILLS.canvas),
    headline("layout-12", 200, 240, 600, 120, { align: "center" }),
    shape("layout-12-circle", "circle", 360, 680, 280, 280, sage),
    shape("layout-12-lines", "lineStack", 180, 1020, 640, 360, ink, { axis: "horizontal" }),
  ]),
  layout("layout-13", [
    headline("layout-13", 40, 80, 120, 900, { vertical: true, fontSize: 80 }),
    shape("layout-13-col-a", "lineStack", 220, 80, 280, 780, ink, { axis: "horizontal" }),
    shape("layout-13-col-b", "lineStack", 540, 80, 280, 780, ink, { axis: "horizontal" }),
    shape("layout-13-blob", "blob", 480, 860, 520, 640, sage),
  ]),
  layout("layout-14", [
    shape("layout-14-field", "rect", 0, 0, 1000, 860, sage),
    headline("layout-14", 80, 220, 840, 110, { align: "center" }),
    shape("layout-14-bar", "rect", 140, 360, 720, 28, ink),
    shape("layout-14-lines-top", "lineStack", 140, 430, 720, 400, ink, { axis: "horizontal" }),
    shape("layout-14-lines-bottom", "lineStack", 140, 920, 720, 480, ink, { axis: "horizontal" }),
  ]),
  layout("layout-15", [
    headline("layout-15", 70, 50, 700, 90),
    shape("layout-15-a", "rect", 70, 220, 180, 180, sage),
    shape("layout-15-b", "rect", 280, 220, 180, 180, sage),
    shape("layout-15-c", "rect", 70, 430, 180, 180, sage),
    shape("layout-15-d", "rect", 280, 430, 180, 180, sage),
    shape("layout-15-e", "rect", 70, 640, 180, 180, sage),
    shape("layout-15-f", "rect", 280, 640, 180, 180, sage),
    shape("layout-15-lines", "lineStack", 540, 200, 380, 1100, ink, { axis: "horizontal" }),
  ]),
  layout("layout-16", [
    headline("layout-16", 80, 180, 840, 120, { align: "center" }),
    shape("layout-16-oval", "ellipse", 390, 400, 220, 360, sage),
    shape("layout-16-lines", "lineStack", 220, 820, 560, 220, ink, { axis: "horizontal" }),
  ]),
];

export function posterLayout(id: PosterLayoutId): PosterLayout {
  const found = POSTER_LAYOUTS.find((item) => item.id === id);
  if (!found) throw new Error(`未知海報版面 ${id}`);
  return found;
}
