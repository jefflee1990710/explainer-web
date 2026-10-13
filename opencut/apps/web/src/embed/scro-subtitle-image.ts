// Local PNG of one spoken line. The video stays visible around the lettering.
// This does not call a generation API.

type LookPaint = {
	fontFamily: string;
	fontWeight: string;
	fill: string;
	stroke?: string;
	lineWidthRatio?: number;
	band: string;
	alternateBand?: string;
	alternateFill?: string;
	glow?: string;
	glitch?: boolean;
	hollow?: boolean;
	shadow?: boolean;
};

const LOOKS: Record<string, LookPaint> = {
	bold: {
		fontFamily: '"Arial Black", Impact, sans-serif',
		fontWeight: "900",
		fill: "#ffffff",
		stroke: "#171717",
		lineWidthRatio: 0.07,
		band: "#f2c200",
	},
	clean: {
		fontFamily: '"Arial Narrow", "Arial Black", Impact, sans-serif',
		fontWeight: "700",
		fill: "#ffffff",
		band: "#111111",
		alternateBand: "#b6f23a",
		alternateFill: "#111111",
	},
	handwritten: {
		fontFamily: '"Marker Felt", "Bradley Hand", "Segoe Print", cursive',
		fontWeight: "400",
		fill: "#161616",
		band: "#fffdf8",
	},
	neon: {
		fontFamily: '"Arial Black", Impact, sans-serif',
		fontWeight: "700",
		fill: "#7af6ff",
		band: "rgba(0,0,0,0.55)",
		glow: "#22e7ff",
	},
	comic: {
		fontFamily: '"Arial Black", Impact, sans-serif',
		fontWeight: "900",
		fill: "#ffe14a",
		stroke: "#111111",
		lineWidthRatio: 0.1,
		band: "transparent",
	},
	chalk: {
		fontFamily: '"Segoe Print", "Bradley Hand", cursive',
		fontWeight: "400",
		fill: "#f4f1e6",
		band: "#1c4d38",
	},
	gold: {
		fontFamily: 'Georgia, "Times New Roman", serif',
		fontWeight: "700",
		fill: "#e6c36a",
		stroke: "#6a4a12",
		lineWidthRatio: 0.03,
		band: "#0d0d0d",
	},
	typewriter: {
		fontFamily: '"Courier New", Courier, monospace',
		fontWeight: "400",
		fill: "#1a1a1a",
		band: "#f3e6c8",
	},
	graffiti: {
		fontFamily: '"Arial Black", Impact, sans-serif',
		fontWeight: "900",
		fill: "#ff4fa3",
		stroke: "#111111",
		lineWidthRatio: 0.08,
		band: "#8d8d8d",
	},
	sticker: {
		fontFamily: '"Arial Rounded MT Bold", "Arial Black", sans-serif',
		fontWeight: "700",
		fill: "#e10600",
		band: "#ffffff",
		shadow: true,
	},
	glitch: {
		fontFamily: '"Courier New", Courier, monospace',
		fontWeight: "700",
		fill: "#ffffff",
		band: "#050505",
		glitch: true,
	},
	brush: {
		fontFamily: '"Snell Roundhand", "Brush Script MT", cursive',
		fontWeight: "700",
		fill: "#1a1a1a",
		band: "#f7f1e6",
	},
	outline: {
		fontFamily: '"Arial Black", Impact, sans-serif',
		fontWeight: "900",
		fill: "transparent",
		stroke: "#1b2a6b",
		lineWidthRatio: 0.09,
		band: "rgba(255,255,255,0.72)",
		hollow: true,
	},
};

function wrapText({
	ctx,
	text,
	maxWidth,
}: {
	ctx: CanvasRenderingContext2D;
	text: string;
	maxWidth: number;
}): string[] {
	const normalized = text.trim().replace(/\s+/g, " ");
	if (!normalized) return [];
	const spaced = normalized.includes(" ");
	const tokens = spaced ? normalized.split(" ") : [...normalized];
	const joiner = spaced ? " " : "";
	const lines: string[] = [];
	let current = "";

	const pushToken = (token: string) => {
		const next = current ? current + joiner + token : token;
		if (ctx.measureText(next).width <= maxWidth) {
			current = next;
			return;
		}
		if (current) lines.push(current);
		if (!spaced || ctx.measureText(token).width <= maxWidth) {
			current = token;
			return;
		}
		current = "";
		for (const char of token) {
			const grown = current + char;
			if (current && ctx.measureText(grown).width > maxWidth) {
				lines.push(current);
				current = char;
			} else {
				current = grown;
			}
		}
	};

	for (const token of tokens) pushToken(token);
	if (current) lines.push(current);
	return lines;
}

function fillRoundRect({
	ctx,
	x,
	y,
	width,
	height,
	radius,
}: {
	ctx: CanvasRenderingContext2D;
	x: number;
	y: number;
	width: number;
	height: number;
	radius: number;
}) {
	const r = Math.min(radius, width / 2, height / 2);
	ctx.beginPath();
	ctx.roundRect(x, y, width, height, r);
	ctx.fill();
}

function paintLine({
	ctx,
	paint,
	line,
	cx,
	cy,
	fontSize,
	fill,
}: {
	ctx: CanvasRenderingContext2D;
	paint: LookPaint;
	line: string;
	cx: number;
	cy: number;
	fontSize: number;
	fill: string;
}) {
	ctx.lineJoin = "round";
	ctx.miterLimit = 2;
	if (paint.glitch) {
		ctx.fillStyle = "#ff2a2a";
		ctx.fillText(line, cx - fontSize * 0.04, cy);
		ctx.fillStyle = "#22e0ff";
		ctx.fillText(line, cx + fontSize * 0.04, cy);
		ctx.fillStyle = "#ffffff";
		ctx.fillText(line, cx, cy);
		return;
	}
	if (paint.glow) {
		ctx.shadowColor = paint.glow;
		ctx.shadowBlur = fontSize * 0.45;
	}
	if (paint.stroke && !paint.hollow) {
		ctx.lineWidth = fontSize * (paint.lineWidthRatio ?? 0.08);
		ctx.strokeStyle = paint.stroke;
		ctx.strokeText(line, cx, cy);
	}
	if (paint.hollow && paint.stroke) {
		ctx.lineWidth = fontSize * (paint.lineWidthRatio ?? 0.08);
		ctx.strokeStyle = paint.stroke;
		ctx.strokeText(line, cx, cy);
	} else {
		ctx.fillStyle = fill;
		ctx.fillText(line, cx, cy);
	}
	ctx.shadowBlur = 0;
}

// Full-frame transparent PNG. 9:16 and 1:1 sit on 62% of the height. 16:9 sits above an 8% bottom inset.
export function renderSubtitlePng({
	text,
	look,
	width,
	height,
}: {
	text: string;
	look: string;
	width: number;
	height: number;
}): Promise<Blob> {
	const canvas = document.createElement("canvas");
	canvas.width = Math.max(2, Math.round(width));
	canvas.height = Math.max(2, Math.round(height));
	const ctx = canvas.getContext("2d");
	if (!ctx) return Promise.reject(new Error("Canvas unavailable"));

	const paint = LOOKS[look] ?? LOOKS.handwritten;
	const maxWidth = Math.round(canvas.width * 0.78);
	const wide = canvas.width > canvas.height * 1.2;
	const maxBlock = Math.round(canvas.height * (wide ? 0.36 : 0.3));
	let fontSize = Math.round(canvas.height * (wide ? 0.08 : 0.052));
	let lines: string[] = [text.trim()];

	while (fontSize >= 22) {
		ctx.font = `${paint.fontWeight} ${fontSize}px ${paint.fontFamily}`;
		lines = wrapText({ ctx, text, maxWidth: maxWidth - fontSize });
		const block = lines.length * fontSize * 1.28;
		if (lines.length > 0 && lines.length <= 4 && block <= maxBlock) break;
		fontSize -= 2;
	}
	if (lines.length === 0) lines = [text.trim()];

	const lineHeight = fontSize * 1.28;
	const blockHeight = lines.length * lineHeight;
	const top = wide
		? canvas.height - canvas.height * 0.08 - blockHeight
		: canvas.height * 0.62 - blockHeight / 2;

	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = `${paint.fontWeight} ${fontSize}px ${paint.fontFamily}`;

	lines.forEach((line, index) => {
		const measured = ctx.measureText(line).width;
		const bandWidth = Math.min(maxWidth, measured + fontSize * 0.9);
		const bandHeight = lineHeight * 0.92;
		const x = (canvas.width - bandWidth) / 2;
		const y = top + index * lineHeight + (lineHeight - bandHeight) / 2;
		const band = index % 2 === 1 && paint.alternateBand ? paint.alternateBand : paint.band;
		const fill = index % 2 === 1 && paint.alternateFill ? paint.alternateFill : paint.fill;
		if (band !== "transparent") {
			ctx.save();
			if (paint.shadow) {
				ctx.shadowColor = "rgba(0,0,0,0.35)";
				ctx.shadowBlur = 14;
				ctx.shadowOffsetY = 6;
			}
			ctx.fillStyle = band;
			fillRoundRect({
				ctx,
				x,
				y,
				width: bandWidth,
				height: bandHeight,
				radius: fontSize * 0.2,
			});
			ctx.restore();
		}
		paintLine({
			ctx,
			paint,
			line,
			cx: canvas.width / 2,
			cy: y + bandHeight / 2,
			fontSize,
			fill,
		});
	});

	return new Promise((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (blob) resolve(blob);
			else reject(new Error("Could not draw the subtitle"));
		}, "image/png");
	});
}
