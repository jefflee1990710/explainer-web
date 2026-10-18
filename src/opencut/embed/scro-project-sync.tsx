"use client";

import { useEffect, useRef } from "react";
import { useEditor } from "@/opencut/editor/use-editor";
import { processMediaAssets } from "@/opencut/media/processing";
import { storageService } from "@/opencut/services/storage/service";
import type { TProject } from "@/opencut/project/types";
import { applyScroCanvasSize } from "@/opencut/embed/scro-canvas-size";
import { resolveScroClipNumber } from "@/opencut/embed/scro-clip-number";
import {
	fetchMediaBlobWithTimeout,
	runConcurrentMediaPool,
} from "@/opencut/embed/scro-media-load";
import {
	armScroSync,
	readClipSources,
	rememberClipSource,
	writeSeen,
	readSeen,
} from "@/opencut/embed/scro-media-sources";
import { isScroEmbed, listenFromScro, scroHost, sendToScro } from "@/opencut/embed/scro-transport";
import { OPENCUT_AUTOSAVE_DELAY_MS } from "@/service/opencut/autosave";

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
	aspectRatio?: "9:16" | "16:9" | "1:1";
	project: TProject;
	media: RemoteMedia[];
	updatedAt: string;
};

function parentOrigin() {
	if (scroHost()) return window.location.origin;
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
		if (!isScroEmbed()) return;
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
				if (asset.scroPlaceholder) continue;
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
			sendToScro(
				{ type: "scro-project-save", videoId, project: plain, media, uploads },
				origin,
			);
		};

		let timer = 0;
		const schedule = () => {
			if (!armed.current || restoring.current) return;
			window.clearTimeout(timer);
			timer = window.setTimeout(postSave, OPENCUT_AUTOSAVE_DELAY_MS);
		};
		const onArm = () => {
			armed.current = true;
			schedule();
		};

		const stopProject = editor.project.subscribe(schedule);
		const stopScenes = editor.scenes.subscribe(schedule);
		const stopTimeline = editor.timeline.subscribe(schedule);
		const stopMedia = editor.media.subscribe(schedule);
		window.addEventListener("scro-sync-arm", onArm);

		const stopMessages = listenFromScro((payload, replyOrigin) => {
			const data = payload as RestoreMessage;
			if (!data || data.type !== "scro-restore" || !data.videoId || !data.project) return;
			void restore(data, replyOrigin);
		}, PARENT_ORIGINS);

		return () => {
			window.clearTimeout(timer);
			stopProject();
			stopScenes();
			stopTimeline();
			stopMedia();
			window.removeEventListener("scro-sync-arm", onArm);
			stopMessages();
		};

		async function restore(data: RestoreMessage, replyOrigin: string) {
			if (restoring.current) return;
			const local = editor.project.getActiveOrNull();
			const remoteTime = Date.parse(data.updatedAt);
			const localTime = local?.metadata.updatedAt.getTime() ?? 0;
			if (local && hasTimeline(local) && localTime > remoteTime) {
				await applyScroCanvasSize(editor, data.aspectRatio);
				sendToScro(
					{ type: "scro-restore-done", sourceUrls: Object.values(readClipSources(data.videoId)) },
					replyOrigin,
				);
				armScroSync();
				return;
			}

			restoring.current = true;
			try {
				const projectId = `scro-${data.videoId}`;
				const items = (data.media ?? []).filter((item) => item.sourceUrl && item.id);
				for (const item of items) {
					rememberClipSource(data.videoId, item.id, item.sourceUrl);
				}
				const seen = readSeen(data.videoId);
				for (const item of items) {
					if (item.sourceUrl) seen.add(item.sourceUrl);
				}
				writeSeen(data.videoId, seen);
				// Load project structure first, then save any missing media assets and reload media once.
				await storageService.saveProject({ project: asProject(data.project) });
				let savedAnyMedia = false;
				for (let index = 0; index < items.length; index++) {
					const item = items[index];
					sendToScro(
						{
							type: "scro-load-progress",
							videoId: data.videoId,
							current: index + 1,
							total: items.length,
							label: item.name,
						},
						replyOrigin,
					);
					const existing = await storageService.loadMediaAsset({ projectId, id: item.id });
					const itemClipNumber = resolveScroClipNumber({
						asset: { name: item.name },
						clips: undefined,
					});
					if (existing) {
						if (itemClipNumber != null && existing.scroClipNumber == null) {
							await storageService.saveMediaAsset({
								projectId,
								mediaAsset: { ...existing, scroClipNumber: itemClipNumber },
							});
						}
						continue;
					}
					const blob = await fetchMediaBlobWithTimeout({ url: item.sourceUrl });
					if (!blob) continue;
					const file = new File([blob], item.name, { type: blob.type || "video/mp4" });
					const processed = await processMediaAssets({ files: [file] });
					const asset = processed[0];
					if (!asset) continue;
					await storageService.saveMediaAsset({
						projectId,
						mediaAsset: {
							...asset,
							id: item.id,
							...(itemClipNumber != null ? { scroClipNumber: itemClipNumber } : {}),
						},
					});
					savedAnyMedia = true;
				}
				await editor.project.loadProject({ id: projectId });
				await applyScroCanvasSize(editor, data.aspectRatio);
				void savedAnyMedia;
				if (items.length > 0) {
					sendToScro(
						{
							type: "scro-load-progress",
							videoId: data.videoId,
							current: items.length,
							total: items.length,
							done: true,
						},
						replyOrigin,
					);
				}
				sendToScro(
					{
						type: "scro-restore-done",
						sourceUrls: items.map((item) => item.sourceUrl).filter(Boolean),
					},
					replyOrigin,
				);
			} catch (error) {
				console.error("Failed to restore Scro edit:", error);
				sendToScro({ type: "scro-restore-done", sourceUrls: [] }, replyOrigin);
			} finally {
				restoring.current = false;
				armScroSync();
			}
		}
	}, [editor]);

	return null;
}
