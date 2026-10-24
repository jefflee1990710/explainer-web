"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  LIFE_POST_CATEGORIES,
  lifePostTemplateById,
  lifePostTemplateTags,
  lifePostTemplatesInCategory,
  type LifePostCategoryId,
} from "@/model/life-post-template";
import { LifeTemplateArt } from "@/presentation/components/app/life/life-template-art";
import { LifeTemplateTagChips } from "@/presentation/components/app/life/life-template-tag-chips";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { useI18n } from "@/presentation/components/i18n-provider";

// Category tabs + tag chips + example grid for picking a Life post type.
export function LifeTemplateDialog({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (id: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<LifePostCategoryId>(
    lifePostTemplateById(value)?.categoryId ?? LIFE_POST_CATEGORIES[0],
  );
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const inTab = lifePostTemplatesInCategory(tab);
  const availableTags = useMemo(() => {
    const present = new Set<string>();
    for (const template of inTab) {
      for (const tag of lifePostTemplateTags(template)) present.add(tag);
    }
    return [...present];
  }, [inTab]);
  const templates = useMemo(() => {
    if (!selectedTags.length) return inTab;
    return inTab.filter((template) => {
      const have = new Set(lifePostTemplateTags(template));
      return selectedTags.every((tag) => have.has(tag));
    });
  }, [inTab, selectedTags]);

  useEffect(() => {
    dialogRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <DialogBackdrop className="grid place-items-center bg-accent-ink/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="flex max-h-[min(85vh,52rem)] w-full max-w-4xl flex-col overflow-hidden rounded-[1.75rem] border border-accent-ink/10 bg-paper shadow-[8px_8px_0_0_rgba(18,20,28,0.12)] outline-none"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 space-y-2 border-b border-accent-ink/10 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id={titleId} className="font-display text-xl font-bold">
                {t("life.templates.title")}
              </h2>
              <p className="text-xs text-muted">{t("life.templates.hint")}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("common.close")}
              className="cursor-pointer rounded-full px-2.5 py-1 text-xs font-bold text-muted hover:text-foreground"
            >
              ✕
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5" role="tablist">
            {LIFE_POST_CATEGORIES.map((category) => {
              const activeTab = tab === category;
              return (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={activeTab}
                  onClick={() => {
                    setTab(category);
                    setSelectedTags([]);
                  }}
                  className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-bold transition ${
                    activeTab
                      ? "bg-accent-ink text-paper"
                      : "border border-accent-ink/15 bg-paper text-muted hover:border-accent-ink/40 hover:text-foreground"
                  }`}
                >
                  {t(`life.templates.categories.${category}`)}
                </button>
              );
            })}
          </div>
          <LifeTemplateTagChips
            available={availableTags}
            selected={selectedTags}
            onToggle={(tag) =>
              setSelectedTags((current) =>
                current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
              )
            }
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {templates.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">{t("characters.look.emptySearch")}</p>
          ) : (
            <div
              role="radiogroup"
              aria-label={t(`life.templates.categories.${tab}`)}
              className="grid w-full content-start gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(8.5rem,1fr))]"
            >
              {templates.map((template) => {
                const active = template.id === value;
                const name = t(`life.templates.names.${template.id}`);
                return (
                  <button
                    key={template.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => {
                      onChange(template.id);
                      onClose();
                    }}
                    className={`flex cursor-pointer flex-col rounded-xl border bg-paper p-1.5 text-left transition ${
                      active
                        ? "border-accent shadow-[2px_2px_0_0_#12141c]"
                        : "border-accent-ink/10 hover:border-accent-ink/30"
                    }`}
                  >
                    <span className="relative block aspect-[3/4] overflow-hidden rounded-lg bg-zinc-200">
                      <LifeTemplateArt id={template.id} label={name} />
                    </span>
                    <span className="mt-1.5 block px-0.5 text-xs font-bold leading-4">{name}</span>
                    <span className="mt-0.5 line-clamp-2 px-0.5 text-[10px] leading-snug text-muted">
                      {t(`life.templates.tips.${template.id}`)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DialogBackdrop>
  );
}
