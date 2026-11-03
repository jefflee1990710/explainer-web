import { readFile } from "node:fs/promises";
import { basename } from "node:path";

export type TelegramSendOptions = {
  caption?: string;
  botToken?: string;
  chatId?: string;
};

function resolveTelegramCredentials(options?: TelegramSendOptions): {
  botToken: string;
  chatId: string;
} {
  const botToken = (
    options?.botToken ||
    process.env.TELEGRAM_BOT_TOKEN ||
    process.env.TG_BOT_TOKEN ||
    ""
  ).trim();
  const chatId = (
    options?.chatId ||
    process.env.TELEGRAM_CHAT_ID ||
    process.env.TG_CHAT_ID ||
    ""
  ).trim();

  if (!botToken || !chatId) {
    throw new Error(
      "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in environment variables",
    );
  }
  return { botToken, chatId };
}

/** Send a generated marketing image (file path, Buffer, or URL) to Telegram. */
export async function sendMarketingPhotoToTelegram(
  photo: string | Buffer,
  options?: TelegramSendOptions & { fileName?: string },
): Promise<void> {
  const { botToken, chatId } = resolveTelegramCredentials(options);
  const endpoint = `https://api.telegram.org/bot${botToken}/sendPhoto`;

  if (typeof photo === "string" && /^https?:\/\//i.test(photo)) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        photo,
        ...(options?.caption ? { caption: options.caption } : {}),
      }),
    });
    if (!res.ok) {
      throw new Error(`Telegram sendPhoto failed (${res.status}): ${await res.text()}`);
    }
    return;
  }

  const bytes = typeof photo === "string" ? await readFile(photo) : photo;
  const fileName =
    options?.fileName ||
    (typeof photo === "string" ? basename(photo) : "marketing-photo.png");

  const form = new FormData();
  form.set("chat_id", chatId);
  if (options?.caption) form.set("caption", options.caption);
  form.set("photo", new Blob([new Uint8Array(bytes)]), fileName);

  const res = await fetch(endpoint, { method: "POST", body: form });
  if (!res.ok) {
    throw new Error(`Telegram sendPhoto failed (${res.status}): ${await res.text()}`);
  }
}

/** Send a generated marketing video (file path, Buffer, or URL) to Telegram. */
export async function sendMarketingVideoToTelegram(
  video: string | Buffer,
  options?: TelegramSendOptions & { fileName?: string },
): Promise<void> {
  const { botToken, chatId } = resolveTelegramCredentials(options);
  const endpoint = `https://api.telegram.org/bot${botToken}/sendVideo`;

  if (typeof video === "string" && /^https?:\/\//i.test(video)) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        video,
        supports_streaming: true,
        ...(options?.caption ? { caption: options.caption } : {}),
      }),
    });
    if (!res.ok) {
      throw new Error(`Telegram sendVideo failed (${res.status}): ${await res.text()}`);
    }
    return;
  }

  const bytes = typeof video === "string" ? await readFile(video) : video;
  const fileName =
    options?.fileName ||
    (typeof video === "string" ? basename(video) : "marketing-video.mp4");

  const form = new FormData();
  form.set("chat_id", chatId);
  form.set("supports_streaming", "true");
  if (options?.caption) form.set("caption", options.caption);
  form.set("video", new Blob([new Uint8Array(bytes)], { type: "video/mp4" }), fileName);

  const res = await fetch(endpoint, { method: "POST", body: form });
  if (!res.ok) {
    throw new Error(`Telegram sendVideo failed (${res.status}): ${await res.text()}`);
  }
}
