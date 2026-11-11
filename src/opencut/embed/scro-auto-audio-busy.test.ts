import assert from "node:assert/strict";
import { test } from "node:test";
import { autoAudioLaneForTrack } from "./scro-auto-audio-busy";

test("auto audio loading maps only the named SFX and BGM rows", () => {
	assert.equal(autoAudioLaneForTrack({ type: "audio", name: "SFX" }), "sfx");
	assert.equal(autoAudioLaneForTrack({ type: "audio", name: "BGM" }), "bgm");
	assert.equal(autoAudioLaneForTrack({ type: "audio", name: "Audio track" }), null);
	assert.equal(autoAudioLaneForTrack({ type: "video", name: "SFX" }), null);
});
