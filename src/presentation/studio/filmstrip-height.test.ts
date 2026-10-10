import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FILMSTRIP_HEIGHT_DEFAULT,
  FILMSTRIP_HEIGHT_MAX,
  FILMSTRIP_HEIGHT_MIN,
  clampFilmstripHeight,
  readFilmstripHeight,
} from "@/presentation/studio/filmstrip-height";

test("clip preview height defaults to 300 and stays inside the drag range", () => {
  assert.equal(readFilmstripHeight(null), FILMSTRIP_HEIGHT_DEFAULT);
  assert.equal(readFilmstripHeight(""), FILMSTRIP_HEIGHT_DEFAULT);
  assert.equal(readFilmstripHeight("nope"), FILMSTRIP_HEIGHT_DEFAULT);
  assert.equal(readFilmstripHeight("180"), 180);
  assert.equal(clampFilmstripHeight(20), FILMSTRIP_HEIGHT_MIN);
  assert.equal(clampFilmstripHeight(900), FILMSTRIP_HEIGHT_MAX);
});
