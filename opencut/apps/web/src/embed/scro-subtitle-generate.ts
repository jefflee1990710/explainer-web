import { scroEmbedParentOrigin } from "@/embed/scro-embed-parent";

export type ScroSubtitlePlateResult = { clipNumber: number; url: string };

const GENERATE_TIMEOUT_MS = 8 * 60 * 1000;

// Ask the Scro parent to run subtitle plate jobs and return PNG URLs.
export function requestScroSubtitlePlates(input: {
	videoId: string;
	textStyleId: string;
	clipNumbers: number[];
}): Promise<ScroSubtitlePlateResult[]> {
	const origin = scroEmbedParentOrigin();
	if (!origin) return Promise.reject(new Error("Not embedded in Scro"));

	return new Promise((resolve, reject) => {
		const timeout = window.setTimeout(() => {
			window.removeEventListener("message", onMessage);
			reject(new Error("Subtitle generation timed out"));
		}, GENERATE_TIMEOUT_MS);

		const onMessage = (event: MessageEvent) => {
			if (event.origin !== origin) return;
			const data = event.data as {
				type?: string;
				videoId?: string;
				ok?: boolean;
				plates?: ScroSubtitlePlateResult[];
				error?: string;
			};
			if (data?.type !== "scro-subtitle-generate-result" || data.videoId !== input.videoId) return;
			window.clearTimeout(timeout);
			window.removeEventListener("message", onMessage);
			if (!data.ok) {
				reject(new Error(data.error || "Subtitle generation failed"));
				return;
			}
			resolve(data.plates ?? []);
		};

		window.addEventListener("message", onMessage);
		window.parent.postMessage(
			{
				type: "scro-subtitle-generate",
				videoId: input.videoId,
				textStyleId: input.textStyleId,
				clipNumbers: input.clipNumbers,
			},
			origin,
		);
	});
}
