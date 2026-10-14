import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	freesoundBrowse,
	freesoundCommercialFilter,
	freesoundHitToLibrarySound,
	parseFreesoundSearchPage,
} from "@/service/freesound/search";

const hit = {
	id: 42,
	name: "Door creak",
	username: "ada",
	license: "Creative Commons 0",
	duration: 1.25,
	tags: ["door", 3],
	description: "A long\ncreak.",
	previews: {
		"preview-hq-mp3": "https://cdn.freesound.org/previews/0/42_hq.mp3",
		"preview-lq-mp3": "https://cdn.freesound.org/previews/0/42_lq.mp3",
	},
};

describe("freesound search", () => {
	it("browses popular sounds until the user types a query", () => {
		assert.deepEqual(freesoundBrowse({ query: "  " }), {
			query: "",
			sort: "downloads_desc",
		});
		assert.deepEqual(freesoundBrowse({ query: "door" }), {
			query: "door",
			sort: "score",
		});
	});

	it("keeps noncommercial licenses out when the commercial filter is on", () => {
		assert.equal(
			freesoundCommercialFilter(true),
			'license:("Creative Commons 0" OR Attribution)',
		);
		assert.equal(freesoundCommercialFilter(false), undefined);
	});

	it("reads a license URL and drops HTML from the description", () => {
		const sound = freesoundHitToLibrarySound({
			...hit,
			license: "http://creativecommons.org/publicdomain/zero/1.0/",
			description: 'Wind <a href="https://example.com">swash</a>.',
		});
		assert.ok(sound);
		assert.equal(sound.description, "ada · CC0 · Wind swash.");
	});

	it("maps a hit to an editor row and credits the author", () => {
		const sound = freesoundHitToLibrarySound(hit);
		assert.ok(sound);
		assert.equal(sound.id, "fs-42");
		assert.equal(sound.previewUrl, "https://cdn.freesound.org/previews/0/42_hq.mp3");
		assert.equal(sound.username, "ada");
		assert.match(sound.description, /^ada · CC0 · A long creak\./);
		assert.deepEqual(sound.tags, ["door"]);
	});

	it("reads the page and skips hits that have no preview", () => {
		const page = parseFreesoundSearchPage({
			count: 2,
			next: "https://freesound.org/apiv2/search/?page=2",
			results: [hit, { id: 7, name: "Silent", previews: {} }],
		});
		assert.ok(page);
		assert.equal(page.count, 2);
		assert.equal(page.hasNext, true);
		assert.equal(page.results.length, 1);
	});
});
