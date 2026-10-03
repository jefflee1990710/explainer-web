import { STYLE_IDS, type StyleId } from "@/model/style-id";
import { replaceStyleOverlay, resetStyleOverlay } from "@/service/style/load-style";
import type { Style } from "@/service/style/types";

export function testStyle(id: StyleId, overrides: Partial<Style> = {}): Style {
  return {
    id,
    name: `${id} name`,
    description: "desc",
    canvas: `${id} canvas`,
    canvasColor: "#ffffff",
    look: `${id} look`,
    palette: `${id} palette`,
    typography: `${id} typography`,
    motion: `${id} motion`,
    negatives: `${id} negatives`,
    ...overrides,
  };
}

export function installTestStyles(styles: Style[] = STYLE_IDS.map((id) => testStyle(id))) {
  replaceStyleOverlay(styles);
}

export function uninstallTestStyles() {
  resetStyleOverlay();
}
