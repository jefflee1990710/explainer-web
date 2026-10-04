"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { StyleSpecRow } from "@/presentation/components/app/styles/[id]/style-spec-row";
import { changedVisualKeys, type StyleDetail } from "@/presentation/components/app/styles/style-detail";
import { USER_STYLE_VISUAL_KEYS, type UserStyleFields } from "@/service/style/user-style-fields";

// Compact read-only spec sheet. Visual edits go through AI chat, not these rows.
export function StyleInfoPanel({
  style,
  saved,
  draft,
}: {
  style: StyleDetail;
  saved: UserStyleFields;
  draft: UserStyleFields;
}) {
  const { t } = useI18n();
  const changed = changedVisualKeys(saved, draft);

  return (
    <section className="min-w-0 rounded-xl border border-accent-ink/10 bg-paper/85 px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          {t("styles.fieldsTitle")}
        </h2>
        {style.isCustom ? <p className="text-[11px] text-muted">{t("styles.fieldsHint")}</p> : null}
      </div>
      <dl className="mt-1">
        {USER_STYLE_VISUAL_KEYS.map((key) => (
          <StyleSpecRow
            key={key}
            label={t(`styles.fields.${key}`)}
            value={style.isCustom ? draft[key] : (style[key] ?? "")}
            modified={changed.includes(key)}
            kind={key === "canvasColor" ? "color" : "text"}
          />
        ))}
      </dl>
    </section>
  );
}
