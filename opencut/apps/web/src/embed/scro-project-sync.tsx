"use client";

import { useEffect, useRef } from "react";
import { useEditor } from "@/editor/use-editor";
import { processMediaAssets } from "@/media/processing";
import { storageService } from "@/services/storage/service";
import type { TProject } from "@/project/types";
import {
	armScroSync,
	readClipSources,
	rememberClipSource,
	writeSeen,
	readSeen,
} from "@/embed/scro-media-sources";

const PARENT_ORIGINS = new Set([
	"http://localhost:3000",
	"http://127.0.0.1:3000",
	"https://www.scro.io",
	"https://scro.io",
]);

type RemoteMedia = {
	id: string;
	name: string;
	type: "image" | "video" | "audio";
	sourceUrl: string;
	width?: number;
	height?: number;
	duration?: number;
};

type RestoreMessage = {
	type: "scro-restore";
	videoId: string;
	project: TProject;
	media: RemoteMedia[];
	updatedAt: string;
};

function isEmbed() {
	return new URLSearchParams(window.location.search).get("embed") === "1";
}

function parentOrigin() {
	if (!document.referrer) return null;
	try {
		const origin = new URL(document.referrer).origin;
		return PARENT_ORIGINS.has(origin) ? origin : null;
	} catch {
		return null;
	}
}

function videoIdFromProject(projectId: string) {
	return projectId.startsWith("scro-") ? projectId.slice("scro-".length) : "";
}

function hasTimeline(project: TProject) {
	for (const scene of project.scenes ?? []) {
		const tracks = scene.tracks;
		if (!tracks) continue;
		if (tracks.main?.elements?.length) return true;
		if (tracks.overlay?.some((track) => track.elements.length > 0)) return true;
		if (tracks.audio?.some((track) => track.elements.length > 0)) return true;
	}
	return false;
}

function plainProject(project: TProject) {
	return JSON.parse(
		JSON.stringify(project, (key, value) => {
			if (key === "buffer" || key === "file" || key === "thumbnail" || key === "thumbnailUrl") {
				return undefined;
			}
			return value;
		}),
	) as Record<string, unknown>;
}

function asProject(raw: TProject): TProject {
	return {
		...raw,
		metadata: {
			...raw.metadata,
			createdAt: new Date(raw.metadata.createdAt),
			updatedAt: new Date(raw.metadata.updatedAt),
		},
		scenes: (raw.scenes ?? []).map((scene) => ({
			...scene,
			createdAt: new Date(scene.createdAt),
			updatedAt: new Date(scene.updatedAt),
		})),
	};
}

// Writes the timeline to Scro's Mongo document, and reloads it on the next open.
export function ScroProjectSync() {
	const editor = useEditor();
	const armed = useRef(false);
	const restoring = useRef(false);

	useEffect(() => {
		if (!isEmbed()) return;
		const origin = parentOrigin();
		if (!origin) return;

		const postSave = () => {
			if (!armed.current || restoring.current) return;
			const project = editor.project.getActiveOrNull();
			const videoId = project ? videoIdFromProject(project.metadata.id) : "";
			if (!project || !videoId || !hasTimeline(project)) return;
			let plain: Record<string, unknown>;
			try {
				plain = plainProject(project);
			} catch {
				return;
			}
			const sources = readClipSources(videoId);
			const media = [];
			const uploads = [];
			for (const asset of editor.media.getAssets()) {
				const sourceUrl = sources[asset.id];
				if (sourceUrl) {
					media.push({
						id: asset.id,
						name: asset.name,
						type: asset.type,
						sourceUrl,
						width: asset.width,
						height: asset.height,
						duration: asset.duration,
					});
					continue;
				}
				if (asset.file && asset.file.size > 0 && asset.file.size <= 25_000_000) {
					uploads.push({
						id: asset.id,
						name: asset.name,
						type: asset.type,
						width: asset.width,
						height: asset.height,
						duration: asset.duration,
						blob: asset.file,
					});
				}
			}
			window.parent.postMessage(
				{ type: "scro-project-save", videoId, project: plain, media, uploads },
				origin,
			);
		};

		let timer = 0;
		const schedule = () => {
			if (!armed.current || restoring.current) return;
			window.clearTimeout(timer);
			timer = window.setTimeout(postSave, 1200);
		};
		const onArm = () => {
			armed.current = true;
			schedule();
		};

		const stopProject = editor.project.subscribe(schedule);
		const stopMedia = editor.media.subscribe(schedule);
		window.addEventListener("scro-sync-arm", onArm);

		const onMessage = (event: MessageEvent) => {
			if (!PARENT_ORIGINS.has(event.origin)) return;
			const data = event.data as RestoreMessage;
			if (!data || data.type !== "scro-restore" || !data.videoId || !data.project) return;
			void restore(data, event.origin);
		};
		window.addEventListener("message", onMessage);

		return () => {
			window.clearTimeout(timer);
			stopProject();
			stopMedia();
			window.removeEventListener("scro-sync-arm", onArm);
			window.removeEventListener("message", onMessage);
		};

		async function restore(data: RestoreMessage, replyOrigin: string) {
			if (restoring.current) return;
			const local = editor.project.getActiveOrNull();
			const remoteTime = Date.parse(data.updatedAt);
			const localTime = local?.metadata.updatedAt.getTime() ?? 0;
			if (local && hasTimeline(local) && localTime > remoteTime) {
				armed.current = true;
				postSave();
				window.parent.postMessage(
					{ type: "scro-restore-done", sourceUrls: Object.values(readClipSources(data.videoId)) },
					replyOrigin,
				);
				return;
			}

			restoring.current = true;
			try {
				const projectId = `scro-${data.videoId}`;
				for (const item of data.media ?? []) {
					if (!item.sourceUrl || !item.id) continue;
					rememberClipSource(data.videoId, item.id, item.sourceUrl);
					const existing = await storageService.loadMediaAsset({ projectId, id: item.id });
					if (existing) continue;
					const response = await fetch(item.sourceUrl);
					if (!response.ok) continue;
					const blob = await response.blob();
					const file = new File([blob], item.name, { type: blob.type || "video/mp4" });
					const processed = await processMediaAssets({ files: [file] });
					const asset = processed[0];
					if (!asset) continue;
					await storageService.saveMediaAsset({
						projectId,
						mediaAsset: { ...asset, id: item.id },
					});
				}
				const seen = readSeen(data.videoId);
				for (const item of data.media ?? []) {
					if (item.sourceUrl) seen.add(item.sourceUrl);
				}
				writeSeen(data.videoId, seen);
				await storageService.saveProject({ project: asProject(data.project) });
				await editor.project.loadProject({ id: projectId });
				window.parent.postMessage(
					{
						type: "scro-restore-done",
						sourceUrls: (data.media ?? []).map((item) => item.sourceUrl).filter(Boolean),
					},
					replyOrigin,
				);
			} catch (error) {
				console.error("Failed to restore Scro edit:", error);
				window.parent.postMessage({ type: "scro-restore-done", sourceUrls: [] }, replyOrigin);
			} finally {
				restoring.current = false;
				armScroSync();
			}
		}
	}, [editor]);

	return null;
}
