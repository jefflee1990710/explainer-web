type SlotElement = {
	id: string;
	type: string;
	name: string;
	startTime: number;
	duration: number;
};

function clipNumberFromName({ name }: { name: string }) {
	const match = /^clip\s+(\d+)\b/i.exec(name.trim());
	return match ? Number(match[1]) : null;
}

// Each spoken line goes on its "Clip N" video. Unnamed videos fill the rest in timeline order.
export function matchSubtitleSlots<T extends SlotElement>({
	elements,
	clipNumbers,
}: {
	elements: T[];
	clipNumbers: number[];
}): Map<number, T> {
	const videos = elements.filter((element) => element.type === "video" && element.duration > 0);
	const used = new Set<string>();
	const slots = new Map<number, T>();
	for (const clipNumber of clipNumbers) {
		const hit = videos.find(
			(element) => !used.has(element.id) && clipNumberFromName({ name: element.name }) === clipNumber,
		);
		if (!hit) continue;
		used.add(hit.id);
		slots.set(clipNumber, hit);
	}
	const leftovers = videos
		.filter((element) => !used.has(element.id) && clipNumberFromName({ name: element.name }) == null)
		.sort((a, b) => a.startTime - b.startTime);
	const missing = clipNumbers.filter((clipNumber) => !slots.has(clipNumber));
	missing.forEach((clipNumber, index) => {
		const element = leftovers[index];
		if (element) slots.set(clipNumber, element);
	});
	return slots;
}

// Names this panel gives its images, so a second Generate replaces them.
export function isScroSubtitleName({ name }: { name: string }) {
	return /^Subtitle \d+$/.test(name);
}
