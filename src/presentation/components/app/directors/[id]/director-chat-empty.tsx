"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { DirectorChatMessage } from "@/presentation/components/app/directors/[id]/director-chat-message";

// First assistant bubble when the room has no turns yet.
export function DirectorChatEmpty() {
  const { t } = useI18n();
  return <DirectorChatMessage role="assistant" content={t("directors.chatEmpty")} />;
}
