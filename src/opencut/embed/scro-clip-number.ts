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
	if (asset.scroClipNumber != null) {
		return acceptedClipNumber({ clipNumber: asset.scroClipNumber, clips });
	}
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

type ScroAssetCarrier = Pick<
	MediaAsset,
	"id" | "name" | "type" | "scroClipNumber" | "scroPlaceholder"
>;

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
	if (element.scroClipNumber != null) {
		return acceptedClipNumber({ clipNumber: element.scroClipNumber, clips });
	}
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

/** True when the timeline element belongs to a ScroVideo storyboard clip. */
export function isScroElement({
	element,
	assets,
	clips,
}: {
	element: ClipCarrier;
	assets: Array<Partial<ScroAssetCarrier> & Pick<MediaAsset, "id" | "name">>;
	clips: ScroVideoSeedClip[] | undefined;
}): boolean {
	return resolveElementScroClipNumber({ element, assets, clips }) != null;
}

/** True once the ScroVideo clip has a confirmed generated video on the timeline. */
export function isScroClipVideoReady({
	element,
	assets,
	clips,
}: {
	element: ClipCarrier;
	assets: Array<Partial<ScroAssetCarrier> & Pick<MediaAsset, "id" | "name">>;
	clips: ScroVideoSeedClip[] | undefined;
}): boolean {
	const clipNumber = resolveElementScroClipNumber({ element, assets, clips });
	if (clipNumber == null) return true;
	if (element.type !== "video") return false;
	const asset = element.mediaId
		? assets.find((item) => item.id === element.mediaId)
		: undefined;
	if (asset && ((asset.type != null && asset.type !== "video") || asset.scroPlaceholder === true)) {
		return false;
	}
	const clip = clips?.find((item) => item.clipNumber === clipNumber);
	if (clip) {
		if (clip.staleVideo) return false;
		if (clip.stage !== "video_ready") return false;
	}
	return true;
}

/** Before a ScroVideo clip's video is generated, the user cannot edit it on the timeline. */
export function isScroClipEditLocked({
	element,
	assets,
	clips,
}: {
	element: ClipCarrier;
	assets: Array<Partial<ScroAssetCarrier> & Pick<MediaAsset, "id" | "name">>;
	clips: ScroVideoSeedClip[] | undefined;
}): boolean {
	if (!isScroElement({ element, assets, clips })) return false;
	return !isScroClipVideoReady({ element, assets, clips });
}

/** True when a ScroVideo media asset does not have its generated video ready yet. */
export function isScroAssetEditLocked({
	asset,
	clips,
}: {
	asset: Pick<MediaAsset, "name" | "type" | "scroClipNumber" | "scroPlaceholder">;
	clips: ScroVideoSeedClip[] | undefined;
}): boolean {
	const clipNumber = resolveScroClipNumber({ asset, clips });
	if (clipNumber == null) return false;
	if (asset.type !== "video" || asset.scroPlaceholder === true) return true;
	const clip = clips?.find((item) => item.clipNumber === clipNumber);
	if (clip && (clip.stage !== "video_ready" || Boolean(clip.staleVideo))) {
		return true;
	}
	return false;
}

/** Before video is generated, ScroVideo clips keep their storyboard length and cannot be trimmed. */
export function isScroClipLengthLocked({
	element,
	assets,
	clips,
}: {
	element: ClipCarrier;
	assets: Array<Partial<ScroAssetCarrier> & Pick<MediaAsset, "id" | "name">>;
	clips: ScroVideoSeedClip[] | undefined;
}): boolean {
	return isScroClipEditLocked({ element, assets, clips });
}
