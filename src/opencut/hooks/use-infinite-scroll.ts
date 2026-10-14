import { useCallback, useEffect, useRef } from "react";

interface UseInfiniteScrollOptions {
	onLoadMore: () => void;
	hasMore: boolean;
	isLoading: boolean;
	threshold?: number;
	enabled?: boolean;
}

export function useInfiniteScroll({
	onLoadMore,
	hasMore,
	isLoading,
	threshold = 200,
	enabled = true,
}: UseInfiniteScrollOptions) {
	const scrollAreaRef = useRef<HTMLDivElement>(null);

	const handleScroll = useCallback(
		(event: React.UIEvent<HTMLDivElement>) => {
			if (!enabled) return;

			const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
			const nearBottom = scrollTop + clientHeight >= scrollHeight - threshold;

			if (nearBottom && hasMore && !isLoading) {
				onLoadMore();
			}
		},
		[onLoadMore, hasMore, isLoading, threshold, enabled],
	);

	// Element scroll does not bubble, so listen on the scroller itself.
	useEffect(() => {
		const el = scrollAreaRef.current;
		if (!el || !enabled) return;

		const onScroll = () => {
			if (!hasMore || isLoading) return;
			const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - threshold;
			if (nearBottom) onLoadMore();
		};

		el.addEventListener("scroll", onScroll, { passive: true });
		onScroll();
		return () => el.removeEventListener("scroll", onScroll);
	}, [enabled, hasMore, isLoading, onLoadMore, threshold]);

	return { scrollAreaRef, handleScroll };
}
