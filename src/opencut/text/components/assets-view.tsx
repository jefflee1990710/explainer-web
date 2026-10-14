import { PanelView } from "@/opencut/components/editor/panels/assets/views/base-panel";
import { TextFontGrid } from "@/opencut/text/components/text-font-grid";

export function TextView() {
	return (
		<PanelView title="Text">
			<TextFontGrid />
		</PanelView>
	);
}
