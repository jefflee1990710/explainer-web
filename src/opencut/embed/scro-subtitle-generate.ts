import { scroEmbedParentOrigin } from "@/opencut/embed/scro-embed-parent";
import { listenFromScro, sendToScro } from "@/opencut/embed/scro-transport";

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
		let stop = () => {};
		const timeout = window.setTimeout(() => {
			stop();
			reject(new Error("Subtitle generation timed out"));
		}, GENERATE_TIMEOUT_MS);

		stop = listenFromScro((payload, eventOrigin) => {
			if (eventOrigin !== origin) return;
			const data = payload as {
				type?: string;
				videoId?: string;
				ok?: boolean;
				plates?: ScroSubtitlePlateResult[];
				error?: string;
			};
			if (data?.type !== "scro-subtitle-generate-result" || data.videoId !== input.videoId) return;
			window.clearTimeout(timeout);
			stop();
			if (!data.ok) {
				reject(new Error(data.error || "Subtitle generation failed"));
				return;
			}
			resolve(data.plates ?? []);
		}, new Set([origin]));

		sendToScro(
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
