"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
	FavouriteIcon,
	MusicNote03Icon,
	PauseIcon,
	PlayIcon,
	PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/opencut/components/ui/button";
import { Input } from "@/opencut/components/ui/input";
import { ScrollArea } from "@/opencut/components/ui/scroll-area";
import { useEditor } from "@/opencut/editor/use-editor";
import { armScroSync } from "@/opencut/embed/scro-media-sources";
import { useSoundsStore } from "@/opencut/sounds/sounds-store";
import type { SoundEffect } from "@/opencut/sounds/types";
import { buildLibraryAudioElement } from "@/opencut/timeline/element-utils";
import { cn } from "@/opencut/utils/ui";
import { mediaTimeFromSeconds, mediaTimeToSeconds } from "@/opencut/wasm";
import { listBgmTracksAction } from "@/presentation/actions/sound-effects";
import {
	AI_BGM_NAME_PREFIX,
	AI_BGM_VOLUME_DB,
	isAiBgmElementName,
	type LibrarySound,
} from "@/service/opencut/auto-audio-shared";

// Concise 2-word queries because Freesound uses strict AND matching across all query terms.
const BGM_MOODS = [
	{ id: "ambient", label: "Ambient 輕柔底樂", query: "ambient music" },
	{ id: "lofi", label: "Lo-Fi 輕鬆節奏", query: "lofi music" },
	{ id: "tech", label: "Tech 現代科技", query: "synth ambient" },
	{ id: "corporate", label: "Upbeat 商業輕快", query: "upbeat music" },
	{ id: "piano", label: "Piano 鋼琴感性", query: "piano music" },
	{ id: "acoustic", label: "Acoustic 木結他", query: "acoustic guitar" },
	{ id: "cinematic", label: "Cinematic 電影感", query: "cinematic music" },
	{ id: "hiphop", label: "Hip-Hop 潮流節拍", query: "hip hop beat" },
] as const;

type BgmMoodId = (typeof BGM_MOODS)[number]["id"];

function formatTrackDuration(seconds: number): string {
	const total = Math.max(0, Math.round(seconds));
	const mins = Math.floor(total / 60);
	const secs = total % 60;
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function toSoundEffect(sound: LibrarySound): SoundEffect {
	return {
		id: sound.id,
		name: sound.name,
		description: sound.description,
		url: sound.previewUrl,
		previewUrl: sound.previewUrl,
		downloadUrl: sound.previewUrl,
		duration: sound.duration,
		filesize: 0,
		type: "audio",
		channels: 2,
		bitrate: 128000,
		bitdepth: 16,
		samplerate: 44100,
		username: sound.username,
		tags: sound.tags,
		license: sound.license,
		created: "",
		downloads: 0,
		rating: 0,
		ratingCount: 0,
	};
}

/**Redesigned Background Music (BGM) browser & one-click timeline adder for the left Assets panel. */
export function BgmView() {
	const editor = useEditor();
	const { savedSounds, isSoundSaved, toggleSavedSound, loadSavedSounds } =
		useSoundsStore();
	const [viewTab, setViewTab] = useState<"browse" | "saved">("browse");
	const [query, setQuery] = useState("");
	const [moodId, setMoodId] = useState<BgmMoodId>("ambient");
	const [tracks, setTracks] = useState<LibrarySound[]>([]);
	const [totalCount, setTotalCount] = useState(0);
	const [page, setPage] = useState(1);
	const [hasNext, setHasNext] = useState(false);
	const [loading, setLoading] = useState(false);
	const [loadingMore, setLoadingMore] = useState(false);
	const [addingId, setAddingId] = useState<string | null>(null);
	const [playingId, setPlayingId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const audioRef = useRef<HTMLAudioElement | null>(null);

	useEffect(() => {
		void loadSavedSounds();
	}, [loadSavedSounds]);

	useEffect(() => {
		return () => {
			audioRef.current?.pause();
		};
	}, []);

	const fetchTracks = useCallback(
		async ({
			searchQuery,
			selectedMood,
			pageNum = 1,
			append = false,
		}: {
			searchQuery: string;
			selectedMood: BgmMoodId;
			pageNum?: number;
			append?: boolean;
		}) => {
			if (append) setLoadingMore(true);
			else setLoading(true);
			setError(null);
			try {
				const moodObj =
					BGM_MOODS.find((m) => m.id === selectedMood) ?? BGM_MOODS[0];
				const res = await listBgmTracksAction({
					page: pageNum,
					query: searchQuery,
					moodQuery: moodObj.query,
					commercialOnly: true,
				});
				if (!res.ok) {
					setError(res.error);
					return;
				}
				setTracks((prev) =>
					append ? [...prev, ...res.results] : res.results,
				);
				setTotalCount(res.count);
				setHasNext(res.hasNext);
				setPage(pageNum);
			} catch {
				setError("載入背景音樂清單失敗");
			} finally {
				setLoading(false);
				setLoadingMore(false);
			}
		},
		[],
	);

	useEffect(() => {
		void fetchTracks({ searchQuery: "", selectedMood: moodId, pageNum: 1 });
	}, [fetchTracks, moodId]);

	const togglePlay = (track: LibrarySound) => {
		if (playingId === track.id) {
			audioRef.current?.pause();
			setPlayingId(null);
			return;
		}
		audioRef.current?.pause();
		if (!track.previewUrl) return;
		const audio = new Audio(track.previewUrl);
		audio.addEventListener("ended", () => setPlayingId(null));
		audio.addEventListener("error", () => setPlayingId(null));
		audio.play().catch(() => setPlayingId(null));
		audioRef.current = audio;
		setPlayingId(track.id);
	};

	const handleAddBgmToTimeline = async (track: LibrarySound) => {
		if (addingId || !track.previewUrl) return;
		setAddingId(track.id);
		try {
			const response = await fetch(track.previewUrl);
			if (!response.ok) throw new Error("無法下載背景音樂音訊");
			const arrayBuffer = await response.arrayBuffer();
			const audioContext = new AudioContext();
			try {
				const buffer = await audioContext.decodeAudioData(arrayBuffer);
				const scene = editor.scenes.getActiveScene();
				let mainEnd = 0;
				for (const el of scene.tracks.main.elements) {
					const elEnd =
						mediaTimeToSeconds({ time: el.startTime }) +
						mediaTimeToSeconds({ time: el.duration });
					if (elEnd > mainEnd) mainEnd = elEnd;
				}
				const decodedDur =
					track.duration > 0
						? track.duration
						: buffer.duration > 0
							? buffer.duration
							: 30;
				const durationSeconds =
					mainEnd > 0.5
						? Math.min(mainEnd, Math.max(5, decodedDur))
						: Math.max(5, decodedDur);

				// Replace previous BGM track elements so the user doesn't stack two BGM beds by accident
				const stale = scene.tracks.audio.flatMap((audioTrack) =>
					audioTrack.elements
						.filter((el) => isAiBgmElementName(el.name))
						.map((el) => ({ trackId: audioTrack.id, elementId: el.id })),
				);
				if (stale.length > 0) {
					editor.timeline.deleteElements({ elements: stale });
				}

				const freshScene = editor.scenes.getActiveScene();
				const base = buildLibraryAudioElement({
					sourceUrl: track.previewUrl,
					name: `${AI_BGM_NAME_PREFIX} · ${track.name.slice(0, 32)}`,
					duration: mediaTimeFromSeconds({ seconds: durationSeconds }),
					startTime: mediaTimeFromSeconds({ seconds: 0 }),
					buffer,
				});
				const element = {
					...base,
					params: {
						...base.params,
						volume: AI_BGM_VOLUME_DB,
					},
				};

				editor.timeline.insertElement({
					placement: {
						mode: "new-track",
						trackType: "audio",
						insertIndex:
							freshScene.tracks.overlay.length +
							1 +
							freshScene.tracks.audio.length,
					},
					element,
				});
				armScroSync();
				toast.success(`已加入背景音樂「${track.name.slice(0, 24)}」到時間軸`);
			} finally {
				void audioContext.close();
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "加入背景音樂失敗");
		} finally {
			setAddingId(null);
		}
	};

	const savedAsLibrary: LibrarySound[] = savedSounds.map((s) => ({
		id: s.id,
		name: s.name,
		description: s.username,
		previewUrl: s.previewUrl ?? "",
		duration: s.duration,
		username: s.username,
		tags: s.tags,
		license: s.license,
	}));

	const displayedTracks = viewTab === "saved" ? savedAsLibrary : tracks;

	return (
		<div className="flex h-full flex-col">
			{/* Top Header & Controls */}
			<div className="border-border space-y-2.5 border-b p-3">
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<div className="bg-secondary text-foreground grid size-7 shrink-0 place-items-center rounded-md border">
							<HugeiconsIcon icon={MusicNote03Icon} size={15} />
						</div>
						<div>
							<h2 className="text-xs font-semibold tracking-tight">
								背景音樂 · BGM Library
							</h2>
							<p className="text-muted-foreground text-[10px]">
								免版權商用純音樂 · 點擊試聽或一鍵鋪底
							</p>
						</div>
					</div>

					{/* Browse vs Saved Segmented Pill */}
					<div className="bg-muted/60 inline-flex shrink-0 rounded-full border p-0.5">
						<button
							type="button"
							onClick={() => setViewTab("browse")}
							className={cn(
								"cursor-pointer rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors",
								viewTab === "browse"
									? "bg-foreground text-background shadow-xs"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							探索 ({totalCount > 0 ? totalCount : "…"})
						</button>
						<button
							type="button"
							onClick={() => setViewTab("saved")}
							className={cn(
								"cursor-pointer rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors",
								viewTab === "saved"
									? "bg-foreground text-background shadow-xs"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							收藏 ({savedSounds.length})
						</button>
					</div>
				</div>

				{viewTab === "browse" ? (
					<>
						<form
							onSubmit={(event) => {
								event.preventDefault();
								void fetchTracks({
									searchQuery: query,
									selectedMood: moodId,
									pageNum: 1,
								});
							}}
							className="flex items-center gap-1.5"
						>
							<Input
								placeholder="搜尋曲風或樂器（如 synth, chill, piano, guitar）…"
								value={query}
								onChange={(e) => setQuery(e.currentTarget.value)}
								className="h-7 text-xs"
								containerClassName="flex-1"
								showClearIcon
								onClear={() => {
									setQuery("");
									void fetchTracks({
										searchQuery: "",
										selectedMood: moodId,
										pageNum: 1,
									});
								}}
							/>
							<Button
								type="submit"
								size="sm"
								disabled={loading}
								className="h-7 px-2.5 text-xs"
							>
								{loading ? "…" : "搜尋"}
							</Button>
						</form>

						{/* Mood Chips */}
						<div className="flex flex-wrap gap-1">
							{BGM_MOODS.map((mood) => {
								const active = moodId === mood.id;
								return (
									<button
										key={mood.id}
										type="button"
										onClick={() => {
											setMoodId(mood.id);
											void fetchTracks({
												searchQuery: query,
												selectedMood: mood.id,
												pageNum: 1,
											});
										}}
										className={cn(
											"cursor-pointer rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
											active
												? "border-foreground bg-foreground text-background shadow-xs"
												: "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground",
										)}
									>
										{mood.label}
									</button>
								);
							})}
						</div>
					</>
				) : null}
			</div>

			{/* Track Cards List */}
			<ScrollArea className="min-h-0 flex-1 p-2.5">
				{error ? (
					<div className="text-destructive mb-2 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs">
						{error}
					</div>
				) : null}

				{loading ? (
					<div className="space-y-2 py-2">
						{Array.from({ length: 6 }).map((_, idx) => (
							<div
								key={idx}
								className="bg-muted/40 h-14 animate-pulse rounded-lg border"
							/>
						))}
					</div>
				) : displayedTracks.length === 0 ? (
					<div className="text-muted-foreground flex flex-col items-center justify-center gap-1.5 py-10 text-center text-xs">
						<HugeiconsIcon
							icon={MusicNote03Icon}
							size={24}
							className="opacity-40"
						/>
						<p className="font-medium">
							{viewTab === "saved"
								? "尚未收藏任何背景音樂"
								: "找不到符合的背景音樂"}
						</p>
						<p className="text-[11px] opacity-75">
							{viewTab === "saved"
								? "喺「探索」列表撳愛心即可儲存常用配樂"
								: "請試試其他英文關鍵字（如 ambient, synth, piano）"}
						</p>
					</div>
				) : (
					<div className="flex flex-col gap-2 pb-4">
						{displayedTracks.map((track) => {
							const isPlaying = playingId === track.id;
							const isAdding = addingId === track.id;
							const saved = isSoundSaved({ soundId: track.id });
							const topTags = (track.tags ?? []).slice(0, 3);

							return (
								<div
									key={track.id}
									className={cn(
										"group flex items-center gap-2.5 rounded-lg border p-2 transition-colors",
										isPlaying
											? "border-foreground bg-secondary/70 shadow-xs"
											: "border-border/70 bg-background hover:border-foreground/35 hover:bg-muted/30",
									)}
								>
									{/* Play / Pause Button */}
									<button
										type="button"
										onClick={() => togglePlay(track)}
										aria-label={isPlaying ? "暫停試聽" : "試聽背景音樂"}
										className={cn(
											"relative flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-colors",
											isPlaying
												? "border-foreground bg-foreground text-background"
												: "border-border bg-muted/60 text-foreground hover:bg-muted",
										)}
									>
										<HugeiconsIcon
											icon={isPlaying ? PauseIcon : PlayIcon}
											className="size-4"
										/>
									</button>

									{/* Track Metadata */}
									<button
										type="button"
										onClick={() => togglePlay(track)}
										className="min-w-0 flex-1 cursor-pointer text-left"
									>
										<div className="flex items-center gap-1.5">
											<p className="truncate text-xs font-semibold leading-tight">
												{track.name}
											</p>
											{track.duration > 0 ? (
												<span className="bg-muted text-muted-foreground shrink-0 rounded px-1.5 py-0.2 font-mono text-[10px] font-medium tabular-nums">
													{formatTrackDuration(track.duration)}
												</span>
											) : null}
										</div>
										<div className="mt-1 flex flex-wrap items-center gap-1">
											<span className="text-muted-foreground truncate text-[10px]">
												{track.username}
											</span>
											{topTags.map((tag) => (
												<span
													key={tag}
													className="bg-accent text-muted-foreground rounded px-1 py-0.1 text-[9px]"
												>
													#{tag}
												</span>
											))}
										</div>
									</button>

									{/* Actions: Favourite + Add to Timeline */}
									<div className="flex shrink-0 items-center gap-1">
										<Button
											variant="ghost"
											size="icon"
											className={cn(
												"size-7 cursor-pointer",
												saved
													? "text-red-500 hover:text-red-600"
													: "text-muted-foreground hover:text-foreground",
											)}
											onClick={() =>
												void toggleSavedSound({
													soundEffect: toSoundEffect(track),
												})
											}
											title={saved ? "從收藏移除" : "收藏背景音樂"}
										>
											<HugeiconsIcon
												icon={FavouriteIcon}
												size={14}
												className={saved ? "fill-current" : ""}
											/>
										</Button>

										<Button
											type="button"
											variant="secondary"
											size="sm"
											disabled={Boolean(addingId)}
											onClick={() => void handleAddBgmToTimeline(track)}
											title="鋪設背景音樂到時間軸音訊軌"
											className="h-7 cursor-pointer gap-1 px-2 text-[11px] font-semibold"
										>
											<HugeiconsIcon icon={PlusSignIcon} size={13} />
											<span>{isAdding ? "加入中…" : "鋪底"}</span>
										</Button>
									</div>
								</div>
							);
						})}

						{viewTab === "browse" && hasNext ? (
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={loadingMore}
								onClick={() =>
									void fetchTracks({
										searchQuery: query,
										selectedMood: moodId,
										pageNum: page + 1,
										append: true,
									})
								}
								className="mt-1 h-8 w-full text-xs font-semibold"
							>
								{loadingMore ? "載入更多中…" : "載入更多背景音樂 · Load More"}
							</Button>
						) : null}
					</div>
				)}
			</ScrollArea>
		</div>
	);
}
