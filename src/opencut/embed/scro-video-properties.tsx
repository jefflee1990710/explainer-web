"use client";

import { Button } from "@/opencut/components/ui/button";
import { ScroClipTextField } from "@/opencut/embed/scro-clip-text-field";
import { ScroSceneEditInput } from "@/opencut/embed/scro-scene-edit-input";
import { requestScroOpenAi } from "@/opencut/embed/scro-video-actions";
import { ScroVideoAiEntry } from "@/opencut/embed/scro-video-ai-entry";
import {
	canApplyClipJutsu,
	ScroVideoJutsuActions,
} from "@/opencut/embed/scro-video-jutsu-actions";
import { ScroVideoPrimaryActions } from "@/opencut/embed/scro-video-primary-actions";
import { useScroVideos } from "@/opencut/embed/scro-video-store";
import {
	localizeBilingualLabel,
	useOpencutI18n,
} from "@/opencut/i18n/use-opencut-i18n";
import type { ScroVideoSeedClip } from "@/opencut/embed/scro-video-types";
import { canChangeClipStyle } from "@/service/opencut/clip-inspector-kind";
import { setClipVideoQualityTierAction } from "@/presentation/actions/opencut-clip-style";
import { writeDefaultVideoQualityTier } from "@/presentation/components/app/projects/new/brief-defaults";
import { localizedStyleName } from "@/util/style-i18n";

function Field({ label, value }: { label: string; value?: string }) {
	const text = value?.trim();
	if (!text) return null;
	return <ScroClipTextField label={label} text={text} />;
}

function Detail({ clip }: { clip: ScroVideoSeedClip }) {
	const isTalkingHead = clip.inspectorKind === "talking-head";
	return (
		<div className="space-y-3">
			{clip.dualBeat ? (
				<>
					<Field label="Start VO" value={clip.startVo || clip.englishVo} />
					<Field label="End VO" value={clip.endVo} />
				</>
			) : (
				<Field label="VO" value={clip.englishVo} />
			)}
			<Field label="Scene" value={clip.explainerScene} />
			{!isTalkingHead ? <Field label="Motion" value={clip.motionCamera} /> : null}
		</div>
	);
}

/** Properties panel body for a selected ScroVideo clip, tailored by clip creation type. */
export function ScroVideoProperties({
	clipNumber,
	showInspectorHeader = true,
}: {
	clipNumber: number;
	showInspectorHeader?: boolean;
}) {
	const store = useScroVideos();
	const { locale, oc } = useOpencutI18n();
	const clip = store?.clips.find((item) => item.clipNumber === clipNumber);
	if (!store || !clip) {
		return (
			<div className="text-muted-foreground p-3 text-sm">
				Scro clip details unavailable.
			</div>
		);
	}

	const inspectorKind = clip.inspectorKind ?? "explainer";
	const isStandaloneSwap = inspectorKind === "scroswap";
	const isStandaloneTeleport = inspectorKind === "teleport";
	const isStandaloneEngine = isStandaloneSwap || isStandaloneTeleport;
	const modeLabel = isStandaloneSwap
		? oc.inspector.modeScroSwap
		: isStandaloneTeleport
			? oc.inspector.modeTeleport
			: inspectorKind === "talking-head"
				? oc.inspector.modeTalkingHead
				: oc.inspector.modeExplainer;

	const styleLabel = clip.styleId
		? localizeBilingualLabel(localizedStyleName(clip.styleId), locale)
		: localizeBilingualLabel(localizedStyleName("realistic"), locale);
	const canChangeStyle = canChangeClipStyle(clip);
	const canRunJutsu = canApplyClipJutsu(clip);

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			{showInspectorHeader ? (
				<div className="shrink-0">
					<div className="border-border flex h-10 items-center justify-between border-b px-3.5">
						<span className="text-foreground text-[13px] font-semibold tracking-tight">
							{oc.inspector.title}
						</span>
						<span className="bg-muted text-muted-foreground rounded-lg px-2 py-0.5 text-[10px] font-medium">
							{oc.inspector.stageLabels[clip.stage]}
						</span>
					</div>
					<div className="border-border space-y-1 border-b px-3.5 py-2.5">
						<div className="flex items-center justify-between gap-2">
							<p className="text-muted-foreground text-[11px] font-medium">
								{modeLabel}
							</p>
							{clip.timeRange ? (
								<p className="text-muted-foreground text-[11px] tabular-nums">
									{clip.timeRange}
								</p>
							) : null}
						</div>
						<p className="text-foreground truncate text-[13px] font-semibold">
							{clip.name}
							<span className="text-muted-foreground font-medium">
								{" "}
								· {clip.durationSeconds}s
							</span>
						</p>
					</div>
				</div>
			) : null}
			<div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
				<div className="divide-border flex flex-col divide-y">
					<div className="flex items-center justify-between px-3.5 py-2.5">
						<span className="text-muted-foreground text-[11px] font-medium">
							{oc.inspector.stage}
						</span>
						<span className="bg-muted text-foreground rounded-lg px-2 py-0.5 text-[11px] font-medium">
							{oc.inspector.stageLabels[clip.stage]}
						</span>
					</div>

					{isStandaloneEngine ? (
						<div className="space-y-3 px-3.5 py-3">
							<p className="text-muted-foreground text-xs leading-relaxed">
								{isStandaloneSwap ? oc.inspector.reSwapDesc : oc.inspector.reTeleportDesc}
							</p>
							{clip.error ? (
								<p role="alert" className="text-destructive text-xs">
									{clip.error}
								</p>
							) : null}
							<Button
								type="button"
								size="sm"
								disabled={!canRunJutsu}
								className="w-full rounded-lg text-xs font-semibold"
								onClick={() =>
									requestScroOpenAi({
										videoId: store.videoId,
										clipNumber: clip.clipNumber,
										kind: isStandaloneSwap ? "scro-swap" : "teleport",
									})
								}
							>
								{clip.stage === "video_generating" || clip.stage === "frames_generating"
									? oc.inspector.renderingVideo
									: isStandaloneSwap
										? oc.inspector.reSwapCharacter
										: oc.inspector.reTeleportScene}
							</Button>
							<Button
								type="button"
								variant="secondary"
								size="sm"
								disabled={!canRunJutsu}
								className="w-full rounded-lg text-xs"
								onClick={() =>
									requestScroOpenAi({
										videoId: store.videoId,
										clipNumber: clip.clipNumber,
										kind: isStandaloneSwap ? "teleport" : "scro-swap",
									})
								}
							>
								{isStandaloneSwap ? oc.inspector.teleport : oc.inspector.scroSwap}
							</Button>
							<Button
								type="button"
								variant="secondary"
								size="sm"
								disabled={!canRunJutsu}
								className="w-full rounded-lg text-xs"
								onClick={() =>
									requestScroOpenAi({
										videoId: store.videoId,
										clipNumber: clip.clipNumber,
										kind: "extend-video",
									})
								}
							>
								{oc.inspector.extendVideo}
							</Button>
						</div>
					) : (
						<>
							<div className="space-y-2 px-3.5 py-3">
								<div className="flex items-center justify-between gap-2">
									<div className="min-w-0">
										<p className="text-muted-foreground text-[0.7rem] font-medium tracking-wide uppercase">
											{oc.inspector.currentStyle}
										</p>
										<p className="text-foreground truncate text-xs font-semibold">
											{styleLabel}
										</p>
									</div>
									<Button
										type="button"
										variant="secondary"
										size="sm"
										disabled={!canChangeStyle}
										className="shrink-0 rounded-lg text-xs font-semibold"
										onClick={() =>
											requestScroOpenAi({
												videoId: store.videoId,
												clipNumber: clip.clipNumber,
												kind: "clip-style",
											})
										}
									>
										{oc.inspector.changeStyle}
									</Button>
								</div>

								{inspectorKind !== "talking-head" ? (
									<div className="flex items-center justify-between gap-2 pt-1.5">
										<p className="text-muted-foreground text-[0.7rem] font-medium tracking-wide uppercase">
											{locale === "en" ? "Video Tier" : "影片方案"}
										</p>
										<div className="bg-muted inline-flex rounded-lg p-0.5">
											{(["economy", "2k_cinema"] as const).map((tier) => {
												const active =
													(clip.videoQualityTier ?? "2k_cinema") === tier;
												const label =
													tier === "economy"
														? locale === "en"
															? "Economy · 4/s"
															: "Economy · 4/s"
														: "2K Cinema · 15/s";
												return (
													<button
														key={tier}
														type="button"
														onClick={() => {
															writeDefaultVideoQualityTier(tier);
															void setClipVideoQualityTierAction({
																videoId: store.videoId,
																clipNumber: clip.clipNumber,
																videoQualityTier: tier,
															});
														}}
														className={`cursor-pointer rounded-md px-2 py-0.5 text-[11px] font-semibold transition ${
															active
																? "bg-foreground text-background"
																: "text-muted-foreground hover:text-foreground"
														}`}
													>
														{label}
													</button>
												);
											})}
										</div>
									</div>
								) : null}
							</div>
							<div className="space-y-3 px-3.5 py-3">
								<ScroVideoJutsuActions videoId={store.videoId} clip={clip} />
								<ScroVideoPrimaryActions videoId={store.videoId} clip={clip} />
								<ScroVideoAiEntry videoId={store.videoId} clip={clip} />
							</div>
							<div className="px-3.5 py-3">
								<Detail clip={clip} />
							</div>
						</>
					)}
				</div>
			</div>
			{!isStandaloneEngine ? (
				<ScroSceneEditInput videoId={store.videoId} clipNumber={clip.clipNumber} />
			) : null}
		</div>
	);
}

/** Resolve selected Scro clip from timeline element or Assets selection. */
export function useSelectedScroClipNumber(
	timelineClipNumber: number | null | undefined,
): number | null {
	const store = useScroVideos();
	if (timelineClipNumber != null) return timelineClipNumber;
	return store?.selectedClipNumber ?? null;
}
