export const CONTACT_TOPICS = ["support", "enterprise", "other"] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export type ContactDraft = {
  name: string;
  email: string;
  topic: ContactTopic;
  message: string;
};

export type ContactError = "name" | "email" | "message" | "topic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Turn a public form into a bounded message, or a field error.
export function parseContact(input: {
  name?: string;
  email?: string;
  topic?: string;
  message?: string;
  company?: string;
}): { ok: true; value: ContactDraft } | { ok: false; error: ContactError } {
  if (input.company?.trim()) return { ok: false, error: "topic" };
  const name = (input.name ?? "").trim();
  const email = (input.email ?? "").trim();
  const message = (input.message ?? "").trim();
  const topic = input.topic ?? "";
  if (name.length < 1 || name.length > 80) return { ok: false, error: "name" };
  if (!EMAIL.test(email) || email.length > 120) return { ok: false, error: "email" };
  if (!CONTACT_TOPICS.includes(topic as ContactTopic)) return { ok: false, error: "topic" };
  if (message.length < 8 || message.length > 4000) return { ok: false, error: "message" };
  return { ok: true, value: { name, email, topic: topic as ContactTopic, message } };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function contactMail(draft: ContactDraft) {
  const subject = `Scro contact · ${draft.topic} · ${draft.name}`;
  const text = [`From: ${draft.name} <${draft.email}>`, `Topic: ${draft.topic}`, "", draft.message].join("\n");
  const html = `<p><strong>${escapeHtml(draft.name)}</strong> &lt;${escapeHtml(draft.email)}&gt;</p><p>${escapeHtml(draft.topic)}</p><p>${escapeHtml(draft.message).replaceAll("\n", "<br>")}</p>`;
  return { subject, text, html };
}
