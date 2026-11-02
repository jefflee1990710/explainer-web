"use client";

export type LifeStudioMode = "quick" | "advanced";

const TABS: { id: LifeStudioMode; title: string; badge: string }[] = [
  { id: "quick", title: "快速生成", badge: "Quick Generate" },
  { id: "advanced", title: "進階設定", badge: "Advanced settings" },
];

// Outer Quick / Advanced switcher under LOOK on /app/life.
export function LifeStudioModeTabs({
  value,
  disabled,
  onChange,
}: {
  value: LifeStudioMode;
  disabled?: boolean;
  onChange: (mode: LifeStudioMode) => void;
}) {
  return (
    <div className="shrink-0 border-b border-accent-ink/12 bg-paper/95 px-4 py-3">
      <div
        role="tablist"
        aria-label="Life 工作室模式"
        className="grid grid-cols-2 gap-1.5 rounded-xl bg-accent-ink/6 p-1"
      >
        {TABS.map((tab) => {
          const active = value === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={disabled}
              onClick={() => onChange(tab.id)}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg px-2 py-1.5 text-center transition disabled:cursor-not-allowed disabled:opacity-60 ${
                active
                  ? "bg-accent-ink text-lime shadow-xs"
                  : "text-foreground/75 hover:bg-paper/70 hover:text-foreground"
              }`}
            >
              <span className="text-xs font-bold leading-tight">{tab.title}</span>
              <span
                className={`text-[10px] font-medium leading-tight ${
                  active ? "text-paper/80" : "text-muted"
                }`}
              >
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
