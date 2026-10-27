import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ROOM_COLUMN_MAX,
  ROOM_COLUMN_MIN,
  ROOM_LEFT_WIDTH_DEFAULT,
  clampRoomColumnWidth,
  readRoomColumnWidth,
} from "@/presentation/components/app/room/room-column-width";

test("room column width stays inside the drag range", () => {
  assert.equal(readRoomColumnWidth(null, ROOM_LEFT_WIDTH_DEFAULT), ROOM_LEFT_WIDTH_DEFAULT);
  assert.equal(readRoomColumnWidth("", ROOM_LEFT_WIDTH_DEFAULT), ROOM_LEFT_WIDTH_DEFAULT);
  assert.equal(readRoomColumnWidth("nope", ROOM_LEFT_WIDTH_DEFAULT), ROOM_LEFT_WIDTH_DEFAULT);
  assert.equal(readRoomColumnWidth("320", ROOM_LEFT_WIDTH_DEFAULT), 320);
  assert.equal(clampRoomColumnWidth(80, ROOM_LEFT_WIDTH_DEFAULT), ROOM_COLUMN_MIN);
  assert.equal(clampRoomColumnWidth(2000, ROOM_LEFT_WIDTH_DEFAULT), ROOM_COLUMN_MAX);
});
