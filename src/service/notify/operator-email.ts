import { after } from "next/server";
import { isSmtpConfigured, sendMail } from "@/service/notify/smtp";
import {
  OPERATOR_NOTIFY_EMAIL,
  operatorAccountHtml,
  operatorAccountSubject,
  operatorAccountText,
  operatorSubscriptionHtml,
  operatorSubscriptionSubject,
  operatorSubscriptionText,
  type OperatorAccountCopy,
  type OperatorSubscriptionCopy,
} from "@/service/notify/operator-notice";

// Keep SMTP off the sign-in and Stripe webhook response.
function schedule(run: () => Promise<void>, label: string) {
  const safe = () =>
    run().catch((error) => {
      console.error(`[notify] operator ${label} email failed`, error);
    });
  try {
    after(safe);
  } catch {
    void safe();
  }
}

export function scheduleOperatorAccountEmail(copy: OperatorAccountCopy) {
  if (!copy.email) return;
  schedule(async () => {
    if (!isSmtpConfigured()) return;
    await sendMail({
      to: OPERATOR_NOTIFY_EMAIL,
      subject: operatorAccountSubject(copy),
      text: operatorAccountText(copy),
      html: operatorAccountHtml(copy),
    });
  }, "account");
}

export function scheduleOperatorSubscriptionEmail(copy: OperatorSubscriptionCopy) {
  if (!copy.email) return;
  schedule(async () => {
    if (!isSmtpConfigured()) return;
    await sendMail({
      to: OPERATOR_NOTIFY_EMAIL,
      subject: operatorSubscriptionSubject(copy),
      text: operatorSubscriptionText(copy),
      html: operatorSubscriptionHtml(copy),
    });
  }, "subscription");
}
