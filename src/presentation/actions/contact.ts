"use server";

import { contactMail, parseContact, type ContactError } from "@/service/contact/message";
import { OPERATOR_NOTIFY_EMAIL } from "@/service/notify/operator-notice";
import { isSmtpConfigured, sendMail } from "@/service/notify/smtp";

export type ContactResult =
  | { ok: true }
  | { ok: false; error: ContactError | "send" };

// Public contact form. Mail goes to the operator inbox, reply-to is the sender.
export async function submitContact(input: {
  name?: string;
  email?: string;
  topic?: string;
  message?: string;
  company?: string;
}): Promise<ContactResult> {
  const parsed = parseContact(input);
  if (!parsed.ok) return parsed;
  if (!isSmtpConfigured()) return { ok: false, error: "send" };
  const mail = contactMail(parsed.value);
  try {
    const sent = await sendMail({
      to: OPERATOR_NOTIFY_EMAIL,
      replyTo: parsed.value.email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
    if (!sent) return { ok: false, error: "send" };
    return { ok: true };
  } catch (error) {
    console.error("[contact] send failed", error instanceof Error ? error.message : "error");
    return { ok: false, error: "send" };
  }
}
