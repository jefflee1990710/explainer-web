export type GenerationEmailKind = "frames" | "video" | "still" | "character";

export type GenerationEmailCopy = {
  kind: GenerationEmailKind;
  title: string;
  href: string;
  clipNumber?: number;
};

const KIND_LABEL: Record<GenerationEmailKind, string> = {
  frames: "畫格完成",
  video: "影片完成",
  still: "定裝圖完成",
  character: "角色藍圖完成",
};

export function generationEmailSubject(copy: GenerationEmailCopy) {
  const clip = copy.clipNumber ? ` · Clip ${copy.clipNumber}` : "";
  return `${KIND_LABEL[copy.kind]} · ${copy.title}${clip}`;
}

export function generationEmailText(copy: GenerationEmailCopy) {
  return `${generationEmailHeadline(copy)}\n\n${generationEmailBody(copy)}\n\n打開工作室：${copy.href}\n`;
}

export function generationEmailHeadline(copy: GenerationEmailCopy) {
  return KIND_LABEL[copy.kind];
}

export function generationEmailBody(copy: GenerationEmailCopy) {
  if (copy.kind === "character") {
    return `角色「${copy.title}」的藍圖已產出，可以進工作室套用。`;
  }
  if (copy.kind === "still") {
    return `「${copy.title}」的角色定裝圖已完成。`;
  }
  if (copy.kind === "frames") {
    return `「${copy.title}」Clip ${copy.clipNumber} 的起始與結尾畫格都好了。`;
  }
  return `「${copy.title}」Clip ${copy.clipNumber} 的影片已產出。`;
}

// Studio palette inline: paper, ink, lime, coral. Table layout for email clients.
export function generationEmailHtml(copy: GenerationEmailCopy) {
  const headline = generationEmailHeadline(copy);
  const body = generationEmailBody(copy);
  return `<!DOCTYPE html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(headline)}</title>
  </head>
  <body style="margin:0;padding:0;background:#fff6eb;color:#12141c;font-family:'Noto Sans TC',Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff6eb;background-image:radial-gradient(ellipse 80% 55% at 12% -10%, rgba(198,242,75,0.45), transparent 55%),radial-gradient(ellipse 70% 50% at 92% 8%, rgba(255,77,46,0.28), transparent 50%),linear-gradient(180deg,#fff8ef 0%,#fff3e4 48%,#ffe9d6 100%);">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fffbf5;border:1px solid rgba(18,20,28,0.1);border-radius:24px;">
            <tr>
              <td style="padding:28px 28px 8px;">
                <span style="display:inline-block;background:#c6f24b;color:#12141c;font-family:Syne,'Noto Sans TC',Helvetica,Arial,sans-serif;font-size:12px;font-weight:800;letter-spacing:0.04em;border-radius:999px;padding:4px 12px;">Explainer</span>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 28px 0;">
                <h1 style="margin:0;font-family:Syne,'Noto Sans TC',Helvetica,Arial,sans-serif;font-size:28px;line-height:1.2;font-weight:800;color:#12141c;">${escapeHtml(headline)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 28px 0;font-size:15px;line-height:1.7;color:#5c6170;">
                ${escapeHtml(body)}
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <a href="${escapeHtml(copy.href)}" style="display:inline-block;background:#12141c;color:#fffbf5;font-family:Syne,'Noto Sans TC',Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;text-decoration:none;border-radius:12px;padding:12px 20px;">打開工作室</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px;font-size:12px;line-height:1.6;color:#5c6170;">
                產圖或產片完成時由 Explainer 自動寄出。
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
