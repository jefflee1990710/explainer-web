import assert from "node:assert/strict";
import test from "node:test";
import { ROOM_HISTORY_LIMIT, recentRoomVersions } from "@/presentation/components/app/room/room-history-panel";

test("room history keeps the 20 newest looks, newest first", () => {
  const versions = Array.from({ length: 25 }, (_, index) => ({
    id: `v${index}`,
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
  }));
  const recent = recentRoomVersions(versions);
  assert.equal(ROOM_HISTORY_LIMIT, 20);
  assert.equal(recent.length, 20);
  assert.equal(recent[0]!.id, "v24");
  assert.equal(recent[19]!.id, "v5");
});
