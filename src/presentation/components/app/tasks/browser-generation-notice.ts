"use client";

const SCRO_ICON = "/logo-mark.png";
const SW_URL = "/generation-notify-sw.js";
const seen = new Set<string>();

// Ask on a click. Browsers ignore a permission prompt that is not a user gesture.
export function armBrowserNotifications() {
  if (typeof window === "undefined" || typeof Notification === "undefined") return;
  if (Notification.permission === "default") void Notification.requestPermission();
  if ("serviceWorker" in navigator) {
    void navigator.serviceWorker.register(SW_URL).catch(() => undefined);
  }
}

function claim(tag: string) {
  if (seen.has(tag)) return false;
  seen.add(tag);
  return true;
}

// OS notification for one finished image or video. The same tag is shown once.
export async function showBrowserGenerationNotice(input: {
  tag: string;
  title: string;
  body: string;
  href?: string;
}) {
  if (typeof window === "undefined" || typeof Notification === "undefined") return;
  if (!claim(input.tag)) return;
  if (Notification.permission !== "granted") {
    seen.delete(input.tag);
    return;
  }
  const options = {
    body: input.body,
    icon: SCRO_ICON,
    tag: input.tag,
    data: { href: input.href || "" },
  };
  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(input.title, options);
        return;
      }
    }
  } catch {
    // The page Notification below still shows while this tab is open.
  }
  const notice = new Notification(input.title, options);
  notice.onclick = () => {
    window.focus();
    notice.close();
    if (input.href) window.location.assign(input.href);
  };
}
