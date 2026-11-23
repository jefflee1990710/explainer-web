// The app menu is only full width or icons. Canvas with no saved choice starts as icons.

export const STUDIO_RAIL_COLLAPSED_KEY = "scro:studio-sidebar-collapsed";

export function studioRailCollapsed(stored: string | null, onCanvas: boolean): boolean {
  if (stored === "1") return true;
  if (stored === "0") return false;
  return onCanvas;
}
