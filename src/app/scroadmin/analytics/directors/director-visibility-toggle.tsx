"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setDirectorPickerEnabled } from "@/presentation/actions/director-visibility";

// On/off switch for one hardcoded director. Off keeps it visible only to the operator inbox.
export function DirectorVisibilityToggle({
  slug,
  enabled,
  operatorEmail,
  onChange,
}: {
  slug: string;
  enabled: boolean;
  operatorEmail: string;
  onChange: (slug: string, enabled: boolean) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function flip() {
    if (pending) return;
    const next = !enabled;
    setPending(true);
    setError("");
    onChange(slug, next);
    const result = await setDirectorPickerEnabled(slug, next);
    setPending(false);
    if (!result.ok) {
      onChange(slug, enabled);
      setError(result.error || "儲存失敗");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#12141c]">導演開關</p>
        <p className="mt-0.5 text-xs leading-5 text-zinc-500">
          {enabled
            ? "開啟時，依選擇器規則對所有人顯示。"
            : `關閉時，只有 ${operatorEmail} 能在導演列表和新建影片看到。`}
        </p>
        {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={enabled ? "關閉這個導演" : "開啟這個導演"}
        disabled={pending}
        onClick={() => void flip()}
        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c6f24b] disabled:cursor-wait disabled:opacity-60 ${
          enabled ? "border-[#12141c] bg-[#12141c]" : "border-zinc-300 bg-zinc-200"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
