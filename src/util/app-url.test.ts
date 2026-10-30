import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SITE_URL, getAppUrl, getSiteUrl, isPublicHttpUrl } from "@/util/app-url";

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

test("getSiteUrl and getAppUrl resolve to https://www.scro.io instead of explainer-web.vercel.app", () => {
  const prevAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  const prevSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const prevProdUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  try {
    assert.equal(DEFAULT_SITE_URL, "https://www.scro.io");
    process.env.NEXT_PUBLIC_APP_URL = "https://explainer-web.vercel.app";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "explainer-web.vercel.app";
    assert.equal(getSiteUrl(), "https://www.scro.io");
    assert.equal(getAppUrl(), "https://www.scro.io");
    process.env.NEXT_PUBLIC_SITE_URL = "https://scro.io";
    assert.equal(getSiteUrl(), "https://www.scro.io");
    process.env.NEXT_PUBLIC_APP_URL = "https://scro.io";
    delete process.env.NEXT_PUBLIC_SITE_URL;
    assert.equal(getAppUrl(), "https://www.scro.io");
    assert.equal(getSiteUrl(), "https://www.scro.io");
  } finally {
    if (prevAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = prevAppUrl;
    if (prevSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = prevSiteUrl;
    if (prevProdUrl === undefined) delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    else process.env.VERCEL_PROJECT_PRODUCTION_URL = prevProdUrl;
  }
});
