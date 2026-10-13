"use client";

import { useEffect, useRef } from "react";
import { useEditor } from "@/opencut/editor/use-editor";
import { downloadBuffer, getExportMimeType } from "@/opencut/export";
import { DEFAULT_EXPORT_OPTIONS } from "@/opencut/export/defaults";
import { isScroEmbed, listenFromScro, scroHost, sendToScro } from "@/opencut/embed/scro-transport";

// Pages allowed to ask this embedded editor to export.
const PARENT_ORIGINS = new Set([
	"http://localhost:3000",
	"http://127.0.0.1:3000",
	"https://www.scro.io",
	"https://scro.io",
]);

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

// Scro's summary-row button posts scro-export. This renders the timeline and downloads it.
export function ScroExportBridge() {
	const editor = useEditor();
	const exporting = useRef(false);
	const exportState = useEditor((state) => state.project.getExportState());

	useEffect(() => {
		if (!isScroEmbed()) return;
		const origin = parentOrigin();
		if (!origin) return;
		sendToScro(
			{
				type: "scro-export-progress",
				exporting: exportState.isExporting,
				progress: exportState.progress,
			},
			origin,
		);
	}, [exportState]);

	useEffect(() => {
		if (!isScroEmbed()) return;

		return listenFromScro((payload, origin) => {
			const data = payload as { type?: string; filename?: string };
			if (data?.type !== "scro-export") return;
			const filename =
				typeof data.filename === "string" && data.filename.trim()
					? data.filename.trim()
					: "video.mp4";
			void runExport(origin, filename);
		}, PARENT_ORIGINS);

		async function runExport(origin: string, filename: string) {
			if (exporting.current) return;
			const project = editor.project.getActiveOrNull();
			if (!project) {
				sendToScro({ type: "scro-export-error" }, origin);
				return;
			}
			exporting.current = true;
			try {
				const result = await editor.project.export({
					options: {
						...DEFAULT_EXPORT_OPTIONS,
						fps: project.settings.fps,
					},
				});
				if (result.cancelled) return;
				if (result.success && result.buffer) {
					downloadBuffer({
						buffer: result.buffer,
						filename,
						mimeType: getExportMimeType({ format: "mp4" }),
					});
					sendToScro({ type: "scro-export-done" }, origin);
				} else {
					sendToScro({ type: "scro-export-error" }, origin);
				}
				editor.project.clearExportState();
			} catch {
				sendToScro({ type: "scro-export-error" }, origin);
			} finally {
				exporting.current = false;
			}
		}
	}, [editor]);

	return null;
}
