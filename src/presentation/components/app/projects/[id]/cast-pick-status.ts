// Status line under the character picker. Q&A needs exactly `required` ids.
export function castPickStatus(selected: number, required: number, max: number) {
  if (required > 0) {
    if (selected === required) {
      return { ok: true, text: `已選 ${selected} / ${required}` };
    }
    const short = required - selected;
    return {
      ok: false,
      text:
        short > 0
          ? `必須正好 ${required} 個角色，還差 ${short} 個`
          : `必須正好 ${required} 個角色`,
    };
  }
  return { ok: true, text: `已選 ${selected} / ${max}` };
}
