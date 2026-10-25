import assert from "node:assert/strict";
import test from "node:test";
import { isScroAdminEmail, SCRO_ADMIN_EMAIL } from "@/service/academy/admin";

test("isScroAdminEmail only accepts the hardcoded operator inbox", () => {
  assert.equal(isScroAdminEmail(SCRO_ADMIN_EMAIL), true);
  assert.equal(isScroAdminEmail("  Jeff.Lee.1990710@Gmail.com  "), true);
  assert.equal(isScroAdminEmail("someone@example.com"), false);
  assert.equal(isScroAdminEmail(""), false);
  assert.equal(isScroAdminEmail(null), false);
  assert.equal(isScroAdminEmail(undefined), false);
});
