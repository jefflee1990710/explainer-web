import { describe, expect, test } from "bun:test";
import { isScroSubtitleName, matchSubtitleSlots } from "@/embed/scro-subtitle-slots";

const video = (id: string, name: string, startTime: number, duration = 600000) => ({
	id,
	type: "video",
	name,
	startTime,
	duration,
});

describe("matchSubtitleSlots", () => {
	test("puts each line on its Clip N video, even after a reorder", () => {
		const slots = matchSubtitleSlots({
			elements: [video("b", "Clip 2.mp4", 0), video("a", "Clip 1.mp4", 600000)],
			clipNumbers: [1, 2],
		});
		expect(slots.get(1)?.id).toBe("a");
		expect(slots.get(2)?.id).toBe("b");
	});

	test("unnamed videos fill missing clips in timeline order; images are ignored", () => {
		const slots = matchSubtitleSlots({
			elements: [
				video("x", "my upload.mp4", 1200000),
				video("y", "another.mp4", 0),
				{ id: "img", type: "image", name: "Clip 3.png", startTime: 0, duration: 600000 },
			],
			clipNumbers: [3, 4, 5],
		});
		expect(slots.get(3)?.id).toBe("y");
		expect(slots.get(4)?.id).toBe("x");
		expect(slots.has(5)).toBe(false);
	});

	test("a zero-length video gets no subtitle", () => {
		const slots = matchSubtitleSlots({
			elements: [video("a", "Clip 1.mp4", 0, 0)],
			clipNumbers: [1],
		});
		expect(slots.size).toBe(0);
	});
});

test("only panel images count as old subtitles", () => {
	expect(isScroSubtitleName({ name: "Subtitle 3" })).toBe(true);
	expect(isScroSubtitleName({ name: "Subtitle 3.png" })).toBe(false);
	expect(isScroSubtitleName({ name: "Clip 1.mp4" })).toBe(false);
});
