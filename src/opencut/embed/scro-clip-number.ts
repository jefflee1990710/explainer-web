import type { ScroVideoSeedClip } from "@/opencut/embed/scro-video-types";
import type { MediaAsset } from "@/opencut/media/types";

/** Timeline or asset label "Clip 3" / "Clip 3.mp4". */
export function clipNumberFromName(name: string): number | null {
	const match = /^Clip\s+(\d+)/i.exec(name.trim());
	if (!match) return null;
	const clipNumber = Number(match[1]);
	return Number.isInteger(clipNumber) ? clipNumber : null;
}

/** Drop a parsed number when the storyboard does not contain that clip. */
function acceptedClipNumber({
	clipNumber,
	clips,
}: {
	clipNumber: number;
	clips: ScroVideoSeedClip[] | undefined;
}): number | null {
	if (clips && clips.length > 0 && !clips.some((clip) => clip.clipNumber === clipNumber)) {
		return null;
	}
	return clipNumber;
}

/** Resolve clipNumber from asset field or "Clip N" / "Clip N.mp4" name. */
export function resolveScroClipNumber({
	asset,
	clips,
}: {
	asset: Pick<MediaAsset, "name" | "scroClipNumber">;
	clips: ScroVideoSeedClip[] | undefined;
}): number | null {
	if (asset.scroClipNumber != null) return asset.scroClipNumber;
	const fromName = clipNumberFromName(asset.name);
	if (fromName == null) return null;
	return acceptedClipNumber({ clipNumber: fromName, clips });
}

type ClipCarrier = {
	type: string;
	name: string;
	mediaId?: string;
	scroClipNumber?: number;
};

/**
 * Timeline elements restored from an older edit often lack scroClipNumber.
 * Fall back to the media asset, then to the "Clip N.mp4" label.
 */
export function resolveElementScroClipNumber({
	element,
	assets,
	clips,
}: {
	element: ClipCarrier;
	assets: Array<Pick<MediaAsset, "id" | "name" | "scroClipNumber">>;
	clips: ScroVideoSeedClip[] | undefined;
}): number | null {
	if (element.type !== "video" && element.type !== "image") return null;
	if (element.scroClipNumber != null) return element.scroClipNumber;
	const asset = element.mediaId
		? assets.find((item) => item.id === element.mediaId)
		: undefined;
	if (asset) {
		const fromAsset = resolveScroClipNumber({ asset, clips });
		if (fromAsset != null) return fromAsset;
	}
	const fromName = clipNumberFromName(element.name);
	if (fromName == null) return null;
	return acceptedClipNumber({ clipNumber: fromName, clips });
}
