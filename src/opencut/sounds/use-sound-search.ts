import { useEffect, useRef } from "react";
import { listSoundEffectsAction } from "@/presentation/actions/sound-effects";
import { useSoundsStore } from "@/opencut/sounds/sounds-store";
import type { SoundEffect } from "@/opencut/sounds/types";
import type { LibrarySound } from "@/service/sound-effect/library";

function toEditorSound(sound: LibrarySound): SoundEffect {
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
		channels: 0,
		bitrate: 0,
		bitdepth: 0,
		samplerate: 0,
		username: sound.username,
		tags: sound.tags,
		license: sound.license,
		created: "",
		downloads: 0,
		rating: 0,
		ratingCount: 0,
	};
}

export function useSoundSearch({ query }: { query: string }) {
	const {
		searchResults,
		isSearching,
		searchError,
		currentPage,
		hasNextPage,
		isLoadingMore,
		totalCount,
		showCommercialOnly,
		selectedCategory,
		selectedSource,
		setTopSoundEffects,
		setLoading,
		setHasLoaded,
		setSearchResults,
		setSearching,
		setSearchError,
		setLastSearchQuery,
		setCurrentPage,
		setHasNextPage,
		setTotalCount,
		setLoadingMore,
		appendSearchResults,
		appendTopSounds,
		resetPagination,
	} = useSoundsStore();
	const loadingMoreRef = useRef(false);

	const loadMore = async () => {
		if (loadingMoreRef.current || isLoadingMore || !hasNextPage) return;
		loadingMoreRef.current = true;
		const nextPage = currentPage + 1;
		const categoryAtStart = selectedCategory;
		const sourceAtStart = selectedSource;
		const queryAtStart = query.trim();
		const commercialAtStart = showCommercialOnly;
		const stillCurrent = () => {
			const latest = useSoundsStore.getState();
			return (
				latest.selectedCategory === categoryAtStart &&
				latest.selectedSource === sourceAtStart &&
				latest.searchQuery.trim() === queryAtStart &&
				latest.showCommercialOnly === commercialAtStart
			);
		};

		try {
			setLoadingMore({ loading: true });
			const page = await listSoundEffectsAction({
				page: nextPage,
				query,
				category: selectedCategory,
				source: selectedSource,
				commercialOnly: showCommercialOnly,
			});
			// A filter change replaced this page; do not append the old one.
			if (!stillCurrent()) return;
			if (!page.ok) {
				setSearchError({ error: page.error });
				return;
			}

			const sounds = page.results.map(toEditorSound);
			if (query.trim()) {
				appendSearchResults({ results: sounds });
			} else {
				appendTopSounds({ results: sounds });
			}

			setCurrentPage({ page: nextPage });
			setHasNextPage({ hasNext: page.hasNext && sounds.length > 0 });
			setTotalCount({ count: page.count });
		} catch (err) {
			if (!stillCurrent()) return;
			setSearchError({
				error: err instanceof Error ? err.message : "Load more failed",
			});
		} finally {
			loadingMoreRef.current = false;
			if (stillCurrent()) setLoadingMore({ loading: false });
		}
	};

	useEffect(() => {
		let ignore = false;
		const trimmed = query.trim();
		const timeoutId = setTimeout(async () => {
			try {
				if (trimmed) setSearching({ searching: true });
				else setLoading({ loading: true });
				setSearchError({ error: null });
				resetPagination();

				const page = await listSoundEffectsAction({
					page: 1,
					query: trimmed,
					category: selectedCategory,
					source: selectedSource,
					commercialOnly: showCommercialOnly,
				});
				if (ignore) return;
				if (!page.ok) {
					setSearchError({ error: page.error });
					return;
				}

				const sounds = page.results.map(toEditorSound);
				if (trimmed) {
					setSearchResults({ results: sounds });
				} else {
					setTopSoundEffects({ sounds });
					setSearchResults({ results: [] });
					setHasLoaded({ loaded: true });
				}
				setLastSearchQuery({ query: trimmed });
				setHasNextPage({ hasNext: page.hasNext });
				setTotalCount({ count: page.count });
				setCurrentPage({ page: 1 });
			} catch (err) {
				if (!ignore) {
					setSearchError({
						error: err instanceof Error ? err.message : "Search failed",
					});
				}
			} finally {
				if (!ignore) {
					setSearching({ searching: false });
					setLoading({ loading: false });
				}
			}
		}, trimmed ? 300 : 0);

		return () => {
			clearTimeout(timeoutId);
			ignore = true;
		};
	}, [
		query,
		showCommercialOnly,
		selectedCategory,
		selectedSource,
		resetPagination,
		setCurrentPage,
		setHasLoaded,
		setHasNextPage,
		setLastSearchQuery,
		setLoading,
		setSearchError,
		setSearchResults,
		setSearching,
		setTopSoundEffects,
		setTotalCount,
	]);

	return {
		results: searchResults,
		isLoading: isSearching,
		error: searchError,
		loadMore,
		hasNextPage,
		isLoadingMore,
		totalCount,
	};
}
