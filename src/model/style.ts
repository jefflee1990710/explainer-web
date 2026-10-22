import type { StyleId } from "@/model/style-id";

export interface IStyleBehavior {
  /** Enables the 12 de-plastic realistic light/camera rules, 35mm film grading, high/2k character blueprints, and Hailuo-3 2K video routing. */
  realistic: boolean;
  /** Keeps the style's own dark slate drawing surface on character blueprints instead of replacing with a flat light ground. */
  usesDrawingSurface: boolean;
  /** Enforces monochrome white-chalk-on-slate rendering without hair/skin/cloth colour. */
  monochromeChalk: boolean;
}

export interface IStyle {
  id: StyleId;
  name: string;
  description: string;
  canvas: string;
  canvasColor: string;
  look: string;
  palette: string;
  typography: string;
  motion: string;
  negatives: string;
  letteringLayout?: string;
  letteringLine1?: string;
  letteringLine2?: string;
  beatTitleLayout?: string;
  reelLayout?: string;
  previewUrl?: string;
  previewFullUrl?: string;
  behavior: IStyleBehavior;
}

export function defaultStyleBehavior(id: string, canvas = ""): IStyleBehavior {
  return {
    realistic: id === "realistic",
    usesDrawingSurface: /chalkboard/i.test(`${id} ${canvas}`),
    monochromeChalk: id === "chalkboard",
  };
}
