type SlotElement = {
	id: string;
	type: string;
	name: string;
	startTime: number;
	duration: number;
	scroClipNumber?: number;
};

function clipNumberFromElement({ element }: { element: SlotElement }) {
	if (typeof element.scroClipNumber === "number" && element.scroClipNumber > 0) {
		return element.scroClipNumber;
	}
	const match = /^clip\s+(\d+)\b/i.exec(element.name.trim());
	return match ? Number(match[1]) : null;
}

// Each spoken line goes on its "Clip N" video (or still placeholder). Unnamed clips fill the rest in timeline order.
export function matchSubtitleSlots<T extends SlotElement>({
	elements,
	clipNumbers,
}: {
	elements: T[];
	clipNumbers: number[];
}): Map<number, T> {
	const clips = elements.filter(
		(element) =>
			(element.type === "video" || element.type === "image") &&
			element.duration > 0,
	);
	const used = new Set<string>();
	const slots = new Map<number, T>();
	for (const clipNumber of clipNumbers) {
		const hit = clips.find(
			(element) =>
				!used.has(element.id) &&
				clipNumberFromElement({ element }) === clipNumber,
		);
		if (!hit) continue;
		used.add(hit.id);
		slots.set(clipNumber, hit);
	}
	const leftovers = clips
		.filter(
			(element) =>
				!used.has(element.id) && clipNumberFromElement({ element }) == null,
		)
		.sort((a, b) => a.startTime - b.startTime);
	const missing = clipNumbers.filter((clipNumber) => !slots.has(clipNumber));
	missing.forEach((clipNumber, index) => {
		const element = leftovers[index];
		if (element) slots.set(clipNumber, element);
	});
	return slots;
}

// Names this panel gives its subtitle elements, so a second Generate replaces them cleanly.
export function isScroSubtitleName({ name }: { name: string }) {
	return /^Subtitle \d+(?:[.-]\d+)?$/.test(name);
}
