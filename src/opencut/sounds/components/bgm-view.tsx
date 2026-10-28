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

const BGM_MOODS = [
	{ id: "ambient", label: "Ambient 輕柔底樂", query: "calm ambient instrumental background music" },
	{ id: "lofi", label: "Lo-Fi 輕鬆節奏", query: "lofi chill beats instrumental loop" },
	{ id: "corporate", label: "Upbeat 商業輕快", query: "upbeat corporate inspiring instrumental music" },
	{ id: "acoustic", label: "Acoustic 溫暖木結他", query: "warm acoustic guitar gentle instrumental" },
	{ id: "piano", label: "Piano 鋼琴感性", query: "soft piano emotional minimal instrumental" },
	{ id: "tech", label: "Tech 現代科技", query: "modern electronic synth corporate ambient" },
] as const;

type BgmMoodId = (typeof BGM_MOODS)[number]["id"];

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

/** Manual Background Music (BGM) browser & one-click timeline adder for the left Assets panel. */
export function BgmView() {
	const editor = useEditor();
	const { isSoundSaved, toggleSavedSound, loadSavedSounds } = useSoundsStore();
	const [query, setQuery] = useState("");
	const [moodId, setMoodId] = useState<BgmMoodId>("ambient");
	const [tracks, setTracks] = useState<LibrarySound[]>([]);
	const [loading, setLoading] = useState(false);
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

	const fetchTracks = useCallback(async (searchQuery: string, selectedMood: BgmMoodId) => {
		setLoading(true);
		setError(null);
		try {
			const moodObj = BGM_MOODS.find((m) => m.id === selectedMood) ?? BGM_MOODS[0];
			const res = await listBgmTracksAction({
				page: 1,
				query: searchQuery,
				moodQuery: moodObj.query,
				commercialOnly: true,
			});
			if (!res.ok) {
				setError(res.error);
				return;
			}
			setTracks(res.results);
		} catch {
			setError("載入背景音樂清單失敗");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void fetchTracks("", moodId);
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
					track.duration > 0 ? track.duration : buffer.duration > 0 ? buffer.duration : 30;
				const durationSeconds =
					mainEnd > 0.5 ? Math.min(mainEnd, Math.max(5, decodedDur)) : Math.max(5, decodedDur);

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
							freshScene.tracks.overlay.length + 1 + freshScene.tracks.audio.length,
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

	return (
		<div className="flex h-full flex-col">
			<div className="space-y-2.5 border-b p-3">
				<div className="flex items-center gap-2">
					<HugeiconsIcon icon={MusicNote03Icon} size={16} />
					<div>
						<h2 className="text-sm font-medium">背景音樂 · BGM</h2>
						<p className="text-muted-foreground text-[11px]">
							試聽並手動點選「+」將背景音樂鋪到時間軸音訊軌
						</p>
					</div>
				</div>

				<form
					onSubmit={(event) => {
						event.preventDefault();
						void fetchTracks(query, moodId);
					}}
					className="flex items-center gap-1.5"
				>
					<Input
						placeholder="搜尋背景音樂（如 chill, piano, corporate, lofi）…"
						value={query}
						onChange={(e) => setQuery(e.currentTarget.value)}
						className="h-8 text-xs"
						containerClassName="flex-1"
						showClearIcon
						onClear={() => {
							setQuery("");
							void fetchTracks("", moodId);
						}}
					/>
					<Button
						type="submit"
						size="sm"
						disabled={loading}
						className="h-8 px-3 text-xs"
					>
						{loading ? "…" : "搜尋"}
					</Button>
				</form>

				<div className="flex flex-wrap gap-1.5">
					{BGM_MOODS.map((mood) => (
						<button
							key={mood.id}
							type="button"
							onClick={() => {
								setMoodId(mood.id);
								void fetchTracks(query, mood.id);
							}}
							className={cn(
								"cursor-pointer rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors",
								moodId === mood.id
									? "border-primary bg-primary/15 text-primary"
									: "border-border/60 text-muted-foreground hover:text-foreground",
							)}
						>
							{mood.label}
						</button>
					))}
				</div>
			</div>

			<ScrollArea className="min-h-0 flex-1 p-3">
				{error ? (
					<div className="text-destructive mb-3 text-xs">{error}</div>
				) : null}

				{loading ? (
					<div className="text-muted-foreground py-6 text-center text-xs">
						正在載入背景音樂…
					</div>
				) : tracks.length === 0 ? (
					<div className="text-muted-foreground py-6 text-center text-xs">
						找不到符合的背景音樂，請試試其他英文關鍵字（如 ambient, guitar）
					</div>
				) : (
					<div className="flex flex-col gap-3 pb-4">
						{tracks.map((track) => {
							const isPlaying = playingId === track.id;
							const isAdding = addingId === track.id;
							const saved = isSoundSaved({ soundId: track.id });
							return (
								<div
									key={track.id}
									className="group flex items-center gap-3 opacity-100 hover:opacity-85"
								>
									<button
										type="button"
										className="flex min-w-0 flex-1 items-center gap-3 text-left"
										onClick={() => togglePlay(track)}
									>
										<div className="bg-accent relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md">
											<div className="from-primary/20 absolute inset-0 bg-gradient-to-br to-transparent" />
											<HugeiconsIcon
												icon={isPlaying ? PauseIcon : PlayIcon}
												className="size-4"
											/>
										</div>
										<div className="min-w-0 flex-1 overflow-hidden">
											<p className="truncate text-sm font-medium">{track.name}</p>
											<span className="text-muted-foreground block truncate text-xs">
												{track.duration > 0 ? `${track.duration.toFixed(0)}s · ` : ""}
												{track.description || track.username}
											</span>
										</div>
									</button>

									<div className="flex items-center gap-2 pr-1">
										<Button
											variant="text"
											size="icon"
											disabled={Boolean(addingId)}
											className="text-muted-foreground hover:text-foreground w-auto !opacity-100"
											onClick={() => void handleAddBgmToTimeline(track)}
											title={isAdding ? "加入中…" : "加入背景音樂到時間軸"}
										>
											<HugeiconsIcon icon={PlusSignIcon} />
										</Button>
										<Button
											variant="text"
											size="icon"
											className={`hover:text-foreground w-auto !opacity-100 ${
												saved
													? "text-red-500 hover:text-red-600"
													: "text-muted-foreground"
											}`}
											onClick={() =>
												void toggleSavedSound({ soundEffect: toSoundEffect(track) })
											}
											title={saved ? "從收藏移除" : "收藏背景音樂"}
										>
											<HugeiconsIcon
												icon={FavouriteIcon}
												className={saved ? "fill-current" : ""}
											/>
										</Button>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</ScrollArea>
		</div>
	);
}
