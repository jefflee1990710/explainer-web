const FILL = "#f4f4f5";
const CARD = "#ffffff";
const LINE = "#d4d4d8";
const INK = "#12141c";
const MUTED = "#5c6170";

export type StillPlaceholderSize = { width: number; height: number };

/** Draw a still-waiting frame. A 1×1 fill reads as a solid color when stretched. */
export function drawStillPlaceholder(
	context: CanvasRenderingContext2D,
	{
		name,
		width,
		height,
	}: StillPlaceholderSize & {
		name: string;
	},
) {
	context.clearRect(0, 0, width, height);
	context.fillStyle = FILL;
	context.fillRect(0, 0, width, height);

	const short = Math.min(width, height);
	const margin = Math.round(short * 0.08);
	const radius = Math.round(short * 0.045);
	traceRoundRect(context, {
		x: margin,
		y: margin,
		width: width - margin * 2,
		height: height - margin * 2,
		radius,
	});
	context.fillStyle = CARD;
	context.fill();
	context.strokeStyle = LINE;
	context.lineWidth = Math.max(2, Math.round(short * 0.004));
	context.stroke();

	const icon = Math.round(short * 0.16);
	const title = Math.round(short * 0.052);
	const sub = Math.round(short * 0.028);
	const gap = Math.round(short * 0.028);
	const block = icon + gap + title + Math.round(gap * 0.7) + sub;
	let top = (height - block) / 2;

	drawFrameIcon(context, { cx: width / 2, cy: top + icon / 2, size: icon });
	top += icon + gap;

	context.textAlign = "center";
	context.textBaseline = "top";
	context.fillStyle = INK;
	context.font = `600 ${title}px ui-sans-serif, system-ui, sans-serif`;
	context.fillText(name, width / 2, top);
	top += title + Math.round(gap * 0.65);

	context.fillStyle = MUTED;
	context.font = `500 ${sub}px ui-sans-serif, system-ui, sans-serif`;
	context.fillText("Waiting for stills", width / 2, top);
}

/** PNG stand-in at the storyboard frame size, named without a fake extension. */
export async function stillPlaceholderFile({
	name,
	width,
	height,
}: StillPlaceholderSize & { name: string }): Promise<File> {
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext("2d");
	if (!context) throw new Error("Could not draw the still placeholder");
	drawStillPlaceholder(context, { name, width, height });
	const blob = await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob((next) => {
			if (next) resolve(next);
			else reject(new Error("Could not encode the still placeholder"));
		}, "image/png");
	});
	return new File([blob], `${name}.png`, { type: "image/png" });
}

function drawFrameIcon(
	context: CanvasRenderingContext2D,
	{ cx, cy, size }: { cx: number; cy: number; size: number },
) {
	const x = cx - size / 2;
	const y = cy - size / 2;
	const radius = size * 0.16;
	traceRoundRect(context, { x, y, width: size, height: size, radius });
	context.fillStyle = FILL;
	context.fill();
	context.strokeStyle = LINE;
	context.lineWidth = Math.max(2, size * 0.035);
	context.stroke();

	context.fillStyle = MUTED;
	context.beginPath();
	context.arc(x + size * 0.32, y + size * 0.34, size * 0.08, 0, Math.PI * 2);
	context.fill();

	context.strokeStyle = MUTED;
	context.lineWidth = Math.max(2, size * 0.04);
	context.lineJoin = "round";
	context.lineCap = "round";
	context.beginPath();
	context.moveTo(x + size * 0.18, y + size * 0.74);
	context.lineTo(x + size * 0.4, y + size * 0.52);
	context.lineTo(x + size * 0.55, y + size * 0.66);
	context.lineTo(x + size * 0.72, y + size * 0.46);
	context.lineTo(x + size * 0.84, y + size * 0.74);
	context.stroke();
}

function traceRoundRect(
	context: CanvasRenderingContext2D,
	{
		x,
		y,
		width,
		height,
		radius,
	}: {
		x: number;
		y: number;
		width: number;
		height: number;
		radius: number;
	},
) {
	context.beginPath();
	context.roundRect(x, y, width, height, radius);
}
