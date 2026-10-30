import assert from "node:assert/strict";
import { test } from "node:test";
import { SCRO_ADMIN_EMAIL } from "@/service/academy/admin";
import { directorKeptPrivate, directorVisibleToEmail } from "@/service/director/director-visibility";

const talkingHead = {
  slug: "talking-head-director",
  hiddenInPicker: false,
  isActive: true,
  requireActive: true,
};

test("a switched-off director stays visible only to the operator email", () => {
  const privateSlugs = new Set(["talking-head-director"]);
  assert.equal(
    directorVisibleToEmail({ ...talkingHead, privateSlugs, email: SCRO_ADMIN_EMAIL }),
    true,
  );
  assert.equal(
    directorVisibleToEmail({ ...talkingHead, privateSlugs, email: "  Jeff.Lee.1990710@Gmail.com  " }),
    true,
  );
  assert.equal(
    directorVisibleToEmail({ ...talkingHead, privateSlugs, email: "someone@example.com" }),
    false,
  );
  assert.equal(directorKeptPrivate("talking-head-director", privateSlugs, "someone@example.com"), true);
  assert.equal(directorKeptPrivate("talking-head-director", privateSlugs, SCRO_ADMIN_EMAIL), false);
});

test("a switched-on director follows the hardcoded picker flag", () => {
  const privateSlugs = new Set<string>();
  assert.equal(
    directorVisibleToEmail({
      slug: "story-short-director",
      hiddenInPicker: false,
      isActive: true,
      requireActive: true,
      privateSlugs,
      email: "someone@example.com",
    }),
    true,
  );
  assert.equal(
    directorVisibleToEmail({
      slug: "surprise-interview-director",
      hiddenInPicker: true,
      isActive: true,
      requireActive: true,
      privateSlugs,
      email: SCRO_ADMIN_EMAIL,
    }),
    false,
  );
});

test("switching off a picker-hidden director lets only the operator see it", () => {
  const privateSlugs = new Set(["surprise-interview-director"]);
  assert.equal(
    directorVisibleToEmail({
      slug: "surprise-interview-director",
      hiddenInPicker: true,
      isActive: true,
      requireActive: true,
      privateSlugs,
      email: SCRO_ADMIN_EMAIL,
    }),
    true,
  );
  assert.equal(
    directorVisibleToEmail({
      slug: "surprise-interview-director",
      hiddenInPicker: true,
      isActive: true,
      requireActive: true,
      privateSlugs,
      email: "someone@example.com",
    }),
    false,
  );
});
