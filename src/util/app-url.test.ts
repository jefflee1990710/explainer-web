import assert from "node:assert/strict";
import { test } from "node:test";
import { isPublicHttpUrl } from "@/util/app-url";

test("isPublicHttpUrl accepts public HTTP(S) hosts", () => {
  assert.equal(isPublicHttpUrl("https://explainer.io/api/webhooks/higgsfield"), true);
  assert.equal(isPublicHttpUrl("https://app.vercel.app/hook"), true);
  assert.equal(isPublicHttpUrl("http://203.0.113.10/hook"), true);
});

test("isPublicHttpUrl rejects localhost, private IPs, and URL credentials", () => {
  assert.equal(isPublicHttpUrl("http://localhost:3000/api/webhooks/higgsfield"), false);
  assert.equal(isPublicHttpUrl("http://127.0.0.1:3000/hook"), false);
  assert.equal(isPublicHttpUrl("http://app.localhost/hook"), false);
  assert.equal(isPublicHttpUrl("http://192.168.1.8/hook"), false);
  assert.equal(isPublicHttpUrl("http://10.0.0.4/hook"), false);
  assert.equal(isPublicHttpUrl("http://172.16.0.2/hook"), false);
  assert.equal(isPublicHttpUrl("http://[::1]/hook"), false);
  assert.equal(isPublicHttpUrl("https://user:pass@explainer.io/hook"), false);
  assert.equal(isPublicHttpUrl("not-a-url"), false);
});
