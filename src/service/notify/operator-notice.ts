import type { PlanId, SubscriptionStatus } from "@/model/subscription";

// Inbox for new accounts, sign-ins, and paid subscriptions.
export const OPERATOR_NOTIFY_EMAIL = "jeff.lee@thenovax.com";

// Firebase user created moments ago counts as registration, not a later sign-in.
export const NEW_ACCOUNT_WINDOW_MS = 3 * 60 * 1000;

export type AccountEventKind = "registered" | "signed_in";

export function accountEventKind(creationTimeMs: number, nowMs: number): AccountEventKind {
  if (!Number.isFinite(creationTimeMs)) return "signed_in";
  const delta = nowMs - creationTimeMs;
  if (delta >= -60_000 && delta <= NEW_ACCOUNT_WINDOW_MS) return "registered";
  return "signed_in";
}

export type PaidPlanNotice =
  | { action: "notify" }
  | { action: "clear" }
  | { action: "skip" };

const PAID_STATUSES = new Set<SubscriptionStatus>(["active", "trialing"]);
const ENDED_STATUSES = new Set<SubscriptionStatus>(["canceled", "unpaid", "inactive"]);

// Email once per paid plan. Same-plan renewals stay quiet; cancel re-arms the next subscribe.
export function paidPlanNotice(input: {
  status: SubscriptionStatus;
  planId: PlanId;
  notifiedPlanId?: PlanId | null;
}): PaidPlanNotice {
  if (!PAID_STATUSES.has(input.status)) {
    return ENDED_STATUSES.has(input.status) ? { action: "clear" } : { action: "skip" };
  }
  if (input.notifiedPlanId === input.planId) return { action: "skip" };
  return { action: "notify" };
}

export type OperatorAccountCopy = {
  kind: AccountEventKind;
  name: string;
  email: string;
  provider: string;
  at: Date;
};

export type OperatorSubscriptionCopy = {
  name: string;
  email: string;
  planName: string;
  planNameZh: string;
  amountUsd: number;
  monthlyCredits: number;
  status: string;
  at: Date;
};

function formatWhen(at: Date) {
  return new Intl.DateTimeFormat("zh-Hant-HK", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(at);
}

function providerLabel(provider: string) {
  if (provider === "google.com") return "Google";
  if (provider === "password") return "電郵";
  return provider || "未知";
}

export function operatorAccountSubject(copy: OperatorAccountCopy) {
  const label = copy.kind === "registered" ? "新帳號" : "登入";
  return `${label} · ${copy.email}`;
}

export function operatorAccountText(copy: OperatorAccountCopy) {
  const label = copy.kind === "registered" ? "有人註冊了新帳號" : "有人登入了";
  return [
    label,
    `姓名：${copy.name}`,
    `電郵：${copy.email}`,
    `方式：${providerLabel(copy.provider)}`,
    `時間：${formatWhen(copy.at)}（香港）`,
  ].join("\n");
}

export function operatorSubscriptionSubject(copy: OperatorSubscriptionCopy) {
  return `訂閱付費方案 · ${copy.planName} · ${copy.email}`;
}

export function operatorSubscriptionText(copy: OperatorSubscriptionCopy) {
  return [
    "有人訂閱了付費方案",
    `姓名：${copy.name}`,
    `電郵：${copy.email}`,
    `方案：${copy.planNameZh}（${copy.planName}）`,
    `月費：USD ${copy.amountUsd}`,
    `每月 credits：${copy.monthlyCredits}`,
    `狀態：${copy.status}`,
    `時間：${formatWhen(copy.at)}（香港）`,
  ].join("\n");
}

export function operatorAccountHtml(copy: OperatorAccountCopy) {
  const headline = copy.kind === "registered" ? "新帳號" : "登入";
  return noticeHtml(headline, [
    ["姓名", copy.name],
    ["電郵", copy.email],
    ["方式", providerLabel(copy.provider)],
    ["時間", `${formatWhen(copy.at)}（香港）`],
  ]);
}

export function operatorSubscriptionHtml(copy: OperatorSubscriptionCopy) {
  return noticeHtml("訂閱付費方案", [
    ["姓名", copy.name],
    ["電郵", copy.email],
    ["方案", `${copy.planNameZh}（${copy.planName}）`],
    ["月費", `USD ${copy.amountUsd}`],
    ["每月 credits", String(copy.monthlyCredits)],
    ["狀態", copy.status],
    ["時間", `${formatWhen(copy.at)}（香港）`],
  ]);
}

function noticeHtml(headline: string, rows: Array<[string, string]>) {
  const body = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 0;color:#5c6170;font-size:14px;width:120px;">${escapeHtml(label)}</td><td style="padding:6px 0;color:#12141c;font-size:14px;font-weight:600;">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  return `<!DOCTYPE html>
<html lang="zh-Hant">
  <body style="margin:0;padding:0;background:#fff6eb;color:#12141c;font-family:'Noto Sans TC',Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff6eb;">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fffbf5;border:1px solid rgba(18,20,28,0.1);border-radius:24px;">
            <tr>
              <td style="padding:28px 28px 8px;">
                <span style="display:inline-block;background:#c6f24b;color:#12141c;font-size:12px;font-weight:800;border-radius:999px;padding:4px 12px;">Scro</span>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 28px 8px;">
                <h1 style="margin:0;font-size:28px;line-height:1.2;font-weight:800;color:#12141c;">${escapeHtml(headline)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${body}</table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
