"use client";

import { JUTSU_LIGHT_LOOKS } from "@/service/jutsu/light-looks";
import { useI18n } from "@/presentation/components/i18n-provider";

// Visual grid picker for all 17 Openjutsu relight presets + custom lighting description.
export function JutsuRelightPicker({
  enabled,
  onEnabledChange,
  selectedId,
  onSelectId,
  customPrompt,
  onCustomPromptChange,
  alwaysOn = false,
  disabled = false,
}: {
  enabled: boolean;
  onEnabledChange?: (enabled: boolean) => void;
  selectedId: string;
  onSelectId: (id: string) => void;
  customPrompt: string;
  onCustomPromptChange: (val: string) => void;
  alwaysOn?: boolean;
  disabled?: boolean;
}) {
  const { locale } = useI18n();
  const isEn = locale === "en";
  const active = alwaysOn || enabled;

  return (
    <div className="space-y-3 rounded-2xl border border-accent-ink/12 bg-paper/75 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-foreground">
            {isEn ? "Cinematic Relight (17 Light Looks)" : "電影級重新打光 Relight（17 款光效）"}
          </p>
          <p className="text-xs text-muted">
            {isEn
              ? "Relights the character and scene in the same pass without degrading quality."
              : "喺同一次圖片預備 Pass 同步轉換光影色溫，唔會造成二次重繪畫質劣化。"}
          </p>
        </div>

        {!alwaysOn && onEnabledChange ? (
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold">
            <input
              type="checkbox"
              checked={enabled}
              disabled={disabled}
              onChange={(ev) => onEnabledChange(ev.target.checked)}
              className="h-4 w-4 rounded accent-accent-ink"
            />
            <span>{isEn ? "Enable Relight" : "啟用重新打光"}</span>
          </label>
        ) : null}
      </div>

      {active ? (
        <>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {JUTSU_LIGHT_LOOKS.map((look) => {
              const isSelected = selectedId === look.id && !customPrompt.trim();
              const title = isEn ? look.nameEn : look.nameZhHant;
              return (
                <button
                  key={look.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onSelectId(look.id);
                    if (customPrompt.trim()) onCustomPromptChange("");
                  }}
                  className={`group flex cursor-pointer flex-col overflow-hidden rounded-xl border text-left transition ${
                    isSelected
                      ? "border-accent-ink bg-accent-ink text-paper shadow-[3px_3px_0_0_rgba(18,20,28,0.25)]"
                      : "border-accent-ink/15 bg-white hover:border-accent-ink/40"
                  }`}
                >
                  <div className="relative aspect-square w-full overflow-hidden bg-zinc-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={look.image}
                      alt={title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-2">
                    <span className="block truncate text-[11px] font-bold">
                      {title}
                    </span>
                    <span
                      className={`block truncate text-[10px] ${
                        isSelected ? "text-paper/75" : "text-muted"
                      }`}
                    >
                      {look.nameEn}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted">
              {isEn
                ? "Or write custom lighting instruction (overrides preset above)"
                : "或自訂打光描述（輸入後會覆蓋上方預設光效）"}
            </label>
            <input
              type="text"
              value={customPrompt}
              disabled={disabled}
              onChange={(ev) => onCustomPromptChange(ev.target.value)}
              placeholder={
                isEn
                  ? "e.g. Warm neon cyberpunk rain reflections from the left…"
                  : "例如：左側霓虹暖光照射，背景帶有微暗電影感陰影…"
              }
              className="mt-1 h-9 w-full rounded-xl border border-accent-ink/20 bg-white px-3 text-xs focus-visible:outline-2 focus-visible:outline-accent"
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
