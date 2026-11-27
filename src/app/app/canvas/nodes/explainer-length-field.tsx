// Length select on the Explainer Director card. Auto is the default.

import { explainerCardLength, EXPLAINER_CARD_LENGTHS } from "@/service/canvas/directors/explainer-length";
import { DIALOG_FIELD, DIALOG_LABEL } from "@/app/app/canvas/scro-dialog-shell";

const LENGTH_LABELS: Record<(typeof EXPLAINER_CARD_LENGTHS)[number], { zh: string; en: string }> = {
  auto: { zh: "自動", en: "Auto" },
  "15s": { zh: "15s", en: "15s" },
  "30s": { zh: "30s", en: "30s" },
  "45s": { zh: "45s", en: "45s" },
  "60s": { zh: "60s", en: "60s" },
};

type Props = {
  value: unknown;
  isZh: boolean;
  onChange: (length: string) => void;
};

export function ExplainerLengthField({ value, isZh, onChange }: Props) {
  const selected = explainerCardLength(value);
  return (
    <label className={DIALOG_LABEL}>
      {isZh ? "片長" : "Length"}
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        aria-label={isZh ? "片長" : "Length"}
        className={DIALOG_FIELD}
      >
        {EXPLAINER_CARD_LENGTHS.map((length) => (
          <option key={length} value={length}>
            {isZh ? LENGTH_LABELS[length].zh : LENGTH_LABELS[length].en}
          </option>
        ))}
      </select>
      {selected === "auto" ? (
        <span className="text-[10px] font-normal leading-snug text-white/40">
          {isZh ? "按內容決定片段數" : "Clip count follows the content"}
        </span>
      ) : null}
    </label>
  );
}
