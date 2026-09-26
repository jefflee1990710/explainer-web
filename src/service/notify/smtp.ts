import nodemailer from "nodemailer";

function smtpFrom() {
  return (process.env.SMTP_FROM || "").trim();
}

export function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      smtpFrom(),
  );
}

// SendLayer / STARTTLS on 587. No-op when SMTP_* is missing so CI stays quiet.
export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  if (!isSmtpConfigured()) return false;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    requireTLS: true,
  });
  await transporter.sendMail({
    from: `Explainer <${smtpFrom()}>`,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
  return true;
}
