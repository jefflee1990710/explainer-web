"use client";

import { useEffect, useRef, useState } from "react";
import { Spinner } from "@/opencut/components/ui/spinner";
import { useI18n } from "@/presentation/components/i18n-provider";
import { cn } from "@/opencut/utils/ui";

/** Centered spinner while a thumbnail or preview frame is still loading. */
export function MediaLoadingMark({
	className,
	spinnerClassName,
}: {
	className?: string;
	spinnerClassName?: string;
}) {
	const { t } = useI18n();

	return (
		<div
			className={cn(
				"pointer-events-none absolute inset-0 z-[1] grid place-items-center text-muted-foreground",
				className,
			)}
			role="status"
			aria-live="polite"
			aria-busy="true"
			aria-label={t("common.loading")}
		>
			<Spinner className={spinnerClassName} />
		</div>
	);
}

/** Fill image that keeps a spinner up until the file has painted. */
export function LoadingMediaImage({
	src,
	alt,
	className,
}: {
	src: string;
	alt: string;
	className?: string;
}) {
	return (
		<LoadingMediaImageInner
			key={src}
			src={src}
			alt={alt}
			className={className}
		/>
	);
}

function LoadingMediaImageInner({
	src,
	alt,
	className,
}: {
	src: string;
	alt: string;
	className?: string;
}) {
	const imageRef = useRef<HTMLImageElement>(null);
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		const image = imageRef.current;
		if (image?.complete && image.naturalWidth > 0) setLoaded(true);
	}, [src]);

	return (
		<>
			{loaded ? null : <MediaLoadingMark />}
			<img
				ref={imageRef}
				src={src}
				alt={alt}
				className={cn(
					"absolute inset-0 size-full",
					className,
					!loaded && "opacity-0",
				)}
				onLoad={(event) => {
					if (event.currentTarget.naturalWidth > 0) setLoaded(true);
				}}
				onError={() => setLoaded(true)}
			/>
		</>
	);
}

/** True once `src` has decoded, so a CSS filmstrip can wait for the same file. */
export function useMediaImageReady(src: string | undefined) {
	const [ready, setReady] = useState(false);

	useEffect(() => {
		if (!src) {
			setReady(false);
			return;
		}
		let cancelled = false;
		setReady(false);
		const image = new Image();
		const finish = () => {
			if (!cancelled) setReady(true);
		};
		image.onload = finish;
		image.onerror = finish;
		image.src = src;
		if (image.complete && image.naturalWidth > 0) finish();
		return () => {
			cancelled = true;
		};
	}, [src]);

	return ready;
}
