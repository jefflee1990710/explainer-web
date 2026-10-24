"use client";

import { Separator } from "@/opencut/components/ui/separator";
import { type Tab, useAssetsPanelStore } from "@/opencut/components/editor/panels/assets/assets-panel-store";
import { TabBar } from "./tabbar";
import { MediaView } from "./views/assets";
import { StockMediaView } from "./views/stock-media-view";
import { SettingsView } from "./views/settings";
import { SoundsView } from "@/opencut/sounds/components/assets-view";
import { StickersView } from "@/opencut/stickers/components/assets-view";
import { AdjustmentsView, EffectsView, TransitionsView } from "@/opencut/effects/components/assets-view";
import { useSearchParams } from "next/navigation";
import { isScroEmbed } from "@/opencut/embed/scro-transport";
import { ScroSubtitlePanel } from "@/opencut/components/editor/panels/assets/scro-subtitle-panel";
import { useScroSubtitleOpen } from "@/opencut/embed/scro-subtitle-store";

export function AssetsPanel() {
	const { activeTab } = useAssetsPanelStore();
	const subtitleOpen = useScroSubtitleOpen();
	const embedded = isScroEmbed(useSearchParams().get("embed"));

	const viewMap: Record<Tab, React.ReactNode> = {
		media: <MediaView />,
		stock: <StockMediaView />,
		sounds: <SoundsView />,
		stickers: <StickersView />,
		effects: <EffectsView />,
		transitions: <TransitionsView />,
		adjustment: <AdjustmentsView />,
		settings: <SettingsView />,
	};

	return (
		<div className="panel bg-background flex h-full overflow-hidden rounded-none border">
			<TabBar />
			<Separator orientation="vertical" />
			<div className="flex-1 overflow-hidden">
				{embedded && subtitleOpen ? <ScroSubtitlePanel /> : viewMap[activeTab]}
			</div>
		</div>
	);
}
