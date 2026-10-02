import assert from "node:assert/strict";
import { test } from "node:test";
import { isPublicAddress } from "@/service/project/public-address";

test("isPublicAddress classifies IPv4 and IPv6", () => {
  assert.equal(isPublicAddress("8.8.8.8"), true);
  assert.equal(isPublicAddress("172.32.0.1"), true);
  assert.equal(isPublicAddress("2001:4860:4860::8888"), true);

  for (const ip of [
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
  ]) {
    assert.equal(isPublicAddress(ip), false, ip);
  }

  assert.equal(isPublicAddress("::1"), false);
  assert.equal(isPublicAddress("fe80::1"), false);
  assert.equal(isPublicAddress("fd00::1"), false);
  assert.equal(isPublicAddress("::ffff:127.0.0.1"), false);
});
