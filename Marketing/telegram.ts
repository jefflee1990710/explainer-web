import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join } from "node:path";

export type TelegramSendOptions = {
  caption?: string;
  botToken?: string;
  chatId?: string;
};

function readLocalTelegramFallback(): { botToken?: string; chatId?: string } {
  let botToken: string | undefined;
  let chatId: string | undefined;
  try {
    const envPath = join(homedir(), ".config/opencode/channels/telegram/.env");
    const envRaw = readFileSync(envPath, "utf8");
    for (const line of envRaw.split(/\r?\n/)) {
      const m = /^TELEGRAM_BOT_TOKEN=(.+)$/.exec(line.trim());
      if (m) botToken = m[1]!.replace(/^["']|["']$/g, "").trim();
    }
  } catch {
    // Ignore when local opencode telegram .env is absent
  }
  try {
    const accessPath = join(homedir(), ".config/opencode/channels/telegram/access.json");
    const access = JSON.parse(readFileSync(accessPath, "utf8")) as {
      allowFrom?: Array<string | number>;
    };
    if (Array.isArray(access.allowFrom) && access.allowFrom.length > 0) {
      chatId = String(access.allowFrom[0]);
    }
  } catch {
    // Ignore when local access.json is absent
  }
  return { botToken, chatId };
}

function resolveTelegramCredentials(options?: TelegramSendOptions): {
  botToken: string;
  chatId: string;
} {
  const fallback = readLocalTelegramFallback();
  const botToken = (
    options?.botToken ||
    process.env.TELEGRAM_BOT_TOKEN ||
    process.env.TG_BOT_TOKEN ||
    fallback.botToken ||
    ""
  ).trim();
  const chatId = (
    options?.chatId ||
    process.env.TELEGRAM_CHAT_ID ||
    process.env.TG_CHAT_ID ||
    fallback.chatId ||
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

/** Send a structured text message (e.g. product feature ideas discovered during dogfooding) to Telegram. */
export async function sendMarketingTextToTelegram(
  text: string,
  options?: TelegramSendOptions,
): Promise<void> {
  const { botToken, chatId } = resolveTelegramCredentials(options);
  const endpoint = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });
  if (!res.ok) {
    throw new Error(`Telegram sendMessage failed (${res.status}): ${await res.text()}`);
  }
}
