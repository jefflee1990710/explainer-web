// Client-safe poster geometry. Do not import Mongo or zod from this file.

export const POSTER_CANVAS = { width: 1000, height: 1500 } as const;

export const POSTER_FILLS = {
  canvas: "#FFFFFF",
  ink: "#1A1A1A",
  // Scro lime. The field name stays sage so existing layer ids keep compiling.
  sage: "#C6F24B",
} as const;

export const POSTER_LAYOUT_IDS = [
  "layout-01",
  "layout-02",
  "layout-03",
  "layout-04",
  "layout-05",
  "layout-06",
  "layout-07",
  "layout-08",
  "layout-09",
  "layout-10",
  "layout-11",
  "layout-12",
  "layout-13",
  "layout-14",
  "layout-15",
  "layout-16",
] as const;

export type PosterLayoutId = (typeof POSTER_LAYOUT_IDS)[number];

export const SLOT_CHAR_LIMITS = {
  mark: 24,
  headline: 40,
  subhead: 80,
  body: 160,
} as const;

export const INSTRUCTION_MAX = 2000;

export type PosterTextRole = keyof typeof SLOT_CHAR_LIMITS;

export type PosterShapeKind =
  | "rect"
  | "circle"
  | "quarterCircle"
  | "semicircle"
  | "triangle"
  | "lineStack"
  | "ellipse"
  | "blob";

export type PosterShapeLayer = {
  id: string;
  type: "shape";
  shape: PosterShapeKind;
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  axis?: "horizontal" | "vertical";
  corner?: "tl" | "tr" | "bl" | "br";
  side?: "top" | "bottom" | "left" | "right";
};

export type PosterTextLayer = {
  id: string;
  type: "text";
  role: PosterTextRole;
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fontSize: number;
  fontWeight: 500 | 700;
  align: "left" | "center" | "right";
  color: string;
  vertical?: boolean;
  tracking?: number;
};

export type PosterLayer = PosterShapeLayer | PosterTextLayer;

export type PosterLayout = {
  id: PosterLayoutId;
  blueprintPath: string;
  layers: PosterLayer[];
};

export type PostPreviewStatus = "generating" | "ready" | "failed";

export type PublicPost = {
  id: string;
  layoutId: PosterLayoutId;
  instruction: string;
  layers: PosterLayer[];
  previewUrl?: string;
  thumbnailUrl?: string;
  previewStatus: PostPreviewStatus;
};

export function isPosterLayoutId(value: string): value is PosterLayoutId {
  return (POSTER_LAYOUT_IDS as readonly string[]).includes(value);
}
