/** Stacking index on a track label. The top row is layer 1. */
export function TrackLayerNumber({ layer }: { layer: number }) {
	return (
		<span className="text-muted-foreground text-xs tabular-nums leading-none">
			{layer}
		</span>
	);
}
