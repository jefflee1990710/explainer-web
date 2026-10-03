"use client";

import { USER_STYLE_VISUAL_KEYS } from "@/service/style/user-style-fields";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";

// One chat bubble. User messages sit on the right; assistant, pending, and errors sit on the left.
export function StyleChatMessage({
  role,
  content,
  changedPaths,
  variant = "normal",
}: {
  role: "user" | "assistant";
  content?: string;
  changedPaths?: string[];
  variant?: "normal" | "pending" | "error";
}) {
  const { t } = useI18n();

  function fieldLabel(field: string) {
    if ((USER_STYLE_VISUAL_KEYS as readonly string[]).includes(field)) return t(`styles.fields.${field}`);
    return field;
  }

  if (role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-accent-ink px-4 py-2.5 text-sm leading-6 text-paper">
          {content}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      {variant === "pending" ? (
        <p className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md border border-accent-ink/10 bg-paper px-4 py-2.5 text-sm text-muted">
          <Spinner className="h-4 w-4" />
        </p>
      ) : (
        <p
          role={variant === "error" ? "alert" : undefined}
          className={`max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-md border bg-paper px-4 py-2.5 text-sm leading-6 ${
            variant === "error" ? "border-accent/30 text-accent" : "border-accent-ink/10"
          }`}
        >
          {content}
        </p>
      )}
      {changedPaths && changedPaths.length > 0 ? (
        <p className="max-w-[85%] px-1 text-xs text-muted">
          {t("styles.chatChanged", { fields: changedPaths.map(fieldLabel).join(", ") })}
        </p>
      ) : null}
    </div>
  );
}
