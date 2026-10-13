import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PANEL_CONFIG } from "@/panels/layout";

export interface PanelSizes {
	tools: number;
	preview: number;
	properties: number;
	mainContent: number;
	timeline: number;
}

export type PanelId = keyof PanelSizes;

// The old default gave the timeline half the editor. Keep a shorter size the user already chose.
function withShortTimeline({
	panels,
	version,
}: {
	panels: PanelSizes;
	version: number;
}): PanelSizes {
	if (version >= 3 || panels.timeline < 40) return panels;
	return {
		...panels,
		mainContent: PANEL_CONFIG.panels.mainContent,
		timeline: PANEL_CONFIG.panels.timeline,
	};
}

interface PanelState {
	panels: PanelSizes;
	setPanel: (args: { panel: PanelId; size: number }) => void;
	setPanels: (sizes: Partial<PanelSizes>) => void;
	resetPanels: () => void;
}

export const usePanelStore = create<PanelState>()(
	persist(
		(set) => ({
			...PANEL_CONFIG,
			setPanel: ({ panel, size }) =>
				set((state) => ({
					panels: {
						...state.panels,
						[panel]: size,
					},
				})),
			setPanels: (sizes) =>
				set((state) => ({
					panels: {
						...state.panels,
						...sizes,
					},
				})),
			resetPanels: () => set({ ...PANEL_CONFIG }),
		}),
		{
			name: "panel-sizes",
			version: 3,
			migrate: (persistedState, version) => {
				const state = persistedState as
					| {
							panels?: Partial<PanelSizes> | null;
							toolsPanel?: number;
							previewPanel?: number;
							propertiesPanel?: number;
							mainContent?: number;
							timeline?: number;
							tools?: number;
							preview?: number;
							properties?: number;
					  }
					| undefined
					| null;

				if (!state) return { panels: { ...PANEL_CONFIG.panels } };

				if (state.panels && typeof state.panels === "object") {
					return {
						panels: withShortTimeline({
							panels: {
								...PANEL_CONFIG.panels,
								...state.panels,
							},
							version,
						}),
					};
				}

				const panels = {
					tools: state.tools ?? state.toolsPanel ?? PANEL_CONFIG.panels.tools,
					preview:
						state.preview ??
						state.previewPanel ??
						PANEL_CONFIG.panels.preview,
					properties:
						state.properties ??
						state.propertiesPanel ??
						PANEL_CONFIG.panels.properties,
					mainContent: state.mainContent ?? PANEL_CONFIG.panels.mainContent,
					timeline: state.timeline ?? PANEL_CONFIG.panels.timeline,
				};
				return { panels: withShortTimeline({ panels, version }) };
			},
			partialize: (state) => ({
				panels: state.panels,
			}),
		},
	),
);
