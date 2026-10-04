"use client";

import { USER_STYLE_VISUAL_KEYS } from "@/service/style/user-style-fields";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import {
  StyleChatAvatar,
  type StyleChatUser,
} from "@/presentation/components/app/styles/[id]/style-chat-avatar";
import { StyleChatPreview } from "@/presentation/components/app/styles/[id]/style-chat-preview";

// One chat bubble. User messages sit on the right; assistant, pending, and errors sit on the left.
export function StyleChatMessage({
  role,
  content,
  imageUrl,
  previewUrl,
  changedPaths,
  user,
  variant = "normal",
  previewBusy = false,
  previewDisabled = false,
  onGeneratePreview,
}: {
  role: "user" | "assistant";
  content?: string;
  imageUrl?: string;
  previewUrl?: string;
  changedPaths?: string[];
  user?: StyleChatUser;
  variant?: "normal" | "pending" | "error";
  previewBusy?: boolean;
  previewDisabled?: boolean;
  onGeneratePreview?: () => void;
}) {
  const { t } = useI18n();

  function fieldLabel(field: string) {
    if ((USER_STYLE_VISUAL_KEYS as readonly string[]).includes(field)) return t(`styles.fields.${field}`);
    return field;
  }

  if (role === "user") {
    return (
      <div className="flex items-end justify-end gap-2">
        <div className="max-w-[min(85%,calc(100%-2.5rem))] space-y-2 rounded-2xl rounded-br-md bg-accent-ink px-3 py-2.5 text-paper">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={t("styles.chatImageAlt")} className="max-h-40 w-full rounded-lg object-cover" />
          ) : null}
          {content ? <p className="whitespace-pre-wrap text-sm leading-6">{content}</p> : null}
        </div>
        <StyleChatAvatar role="user" user={user} />
      </div>
    );
  }

  return (
    <div className="flex items-end justify-start gap-2">
      <StyleChatAvatar role="assistant" />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
        {variant === "pending" ? (
          <p className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md border border-accent-ink/10 bg-paper px-4 py-2.5 text-sm text-muted">
            <Spinner className="h-4 w-4" />
          </p>
        ) : (
          <div
            role={variant === "error" ? "alert" : undefined}
            className={`max-w-[min(85%,100%)] rounded-2xl rounded-bl-md border bg-paper px-3 py-2.5 ${
              variant === "error" ? "border-accent/30 text-accent" : "border-accent-ink/10"
            }`}
          >
            {content ? <p className="whitespace-pre-wrap text-sm leading-6">{content}</p> : null}
            {onGeneratePreview && variant === "normal" ? (
              <StyleChatPreview
                generated={Boolean(previewUrl)}
                generating={previewBusy}
                disabled={previewDisabled}
                onGenerate={onGeneratePreview}
              />
            ) : null}
          </div>
        )}
        {changedPaths && changedPaths.length > 0 ? (
          <p className="max-w-[min(85%,100%)] px-1 text-xs text-muted">
            {t("styles.chatChanged", { fields: changedPaths.map(fieldLabel).join(", ") })}
          </p>
        ) : null}
      </div>
    </div>
  );
}
