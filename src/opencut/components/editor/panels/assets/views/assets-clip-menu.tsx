"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { AllFramesVideoIcon } from "@/presentation/components/project/production-bulk-action-icons";
import {
	AddClipIcon,
	AllFramesIcon,
	FinishMissingIcon,
} from "@/presentation/studio/studio-action-icons";
import { Button } from "@/opencut/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/opencut/components/ui/dropdown-menu";
import {
	requestScroClipMenu,
	type ScroClipMenuAction,
} from "@/opencut/embed/scro-video-actions";
import { useScroClipMenuFlags, useScroVideos } from "@/opencut/embed/scro-video-store";
import { isScroEmbed } from "@/opencut/embed/scro-transport";

/** Assets header menu for the clip actions that used to sit above the editor. */
export function AssetsClipMenu() {
	const videos = useScroVideos();
	const flags = useScroClipMenuFlags();
	if (!isScroEmbed() || !videos) return null;

	return (
		<AssetsClipMenuButton
			videoId={videos.videoId}
			idle={flags.idle}
			videosEnabled={flags.idle && flags.videosEnabled}
		/>
	);
}

function AssetsClipMenuButton({
	videoId,
	idle,
	videosEnabled,
}: {
	videoId: string;
	idle: boolean;
	videosEnabled: boolean;
}) {
	const { t } = useI18n();

	function run(action: ScroClipMenuAction) {
		requestScroClipMenu({ videoId, action });
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					size="icon"
					variant="ghost"
					aria-label={t("video.editor.moreAria")}
					className="items-center justify-center"
				>
					<KebabIcon />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-44">
				<DropdownMenuItem
					icon={<FinishMissingIcon className="h-4 w-4" />}
					disabled={!idle}
					onSelect={() => run("remaining")}
				>
					{t("production.bulk.mode.remaining.label")}
				</DropdownMenuItem>
				<DropdownMenuItem
					icon={<AllFramesIcon className="h-4 w-4" />}
					disabled={!idle}
					onSelect={() => run("scenes")}
				>
					{t("production.bulk.mode.scenes.label")}
				</DropdownMenuItem>
				<DropdownMenuItem
					icon={<AllFramesVideoIcon />}
					disabled={!videosEnabled}
					onSelect={() => run("clips")}
				>
					{t("production.toolbar.bulkAllVideos")}
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					icon={<AddClipIcon className="h-4 w-4" />}
					disabled={!idle}
					onSelect={() => run("add")}
				>
					{t("production.filmstrip.addClip")}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function KebabIcon() {
	return (
		<svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
			<circle cx="12" cy="5" r="1.7" />
			<circle cx="12" cy="12" r="1.7" />
			<circle cx="12" cy="19" r="1.7" />
		</svg>
	);
}
