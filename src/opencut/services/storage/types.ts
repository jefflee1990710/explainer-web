import type { MediaType } from "@/opencut/media/types";
import type {
	TProject,
	TProjectMetadata,
	TTimelineViewState,
} from "@/opencut/project/types";
import type { TScene } from "@/opencut/timeline";

export interface StorageAdapter<T> {
	get(key: string): Promise<T | null>;
	set(args: { key: string; value: T }): Promise<void>;
	remove(key: string): Promise<void>;
	list(): Promise<string[]>;
	clear(): Promise<void>;
}

export interface MediaAssetData {
	id: string;
	name: string;
	type: MediaType;
	size: number;
	lastModified: number;
	width?: number;
	height?: number;
	duration?: number;
	fps?: number;
	hasAudio?: boolean;
	ephemeral?: boolean;
	thumbnailUrl?: string;
	/** Remote HTTP(S) streaming URL when backed by a 0-byte placeholder File. */
	sourceUrl?: string;
	/** Scro storyboard clip this asset belongs to. */
	scroClipNumber?: number;
	/** Last known start-still URL for loading thumbs. */
	scroPosterUrl?: string;
	/** Drawn stand-in while this clip is still waiting for a frame. */
	scroPlaceholder?: boolean;
	/** Auto-detected leading silence (seconds) before speech onset. */
	speechTrimStart?: number;
	/** Auto-detected trailing silence (seconds) after speech ends. */
	speechTrimEnd?: number;
}

export type SerializedScene = Omit<TScene, "createdAt" | "updatedAt"> & {
	createdAt: string;
	updatedAt: string;
};

export type SerializedProjectMetadata = Omit<
	TProjectMetadata,
	"createdAt" | "updatedAt"
> & {
	createdAt: string;
	updatedAt: string;
};

export type SerializedProject = Omit<TProject, "metadata" | "scenes"> & {
	metadata: SerializedProjectMetadata;
	scenes: SerializedScene[];
	timelineViewState?: TTimelineViewState;
};

export interface StorageConfig {
	projectsDb: string;
	mediaDb: string;
	savedSoundsDb: string;
	version: number;
}

// TypeScript type augmentation to add async iterator methods to FileSystemDirectoryHandle
// These methods are part of the File System Access API spec but may not be in all type definitions
declare global {
	interface FileSystemDirectoryHandle {
		keys(): AsyncIterableIterator<string>;
		values(): AsyncIterableIterator<FileSystemHandle>;
		entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
	}
}
