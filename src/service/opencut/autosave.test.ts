import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	OPENCUT_AUTOSAVE_DELAY_MS,
	beginAutosave,
	finishAutosave,
	type AutosaveQueue,
} from "@/service/opencut/autosave";

describe("opencut autosave", () => {
	it("waits 200ms after each update before saving", () => {
		assert.equal(OPENCUT_AUTOSAVE_DELAY_MS, 200);
	});

	it("starts a save on the first update and keeps the indicator up", () => {
		const idle: AutosaveQueue<string> = { busy: false, pending: null };
		const began = beginAutosave(idle, "cut-a");
		assert.equal(began.run, "cut-a");
		assert.deepEqual(began.queue, { busy: true, pending: null });
	});

	it("keeps the indicator up and stores the latest cut while a save is in flight", () => {
		const busy: AutosaveQueue<string> = { busy: true, pending: null };
		const began = beginAutosave(busy, "cut-b");
		assert.equal(began.run, null);
		assert.deepEqual(began.queue, { busy: true, pending: "cut-b" });
	});

	it("saves the queued cut next, then hides the indicator when the queue is empty", () => {
		const queued: AutosaveQueue<string> = { busy: true, pending: "cut-b" };
		const next = finishAutosave(queued);
		assert.equal(next.run, "cut-b");
		assert.equal(next.queue.busy, true);

		const done = finishAutosave(next.queue);
		assert.equal(done.run, null);
		assert.deepEqual(done.queue, { busy: false, pending: null });
	});
});
