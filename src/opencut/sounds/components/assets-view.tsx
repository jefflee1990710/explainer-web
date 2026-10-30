"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/opencut/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/opencut/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/opencut/components/ui/dropdown-menu";
import { Input } from "@/opencut/components/ui/input";
import { ScrollArea } from "@/opencut/components/ui/scroll-area";
import { Separator } from "@/opencut/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/opencut/components/ui/tabs";
import { useInfiniteScroll } from "@/opencut/hooks/use-infinite-scroll";
import { useSoundSearch } from "@/opencut/sounds/use-sound-search";
import { useSoundsStore } from "@/opencut/sounds/sounds-store";
import {
	SOUND_EFFECT_CATEGORIES,
	type SavedSound,
	type SoundEffect,
	type SoundEffectSourceFilter,
} from "@/opencut/sounds/types";
import { useOpencutI18n } from "@/opencut/i18n/use-opencut-i18n";
import { cn } from "@/opencut/utils/ui";
import { generateElevenLabsSoundEffectAction } from "@/presentation/actions/sound-effects";
import { toast } from "sonner";
import {
	FavouriteIcon,
	FilterMailIcon,
	PauseIcon,
	PlayIcon,
	PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export function SoundsView() {
	const { oc } = useOpencutI18n();
	return (
		<div className="flex h-full flex-col">
			<Tabs defaultValue="sound-effects" className="flex h-full flex-col">
				<div className="px-3 pt-4 pb-0">
					<TabsList>
						<TabsTrigger value="sound-effects">{oc.sfx.tabSfx}</TabsTrigger>
						<TabsTrigger value="saved">{oc.sfx.tabSaved}</TabsTrigger>
					</TabsList>
				</div>
				<Separator className="my-4" />
				<TabsContent
					value="sound-effects"
					className="mt-0 flex min-h-0 flex-1 flex-col p-5 pt-0"
				>
					<SoundEffectsView />
				</TabsContent>
				<TabsContent
					value="saved"
					className="mt-0 flex min-h-0 flex-1 flex-col p-5 pt-0"
				>
					<SavedSoundsView />
				</TabsContent>
			</Tabs>
		</div>
	);
}

function SoundEffectsView() {
	const {
		topSoundEffects,
		isLoading,
		searchQuery,
		setSearchQuery,
		scrollPosition,
		setScrollPosition,
		loadSavedSounds,
		showCommercialOnly,
		toggleCommercialFilter,
		selectedCategory,
		setSelectedCategory,
		selectedSource,
		setSelectedSource,
		prependSoundEffect,
		error,
	} = useSoundsStore();
	const [isGeneratingSfx, setIsGeneratingSfx] = useState(false);
	const {
		results: searchResults,
		isLoading: isSearching,
		error: searchError,
		loadMore,
		hasNextPage,
		isLoadingMore,
	} = useSoundSearch({
		query: searchQuery,
	});

	const [playingId, setPlayingId] = useState<string | null>(null);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const stopPreview = useCallback(() => {
		audioRef.current?.pause();
		audioRef.current = null;
		setPlayingId(null);
	}, []);
	// Category, source, license, and search replace the list, so filters stay locked until it lands.
	const filtersBusy = isLoading || isSearching || isLoadingMore;

	useEffect(() => {
		return () => {
			audioRef.current?.pause();
		};
	}, []);

	const { scrollAreaRef, handleScroll } = useInfiniteScroll({
		onLoadMore: loadMore,
		hasMore: hasNextPage,
		isLoading: isLoadingMore || isSearching,
	});

	useEffect(() => {
		loadSavedSounds();
	}, [loadSavedSounds]);

	const displayedSounds = searchQuery ? searchResults : topSoundEffects;

	// If the first page does not fill the panel, keep paging until it does or the list ends.
	useEffect(() => {
		const el = scrollAreaRef.current;
		if (!el || !hasNextPage || isLoadingMore || isLoading || isSearching) return;
		if (el.scrollHeight <= el.clientHeight + 24) {
			void loadMore();
		}
	}, [
		displayedSounds.length,
		hasNextPage,
		isLoading,
		isLoadingMore,
		isSearching,
		loadMore,
		scrollAreaRef,
	]);

	useEffect(() => {
		if (!scrollAreaRef.current || scrollPosition <= 0) {
			return;
		}

		const restoreScrollPosition = () => {
			scrollAreaRef.current?.scrollTo({ top: scrollPosition });
		};

		const timeoutId = setTimeout(restoreScrollPosition, 100, {});

		return () => clearTimeout(timeoutId);
	}, [scrollPosition, scrollAreaRef]);

	const handleScrollWithPosition = ({
		currentTarget,
	}: React.UIEvent<HTMLDivElement>) => {
		const { scrollTop } = currentTarget;
		setScrollPosition({ position: scrollTop });
		handleScroll({ currentTarget } as React.UIEvent<HTMLDivElement>);
	};

	const playSound = ({ sound }: { sound: SoundEffect }) => {
		if (playingId === sound.id) {
			stopPreview();
			return;
		}

		stopPreview();

		if (sound.previewUrl) {
			const audio = new Audio(sound.previewUrl);
			audio.addEventListener("ended", () => {
				setPlayingId(null);
			});
			audio.addEventListener("error", () => {
				setPlayingId(null);
			});
			audio.play().catch((error) => {
				console.error("Failed to play sound preview:", error);
				setPlayingId(null);
			});

			audioRef.current = audio;
			setPlayingId(sound.id);
		}
	};

	const handleGenerateElevenLabsSfx = async () => {
		const prompt =
			searchQuery.trim() ||
			SOUND_EFFECT_CATEGORIES.find((c) => c.id === selectedCategory)?.query ||
			"cinematic whoosh transition";
		if (isGeneratingSfx) return;
		setIsGeneratingSfx(true);
		try {
			const res = await generateElevenLabsSoundEffectAction({
				text: prompt,
				category: selectedCategory,
				durationSeconds: 2.5,
			});
			if (!res.ok) {
				toast.error(res.error);
				return;
			}
			const created: SoundEffect = {
				id: res.sound.id,
				name: res.sound.name,
				description: res.sound.description,
				url: res.sound.previewUrl,
				previewUrl: res.sound.previewUrl,
				downloadUrl: res.sound.previewUrl,
				duration: res.sound.duration,
				filesize: 0,
				type: "audio",
				channels: 2,
				bitrate: 128000,
				bitdepth: 16,
				samplerate: 44100,
				username: res.sound.username,
				tags: res.sound.tags,
				license: res.sound.license,
				created: new Date().toISOString(),
				downloads: 0,
				rating: 5,
				ratingCount: 1,
			};
			prependSoundEffect({ sound: created });
			toast.success("Generated sound effect with ElevenLabs AI");
		} catch {
			toast.error("Failed to generate sound effect");
		} finally {
			setIsGeneratingSfx(false);
		}
	};

	return (
		<div className="mt-1 flex h-full flex-col gap-3">
			<div className="flex items-center gap-2">
				<Input
					placeholder="Search or describe sound effect for ElevenLabs AI..."
					className="w-full"
					containerClassName="w-full"
					value={searchQuery}
					disabled={filtersBusy}
					onChange={({ currentTarget }) => {
						stopPreview();
						setSearchQuery({ query: currentTarget.value });
					}}
					showClearIcon
					onClear={() => {
						if (filtersBusy) return;
						stopPreview();
						setSearchQuery({ query: "" });
					}}
				/>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="text"
							size="icon"
							disabled={filtersBusy}
							className={cn(showCommercialOnly && "text-primary")}
						>
							<HugeiconsIcon icon={FilterMailIcon} />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-56">
						<DropdownMenuCheckboxItem
							checked={showCommercialOnly}
							onCheckedChange={() => {
								stopPreview();
								toggleCommercialFilter();
							}}
						>
							Show only commercially licensed
						</DropdownMenuCheckboxItem>
						<div className="text-muted-foreground px-2 py-1.5 text-xs">
							{showCommercialOnly
								? "Only showing sounds licensed for commercial use"
								: "Showing all sounds regardless of license"}
						</div>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-1">
					{(
						[
							{ id: "all", label: "All Sources" },
							{ id: "elevenlabs", label: "ElevenLabs AI" },
							{ id: "library", label: "Library" },
						] as Array<{ id: SoundEffectSourceFilter; label: string }>
					).map((src) => (
						<button
							key={src.id}
							type="button"
							disabled={filtersBusy}
							onClick={() => {
								if (filtersBusy || selectedSource === src.id) return;
								stopPreview();
								setSelectedSource({ source: src.id });
							}}
							className={cn(
								"cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed",
								selectedSource === src.id
									? "bg-primary text-primary-foreground"
									: "bg-accent/60 text-muted-foreground hover:text-foreground",
								filtersBusy && selectedSource !== src.id && "opacity-40",
							)}
						>
							{src.label}
						</button>
					))}
				</div>
				<Button
					variant="outline"
					size="sm"
					disabled={isGeneratingSfx || filtersBusy}
					onClick={() => void handleGenerateElevenLabsSfx()}
					className="h-7 text-xs"
				>
					{isGeneratingSfx ? "Generating..." : "✨ ElevenLabs AI Generate"}
				</Button>
			</div>

			<div className="flex flex-wrap gap-1.5">
				{SOUND_EFFECT_CATEGORIES.map((cat) => (
					<button
						key={cat.id}
						type="button"
						disabled={filtersBusy}
						aria-busy={filtersBusy && selectedCategory === cat.id}
						onClick={() => {
							if (filtersBusy || selectedCategory === cat.id) return;
							stopPreview();
							setSelectedCategory({ category: cat.id });
						}}
						className={cn(
							"cursor-pointer rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors disabled:cursor-not-allowed",
							selectedCategory === cat.id
								? "border-primary bg-primary/15 text-primary"
								: "border-border/60 text-muted-foreground hover:text-foreground",
							filtersBusy && selectedCategory !== cat.id && "opacity-40",
						)}
					>
						{cat.label}
					</button>
				))}
			</div>

			<div className="relative h-full overflow-hidden">
				<ScrollArea
					className="h-full flex-1"
					ref={scrollAreaRef}
					onScrollCapture={handleScrollWithPosition}
				>
					<div className="flex flex-col gap-4" aria-busy={isLoading || isSearching}>
						{(error || searchError) && (
							<div className="text-destructive text-sm">{error || searchError}</div>
						)}
						{isLoading || isSearching ? (
							<div className="space-y-2 py-1" aria-live="polite">
								<p className="text-muted-foreground text-xs">
									{searchQuery.trim() ? "搜尋聲效中…" : "載入聲效中…"}
								</p>
								{Array.from({ length: 6 }).map((_, idx) => (
									<div
										key={idx}
										className="bg-muted/40 h-14 animate-pulse rounded-lg border"
									/>
								))}
							</div>
						) : (
							<>
								{displayedSounds.map((sound) => (
									<AudioItem
										key={sound.id}
										sound={sound}
										isPlaying={playingId === sound.id}
										onPlay={playSound}
									/>
								))}
								{displayedSounds.length === 0 && (
									<div className="text-muted-foreground text-sm">
										{searchQuery ? "No sounds found" : "No sounds available"}
									</div>
								)}
								{isLoadingMore && (
									<div className="text-muted-foreground py-4 text-center text-sm">
										Loading more sounds...
									</div>
								)}
							</>
						)}
					</div>
				</ScrollArea>
			</div>
		</div>
	);
}

function SavedSoundsView() {
	const {
		savedSounds,
		isLoadingSavedSounds,
		savedSoundsError,
		loadSavedSounds,
		clearSavedSounds,
	} = useSoundsStore();

	const [playingId, setPlayingId] = useState<string | null>(null);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const stopPreview = useCallback(() => {
		audioRef.current?.pause();
		audioRef.current = null;
		setPlayingId(null);
	}, []);

	const [showClearDialog, setShowClearDialog] = useState(false);

	useEffect(() => {
		loadSavedSounds();
	}, [loadSavedSounds]);

	useEffect(() => {
		return () => {
			audioRef.current?.pause();
		};
	}, []);

	const playSound = ({ sound }: { sound: SoundEffect }) => {
		if (playingId === sound.id) {
			stopPreview();
			return;
		}

		stopPreview();

		if (sound.previewUrl) {
			const audio = new Audio(sound.previewUrl);
			audio.addEventListener("ended", () => {
				setPlayingId(null);
			});
			audio.addEventListener("error", () => {
				setPlayingId(null);
			});
			audio.play().catch((error) => {
				console.error("Failed to play sound preview:", error);
				setPlayingId(null);
			});

			audioRef.current = audio;
			setPlayingId(sound.id);
		}
	};

	const convertToSoundEffect = ({
		savedSound,
	}: {
		savedSound: SavedSound;
	}): SoundEffect => ({
		id: savedSound.id,
		name: savedSound.name,
		description: "",
		url: "",
		previewUrl: savedSound.previewUrl,
		downloadUrl: savedSound.downloadUrl,
		duration: savedSound.duration,
		filesize: 0,
		type: "audio",
		channels: 0,
		bitrate: 0,
		bitdepth: 0,
		samplerate: 0,
		username: savedSound.username,
		tags: savedSound.tags,
		license: savedSound.license,
		created: savedSound.savedAt,
		downloads: 0,
		rating: 0,
		ratingCount: 0,
	});

	if (isLoadingSavedSounds) {
		return (
			<div className="flex h-full items-center justify-center">
				<div className="text-muted-foreground text-sm">
					Loading saved sounds...
				</div>
			</div>
		);
	}

	if (savedSoundsError) {
		return (
			<div className="flex h-full items-center justify-center">
				<div className="text-destructive text-sm">
					Error: {savedSoundsError}
				</div>
			</div>
		);
	}

	if (savedSounds.length === 0) {
		return (
			<div className="bg-background flex h-full flex-col items-center justify-center gap-3 p-4">
				<HugeiconsIcon
					icon={FavouriteIcon}
					className="text-muted-foreground size-10"
				/>
				<div className="flex flex-col gap-2 text-center">
					<p className="text-lg font-medium">No saved sounds</p>
					<p className="text-muted-foreground text-sm text-balance">
						Click the heart icon on any sound to save it here
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="mt-1 flex h-full flex-col gap-5">
			<div className="flex items-center justify-between">
				<p className="text-muted-foreground text-sm">
					{savedSounds.length} saved{" "}
					{savedSounds.length === 1 ? "sound" : "sounds"}
				</p>
				<Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
					<DialogTrigger asChild>
						<Button
							variant="text"
							size="sm"
							className="text-muted-foreground hover:text-destructive h-auto !opacity-100"
						>
							Clear all
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Clear all saved sounds?</DialogTitle>
							<DialogDescription>
								This will permanently remove all {savedSounds.length} saved
								sounds from your collection. This action cannot be undone.
							</DialogDescription>
						</DialogHeader>
						<DialogFooter>
							<Button variant="text" onClick={() => setShowClearDialog(false)}>
								Cancel
							</Button>
							<Button
								variant="destructive"
								onClick={async (event: React.MouseEvent<HTMLButtonElement>) => {
									event.stopPropagation();
									await clearSavedSounds();
									setShowClearDialog(false);
								}}
							>
								Clear all sounds
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>

			<div className="relative h-full overflow-hidden">
				<ScrollArea className="h-full flex-1">
					<div className="flex flex-col gap-4">
						{savedSounds.map((sound) => (
							<AudioItem
								key={sound.id}
								sound={convertToSoundEffect({ savedSound: sound })}
								isPlaying={playingId === sound.id}
								onPlay={playSound}
							/>
						))}
					</div>
				</ScrollArea>
			</div>
		</div>
	);
}

interface AudioItemProps {
	sound: SoundEffect;
	isPlaying: boolean;
	onPlay: ({ sound }: { sound: SoundEffect }) => void;
}

function AudioItem({ sound, isPlaying, onPlay }: AudioItemProps) {
	const { addSoundToTimeline, isSoundSaved, toggleSavedSound } =
		useSoundsStore();
	const isSaved = isSoundSaved({ soundId: sound.id });

	const handleClick = () => {
		onPlay({ sound });
	};

	const handleSaveClick = (event: React.MouseEvent<HTMLButtonElement>) => {
		event.stopPropagation();
		void toggleSavedSound({ soundEffect: sound });
	};

	const handleAddToTimeline = async (event: React.MouseEvent<HTMLButtonElement>) => {
		event.stopPropagation();
		await addSoundToTimeline({ sound });
	};

	return (
		<div className="group flex items-center gap-3 opacity-100 hover:opacity-75">
			<button
				type="button"
				className="flex min-w-0 flex-1 items-center gap-3 text-left"
				onClick={handleClick}
			>
				<div className="bg-accent relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md">
					<div className="from-primary/20 absolute inset-0 bg-gradient-to-br to-transparent" />
					{isPlaying ? (
						<HugeiconsIcon icon={PauseIcon} className="size-5" />
					) : (
						<HugeiconsIcon icon={PlayIcon} className="size-5" />
					)}
				</div>

				<div className="min-w-0 flex-1 overflow-hidden">
					<p className="truncate text-sm font-medium">{sound.name}</p>
					<span className="text-muted-foreground block truncate text-xs">
						{sound.duration > 0 ? `${sound.duration.toFixed(1)}s · ` : ""}
						{sound.description || sound.username}
					</span>
				</div>
			</button>

			<div className="flex items-center gap-3 pr-2">
				<Button
					variant="text"
					size="icon"
					className="text-muted-foreground hover:text-foreground w-auto !opacity-100"
					onClick={handleAddToTimeline}
					title="Add to timeline"
				>
					<HugeiconsIcon icon={PlusSignIcon} />
				</Button>
				<Button
					variant="text"
					size="icon"
					className={`hover:text-foreground w-auto !opacity-100 ${
						isSaved
							? "text-red-500 hover:text-red-600"
							: "text-muted-foreground"
					}`}
					onClick={handleSaveClick}
					title={isSaved ? "Remove from saved" : "Save sound"}
				>
					<HugeiconsIcon
						icon={FavouriteIcon}
						className={`${isSaved ? "fill-current" : ""}`}
					/>
				</Button>
			</div>
		</div>
	);
}
