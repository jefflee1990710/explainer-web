import assert from "node:assert/strict";
import test from "node:test";
import { contactMail, parseContact } from "@/service/contact/message";

test("parseContact accepts a short support note", () => {
  const parsed = parseContact({
    name: "Jeff",
    email: "jeff@example.com",
    topic: "support",
    message: "My render is stuck.",
  });
  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.equal(parsed.value.topic, "support");
});

test("parseContact rejects a short message and a filled honeypot", () => {
  assert.equal(parseContact({ name: "A", email: "a@b.co", topic: "other", message: "hi" }).ok, false);
  assert.equal(
    parseContact({ name: "A", email: "a@b.co", topic: "other", message: "long enough", company: "bot" }).ok,
    false,
  );
});

test("contactMail escapes html in the body", () => {
  const mail = contactMail({
    name: "Ada",
    email: "ada@example.com",
    topic: "enterprise",
    message: "<script>alert(1)</script>",
  });
  assert.match(mail.html, /&lt;script&gt;/);
  assert.equal(mail.subject.includes("enterprise"), true);
});
