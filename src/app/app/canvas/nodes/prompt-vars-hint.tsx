"use client";

// Chips for the `{{key}}` placeholders in a prompt: filled by a wired Setting, or still empty.

import type { SettingsVars } from "@/model/canvas-settings";
import { promptPlaceholder, promptPlaceholders } from "@/service/canvas/settings/template";

export function PromptVarsHint({
  isZh,
  text,
  vars,
  missingBlocksRun,
}: {
  isZh: boolean;
  text: string;
  vars: SettingsVars;
  // A model run stops while a key is empty. A Prompt node can still be saved that way.
  missingBlocksRun: boolean;
}) {
  const keys = promptPlaceholders(text);
  if (keys.length === 0) return null;
  const missing = keys.filter((key) => !Object.hasOwn(vars, key));
  return (
    <div className="flex flex-wrap items-center gap-1 text-[10px]">
      {keys.map((key) => {
        const filled = !missing.includes(key);
        return (
          <code
            key={key}
            title={filled ? vars[key] : undefined}
            className={`rounded px-1 py-0.5 ${
              filled
                ? "bg-[#c6f24b]/10 text-[#c6f24b]/90"
                : missingBlocksRun
                  ? "bg-rose-500/10 text-rose-300"
                  : "bg-white/6 text-white/50"
            }`}
          >
            {promptPlaceholder(key)}
          </code>
        );
      })}
      {missing.length > 0 ? (
        <span className={missingBlocksRun ? "text-rose-300/80" : "text-white/40"}>
          {missingBlocksRun
            ? isZh
              ? "接上含此 key 的設定才能執行"
              : "Wire a Setting with this key to run"
            : isZh
              ? "未填，把 Setting 接到這個 Prompt"
              : "Empty; wire a Setting to this Prompt"}
        </span>
      ) : null}
    </div>
  );
}
