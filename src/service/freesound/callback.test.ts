import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FREESOUND_PERMISSION_PATH,
  freesoundCallbackKind,
  parseFreesoundToken,
} from "@/service/freesound/callback";

describe("freesound callback", () => {
  it("uses the public permission-granted path", () => {
    assert.equal(
      FREESOUND_PERMISSION_PATH,
      "/_freesound/app_permissions/permission_granted",
    );
  });

  it("treats a denial, a bare visit, and a code as different steps", () => {
    assert.equal(
      freesoundCallbackKind({ code: null, error: "access_denied" }),
      "denied",
    );
    assert.equal(freesoundCallbackKind({ code: null, error: null }), "ready");
    assert.equal(
      freesoundCallbackKind({ code: "abc", error: null }),
      "exchange",
    );
  });

  it("reads the token fields Freesound returns", () => {
    const token = parseFreesoundToken({
      access_token: "access",
      refresh_token: "refresh",
      scope: "read",
      expires_in: 86400,
    });
    assert.deepEqual(token, {
      accessToken: "access",
      refreshToken: "refresh",
      scope: "read",
      expiresIn: 86400,
    });
  });

  it("rejects a body without a refresh token", () => {
    assert.equal(
      parseFreesoundToken({ access_token: "access", expires_in: 1, scope: "read" }),
      null,
    );
  });
});
