// HTML + plain-text email template for notifying early users that their free welcome credits have been topped up.
export type CreditUpgradeEmailInput = {
  recipientName?: string;
  previousCredits: number;
  newCredits: number;
  studioHref?: string;
};

export const CREDIT_UPGRADE_FROM_EMAIL = "noreply@scro.io";

export function creditUpgradeEmailSubject(newCredits: number): string {
  return `🎁 你的 Scro 免費體驗點數已升級至 ${newCredits} Credits！`;
}

export function creditUpgradeEmailText(input: CreditUpgradeEmailInput): string {
  const studioHref = input.studioHref || "https://www.scro.io/app";
  const greeting = input.recipientName ? `Hi ${input.recipientName}，` : "Hi 創作者，";
  const added = Math.max(0, input.newCredits - input.previousCredits);

  return [
    greeting,
    "",
    "感謝你早期加入 Scro。",
    "",
    `你註冊時，免費體驗是 ${input.previousCredits} Credits。我們希望初期用戶能更從容地把系統試一遍，而不是點數太快用完就停下來，所以這次直接把免費點數補到 ${input.newCredits} Credits（+${added} 已入帳），不用另外申請。`,
    "",
    "歡迎再進工作室試試看。",
    "",
    studioHref,
    "",
    "— Scro 團隊",
  ].join("\n");
}

// Studio-branded HTML email (paper #fff6eb, ink #12141c, lime #c6f24b, coral #ff4d2e).
export function creditUpgradeEmailHtml(input: CreditUpgradeEmailInput): string {
  const studioHref = input.studioHref || "https://www.scro.io/app";
  const greeting = input.recipientName
    ? `Hi ${escapeHtml(input.recipientName)}，`
    : "Hi 創作者，";
  const added = Math.max(0, input.newCredits - input.previousCredits);

  return `<!DOCTYPE html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(creditUpgradeEmailSubject(input.newCredits))}</title>
  </head>
  <body style="margin:0;padding:0;background:#fff6eb;color:#12141c;font-family:'Noto Sans TC',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff6eb;background-image:radial-gradient(ellipse 80% 55% at 12% -10%, rgba(198,242,75,0.45), transparent 55%),radial-gradient(ellipse 70% 50% at 92% 8%, rgba(255,77,46,0.22), transparent 50%),linear-gradient(180deg,#fff8ef 0%,#fff3e4 48%,#ffe9d6 100%);">
      <tr>
        <td align="center" style="padding:44px 16px;">
          <table role="presentation" width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#fffbf5;border:1px solid rgba(18,20,28,0.1);border-radius:28px;overflow:hidden;box-shadow:0 18px 48px rgba(18,20,28,0.08);">
            <!-- Top Dark Banner -->
            <tr>
              <td style="background:#12141c;padding:28px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td>
                      <span style="display:inline-block;background:#c6f24b;color:#12141c;font-family:Syne,'Noto Sans TC',Helvetica,Arial,sans-serif;font-size:13px;font-weight:800;letter-spacing:0.06em;border-radius:999px;padding:5px 14px;">SCRO STUDIO</span>
                    </td>
                    <td align="right" style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.6);letter-spacing:0.04em;">
                      CREDITS TOP-UP
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding-top:18px;">
                      <h1 style="margin:0;font-family:Syne,'Noto Sans TC',Helvetica,Arial,sans-serif;font-size:26px;line-height:1.3;font-weight:800;color:#ffffff;">
                        你的免費體驗點數已升級至 <span style="color:#c6f24b;">${input.newCredits} Credits</span>
                      </h1>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Greeting & Intro -->
            <tr>
              <td style="padding:28px 32px 0;font-size:15px;line-height:1.75;color:#2c303d;">
                <p style="margin:0 0 12px;font-weight:700;font-size:16px;color:#12141c;">${greeting}</p>
                <p style="margin:0 0 12px;">
                  感謝你早期加入 Scro。
                </p>
                <p style="margin:0;">
                  你註冊時，免費體驗是 <strong>${input.previousCredits} Credits</strong>。我們希望初期用戶能更從容地把系統試一遍，而不是點數太快用完就停下來，所以這次直接把免費點數補上，不用另外申請。
                </p>
              </td>
            </tr>

            <!-- Credit Upgrade Highlight Card -->
            <tr>
              <td style="padding:22px 32px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#12141c;border-radius:20px;padding:22px 24px;">
                  <tr>
                    <td width="42%" align="center" style="border-right:1px solid rgba(255,255,255,0.12);padding-right:12px;">
                      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.55);">原本點數</div>
                      <div style="margin-top:6px;font-family:Syne,monospace;font-size:24px;font-weight:700;color:rgba(255,255,255,0.65);text-decoration:line-through;">${input.previousCredits} cr</div>
                    </td>
                    <td width="58%" align="center" style="padding-left:12px;">
                      <div style="display:inline-block;background:rgba(198,242,75,0.16);color:#c6f24b;font-size:11px;font-weight:700;border-radius:999px;padding:2px 10px;letter-spacing:0.04em;">
                        +${added} CREDITS 已入帳
                      </div>
                      <div style="margin-top:6px;font-family:Syne,monospace;font-size:32px;font-weight:800;color:#c6f24b;">
                        ${input.newCredits} Credits
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- CTA Button -->
            <tr>
              <td align="center" style="padding:28px 32px 24px;">
                <a href="${escapeHtml(studioHref)}" style="display:inline-block;background:#12141c;color:#c6f24b;font-family:Syne,'Noto Sans TC',Helvetica,Arial,sans-serif;font-size:15px;font-weight:800;text-decoration:none;border-radius:999px;padding:14px 32px;letter-spacing:0.02em;">
                  立即進入 Scro Studio 開始創作 →
                </a>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="border-top:1px solid rgba(18,20,28,0.08);padding:20px 32px 26px;font-size:12px;line-height:1.6;color:#71717a;text-align:center;">
                本信件由 Scro (<a href="https://www.scro.io" style="color:#12141c;text-decoration:underline;">scro.io</a>) 發送。<br />
                如需任何協助，歡迎直接進入工作台體驗最新功能。
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
