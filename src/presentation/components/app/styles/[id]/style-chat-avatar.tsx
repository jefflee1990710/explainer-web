"use client";

import { useState } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";

export type StyleChatUser = {
  name: string;
  email: string;
  avatarUrl?: string;
};

// Fixed 32px face next to each bubble. User photo falls back to an initial.
export function StyleChatAvatar({
  role,
  user,
}: {
  role: "user" | "assistant";
  user?: StyleChatUser;
}) {
  const { t } = useI18n();
  const [photoFailed, setPhotoFailed] = useState(false);

  if (role === "assistant") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/logo-mark.png"
        alt={t("styles.chatAssistantAria")}
        width={32}
        height={32}
        className="h-8 w-8 shrink-0 rounded-full object-cover"
      />
    );
  }

  const showPhoto = Boolean(user?.avatarUrl) && !photoFailed;
  const initial = (user?.name || user?.email || "?").trim().charAt(0).toUpperCase();

  if (showPhoto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user?.avatarUrl}
        alt={t("styles.chatUserAria")}
        width={32}
        height={32}
        referrerPolicy="no-referrer"
        onError={() => setPhotoFailed(true)}
        className="h-8 w-8 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <span
      aria-label={t("styles.chatUserAria")}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-ink text-xs font-semibold text-lime"
    >
      {initial}
    </span>
  );
}
