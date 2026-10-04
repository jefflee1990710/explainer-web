"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { StyleChatMessage } from "@/presentation/components/app/styles/[id]/style-chat-message";

// First assistant bubble when the room has no turns yet.
export function StyleChatEmpty() {
  const { t } = useI18n();
  return <StyleChatMessage role="assistant" content={t("styles.chatEmpty")} />;
}
