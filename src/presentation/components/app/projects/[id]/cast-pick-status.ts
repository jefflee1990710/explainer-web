import type { TranslateFn } from "@/util/i18n/translate";

// Status line under the character picker. Q&A needs exactly `required` ids.
export function castPickStatus(
  selected: number,
  required: number,
  max: number,
  t: TranslateFn,
) {
  if (required > 0) {
    if (selected === required) {
      return { ok: true, text: t("brief.castPicker.statusExactOk", { selected, required }) };
    }
    const short = required - selected;
    return {
      ok: false,
      text:
        short > 0
          ? t("brief.castPicker.statusExactShort", { required, short })
          : t("brief.castPicker.statusExactOver", { required }),
    };
  }
  return { ok: true, text: t("brief.castPicker.statusOptional", { selected, max }) };
}
