import { loadEnvConfig } from "@next/env";
import { access, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { generateImage } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import sharp from "sharp";
import { adjustmentEffectDefinitions, lookEffectDefinitions } from "@/opencut/effects/definitions/adjustments";
import { blurEffectDefinition } from "@/opencut/effects/definitions/blur";
import { transitionEffectDefinitions } from "@/opencut/effects/definitions/transitions";
import { EDITOR_PREVIEW_SOURCE_PROMPT, editorPreviewEditPrompt } from "@/opencut/effects/preview-art";

loadEnvConfig(process.cwd());

const MODEL = process.env.CHARACTER_LOOK_PREVIEW_MODEL || "gemini-2.5-flash-image";
const OUT_DIR = path.join(process.cwd(), "public", "editor-previews");
const SOURCE_FILE = path.join(OUT_DIR, "source.webp");
const EFFECT_PREVIEW = path.join(process.cwd(), "public", "effects", "preview.jpg");
const force = process.argv.includes("--force");

function googleImage() {
	const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
	if (!apiKey) throw new Error("尚未設定 GOOGLE_GENERATIVE_AI_API_KEY");
	return createGoogleGenerativeAI({ apiKey }).image(MODEL);
}

async function exists(file: string) {
	try {
		await access(file);
		return true;
	} catch {
		return false;
	}
}

const items = [
	blurEffectDefinition,
	...lookEffectDefinitions,
	...adjustmentEffectDefinitions,
	...transitionEffectDefinitions,
].map((definition) => ({
	category: definition.category ?? "effect",
	type: definition.type,
	preview: definition.preview,
}));

async function generateStill(prompt: string | { images: string[]; text: string }) {
	let lastError: unknown;
	for (let attempt = 0; attempt < 2; attempt++) {
		try {
			const { image } = await generateImage({
				model: googleImage(),
				prompt,
				aspectRatio: "1:1",
			});
			return Buffer.from(image.uint8Array);
		} catch (error) {
			lastError = error;
		}
	}
	throw lastError;
}

async function writeSource() {
	if (!force && (await exists(SOURCE_FILE)) && (await exists(EFFECT_PREVIEW))) {
		console.log("skip source");
		return;
	}
	console.log("generate source…");
	const raw = await generateStill(EDITOR_PREVIEW_SOURCE_PROMPT);
	await sharp(raw).resize(1024, 1024, { fit: "cover" }).webp({ quality: 84 }).toFile(SOURCE_FILE);
	await mkdir(path.dirname(EFFECT_PREVIEW), { recursive: true });
	await sharp(raw).resize(640, 640, { fit: "cover" }).jpeg({ quality: 86 }).toFile(EFFECT_PREVIEW);
	console.log("  ✓ source");
}

async function writeItem(item: (typeof items)[number], sourceUrl: string) {
	const file = path.join(OUT_DIR, `${item.category}-${item.type}.webp`);
	if (!force && (await exists(file))) {
		console.log(`skip ${item.category}/${item.type}`);
		return;
	}
	console.log(`generate ${item.category}/${item.type}…`);
	const raw = await generateStill({
		images: [sourceUrl],
		text: editorPreviewEditPrompt(item.preview),
	});
	await sharp(raw).resize(512, 512, { fit: "cover" }).webp({ quality: 82 }).toFile(file);
	console.log(`  ✓ ${path.relative(process.cwd(), file)}`);
}

async function main() {
	await mkdir(OUT_DIR, { recursive: true });
	await writeSource();
	const source = await readFile(SOURCE_FILE);
	const sourceUrl = `data:image/webp;base64,${source.toString("base64")}`;
	let failed = 0;
	for (const item of items) {
		try {
			await writeItem(item, sourceUrl);
		} catch (error) {
			failed += 1;
			console.error(
				`  ✗ ${item.category}/${item.type}:`,
				error instanceof Error ? error.message : error,
			);
		}
	}
	process.exit(failed ? 1 : 0);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
