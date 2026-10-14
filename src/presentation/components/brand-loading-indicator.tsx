import Image from "next/image";
import "./brand-loading-indicator.css";

type BrandLoadSize = "sm" | "md" | "lg";

function sizeClass(size: BrandLoadSize) {
	if (size === "sm") return "brand-load--sm";
	if (size === "lg") return "brand-load--lg";
	return "";
}

/**
 * Animated Scro mark for loading states.
 * Reuse anywhere a branded wait affordance is needed.
 */
export function BrandLoadingIndicator({
	label,
	size = "md",
	className = "",
}: {
	/** Optional caption under the mark; omit for icon-only. */
	label?: string;
	size?: BrandLoadSize;
	className?: string;
}) {
	return (
		<div
			className={`flex flex-col items-center gap-3 ${className}`.trim()}
			role="status"
			aria-live="polite"
			aria-busy="true"
			aria-label={label || "Loading"}
		>
			<div className={`brand-load ${sizeClass(size)}`.trim()}>
				<span className="brand-load__glow" aria-hidden />
				<span className="brand-load__orbit" aria-hidden>
					<svg className="brand-load__ring" viewBox="0 0 48 48">
						<circle cx="24" cy="24" r="21" />
					</svg>
					<span className="brand-load__spark" />
				</span>
				<span className="brand-load__mark">
					<Image
						src="/logo-mark.png"
						alt=""
						width={160}
						height={160}
						priority
						unoptimized
					/>
				</span>
			</div>
			{label ? (
				<p className="text-sm text-[var(--studio-muted,var(--muted))]">{label}</p>
			) : null}
		</div>
	);
}

/** Full-slot centered brand loader (editor panes, dynamic imports). */
export function BrandLoadingCenter({
	label,
	size = "md",
	className = "",
}: {
	label?: string;
	size?: BrandLoadSize;
	className?: string;
}) {
	return (
		<div
			className={`grid min-h-[12rem] w-full flex-1 place-items-center bg-[var(--studio-canvas,var(--background))] ${className}`.trim()}
		>
			<BrandLoadingIndicator label={label} size={size} />
		</div>
	);
}
