import assert from "node:assert/strict";
import test from "node:test";
import {
  LOOK_DIALOG_PAGE_SIZE,
  filterLookDialogOptions,
  nextLookDialogCount,
  pageLookDialogOptions,
} from "@/presentation/components/app/characters/character-look-dialog-list";

const options = [
  { id: "tee", name: "Heavyweight Tee" },
  { id: "hoodie", name: "Streetwear Hoodie" },
  { id: "blazer", name: "Double-Breasted Blazer" },
];

test("search matches the option name and ignores case", () => {
  const found = filterLookDialogOptions({
    options,
    query: "  HOODIE ",
    favouriteIds: new Set(),
    favouritesOnly: false,
  });
  assert.deepEqual(found.map((option) => option.id), ["hoodie"]);
});

test("favourites stay first and the favourites filter hides the rest", () => {
  const ranked = filterLookDialogOptions({
    options,
    query: "",
    favouriteIds: new Set(["blazer"]),
    favouritesOnly: false,
  });
  assert.deepEqual(ranked.map((option) => option.id), ["blazer", "tee", "hoodie"]);

  const only = filterLookDialogOptions({
    options,
    query: "blaz",
    favouriteIds: new Set(["blazer", "tee"]),
    favouritesOnly: true,
  });
  assert.deepEqual(only.map((option) => option.id), ["blazer"]);
});

test("the dialog pages a fixed batch and stops at the end", () => {
  const many = Array.from({ length: 30 }, (_, index) => ({
    id: `item-${index}`,
    name: `Item ${index}`,
  }));
  assert.equal(pageLookDialogOptions(many, LOOK_DIALOG_PAGE_SIZE).length, LOOK_DIALOG_PAGE_SIZE);
  assert.equal(nextLookDialogCount(LOOK_DIALOG_PAGE_SIZE, many.length), 30);
  assert.equal(nextLookDialogCount(30, many.length), 30);
});

test("tag filters and description search narrow the grid", () => {
  const tagged = [
    { id: "tee", name: "Heavyweight Tee", description: "casual cotton tee", tags: ["casual"] },
    {
      id: "skort",
      name: "Peek-A-Boo Skort",
      description: "pickleball court skort",
      tags: ["pickleball", "athletic"],
    },
  ];
  const byTag = filterLookDialogOptions({
    options: tagged,
    query: "",
    favouriteIds: new Set(),
    favouritesOnly: false,
    tags: ["pickleball"],
  });
  assert.deepEqual(byTag.map((option) => option.id), ["skort"]);

  const byDesc = filterLookDialogOptions({
    options: tagged,
    query: "cotton",
    favouriteIds: new Set(),
    favouritesOnly: false,
  });
  assert.deepEqual(byDesc.map((option) => option.id), ["tee"]);
});
