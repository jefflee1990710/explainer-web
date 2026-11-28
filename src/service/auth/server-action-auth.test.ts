import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SERVER_ACTION_ERROR_CONTENT_TYPE,
  SIGN_IN_REQUIRED_MESSAGE,
  serverActionAuthPlainBody,
} from "@/service/auth/server-action-auth";

describe("server-action auth response", () => {
  it("answers an unsigned Server Action with a plain-text sign-in message", () => {
    const headers = new Headers({ "Next-Action": "abc123" });
    assert.equal(serverActionAuthPlainBody(headers), SIGN_IN_REQUIRED_MESSAGE);
    assert.equal(SERVER_ACTION_ERROR_CONTENT_TYPE, "text/plain");
  });

  it("leaves ordinary navigations to the sign-in redirect", () => {
    assert.equal(serverActionAuthPlainBody(new Headers()), null);
    assert.equal(serverActionAuthPlainBody(new Headers({ accept: "text/html" })), null);
  });
});
