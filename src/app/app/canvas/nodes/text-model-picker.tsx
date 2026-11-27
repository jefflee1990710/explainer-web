// Text-model picker. Each option shows the per-million-token rate, not a flat run price.

import type { CanvasModelSpec } from "@/service/canvas/catalog/model-catalog";
import { canvasModelDisplayName } from "@/service/canvas/catalog/model-names";
import { canvasTextUserRates, formatTextTokenRate } from "@/service/canvas/catalog/text-token-price";

const fieldClass =
  "nodrag w-full cursor-pointer rounded-[8px] border border-white/10 bg-[#0b0e14] px-2 py-1 text-[11px] text-white/90 focus:border-[#c6f24b]/60 focus:outline-none";

export function TextModelPicker({
  spec,
  choices,
  locale,
  isZh,
  disabled,
  onChange,
}: {
  spec: CanvasModelSpec;
  choices: readonly CanvasModelSpec[];
  locale: string;
  isZh: boolean;
  disabled: boolean;
  onChange: (modelId: string) => void;
}) {
  const selected = formatTextTokenRate(canvasTextUserRates(spec.id), isZh);
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] text-white/50">{isZh ? "文字模型" : "Text model"}</span>
      <select
        value={spec.id}
        aria-label={isZh ? "文字模型" : "Text model"}
        disabled={disabled}
        onChange={(event) => {
          if (event.target.value !== spec.id) onChange(event.target.value);
        }}
        className={fieldClass}
      >
        {choices.map((model) => (
          <option key={model.id} value={model.id}>
            {canvasModelDisplayName(model, locale)} · {formatTextTokenRate(canvasTextUserRates(model.id), isZh)}
          </option>
        ))}
      </select>
      {/* Visible while the menu is closed, so the selected rate is not only inside the option list. */}
      <span className="text-[10px] text-white/45">{selected}</span>
    </label>
  );
}
