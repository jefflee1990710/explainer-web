import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cropKeys,
  piecewiseExpr,
  reframeCropSize,
  reframeFilter,
  reframeOutputSize,
  reframeSampleTimes,
  smoothSubjectTrack,
} from "@/service/canvas/core/smart-reframe";

describe("smart reframe math", () => {
  it("samples about one frame a second, capped at 16", () => {
    assert.deepEqual(reframeSampleTimes(2), [0.5, 1.5]);
    assert.equal(reframeSampleTimes(60).length, 16);
  });

  it("picks the largest window of the target shape and the output size", () => {
    assert.deepEqual(reframeCropSize(1920, 1080, "9:16"), { w: 606, h: 1080 });
    assert.deepEqual(reframeCropSize(1080, 1920, "16:9"), { w: 1080, h: 606 });
    assert.deepEqual(reframeOutputSize("9:16", "1080p"), { w: 1080, h: 1920 });
    assert.deepEqual(reframeOutputSize("4:5", "720p"), { w: 720, h: 900 });
  });

  it("holds one framing in steady mode and fills missing samples", () => {
    const track = smoothSubjectTrack(
      [
        { t: 0, x: 0.3, y: 0.4 },
        { t: 1, x: null, y: null },
        { t: 2, x: 0.32, y: 0.42 },
      ],
      "steady",
    );
    assert.ok(track.every((p) => p.x === track[0]!.x && p.y === track[0]!.y));
    const center = smoothSubjectTrack([{ t: 0, x: null, y: null }], "follow");
    assert.deepEqual(center, [{ t: 0, x: 0.5, y: 0.5 }]);
  });

  it("clamps the crop inside the frame and escapes the filter", () => {
    const crop = { w: 606, h: 1080 };
    const keys = cropKeys([{ t: 0, x: 0, y: 0.5 }, { t: 2, x: 1, y: 0.5 }], 1920, 1080, crop);
    assert.deepEqual(keys, [{ t: 0, x: 0, y: 0 }, { t: 2, x: 1314, y: 0 }]);
    assert.equal(piecewiseExpr([{ t: 0, v: 5 }, { t: 1, v: 5 }]), "5");
    const filter = reframeFilter(keys, crop, { w: 1080, h: 1920 });
    assert.match(filter, /^crop=606:1080:if\(lt\(t\\,0\)\\,0\\,/);
    assert.ok(filter.endsWith(":0,scale=1080:1920,setsar=1"));
  });
});
