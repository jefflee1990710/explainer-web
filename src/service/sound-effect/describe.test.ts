import assert from "node:assert/strict";
import { test } from "node:test";
import { KENNEY_FAMILIES } from "@/service/sound-effect/kenney-catalog";
import {
  describeKenneySound,
  isKenneySoundFile,
  parseKenneyStem,
} from "@/service/sound-effect/describe";

test("parseKenneyStem keeps separated and bare variant numbers", () => {
  assert.deepEqual(parseKenneyStem("Audio/impactGlass_light_002.ogg"), {
    family: "impactGlass_light",
    variant: "002",
  });
  assert.deepEqual(parseKenneyStem("powerUp10.ogg"), {
    family: "powerUp",
    variant: "10",
  });
  assert.deepEqual(parseKenneyStem("zapTwoTone2.ogg"), {
    family: "zapTwoTone",
    variant: "2",
  });
  assert.deepEqual(parseKenneyStem("card-shuffle.ogg"), {
    family: "card-shuffle",
    variant: null,
  });
});

test("describeKenneySound says when to use the sound", () => {
  const click = describeKenneySound("interface-sounds", "click_001.ogg");
  assert.match(click.description, /button click/);
  assert.match(click.description, /按鈕/);
  assert.equal(click.name, "UI click 001");

  const smash = describeKenneySound("impact-sounds", "impactGlass_heavy_001.ogg");
  assert.match(smash.description, /breaking/);
  assert.match(smash.description, /玻璃碎裂/);

  const tone = describeKenneySound("interface-sounds", "glass_001.ogg");
  assert.match(tone.description, /not glass breaking/);
});

test("pack previews are not sound effects", () => {
  assert.equal(isKenneySoundFile("Preview.ogg"), false);
  assert.equal(isKenneySoundFile("Audio/click_001.ogg"), true);
  assert.equal(isKenneySoundFile("License.txt"), false);
});

test("every catalog entry can describe a file", () => {
  assert.equal(Object.keys(KENNEY_FAMILIES).length, 122);
  for (const key of Object.keys(KENNEY_FAMILIES)) {
    const slash = key.indexOf("/");
    const pack = key.slice(0, slash);
    const family = key.slice(slash + 1);
    const described = describeKenneySound(pack, `${family}.ogg`);
    assert.ok(described.description.includes("CC0"));
  }
});
