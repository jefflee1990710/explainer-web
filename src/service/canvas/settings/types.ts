import type { CanvasNode, CanvasNodeData } from "@/model/canvas";

// Target handle that Setting edges land on. It is not a model input port.
export const SETTINGS_HANDLE = "settings";

export type SettingsTarget = { id: string; type: CanvasNode["type"]; data: CanvasNodeData };
