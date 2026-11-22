"use client";

// 9:16 / 16:9 / 1:1 picker shared by the tool setup dialogs.

import type { CanvasAspectRatio } from "@/model/canvas";
import { DIALOG_FIELD, DIALOG_LABEL } from "./scro-dialog-shell";

type Props = {
  isZh: boolean;
  value: CanvasAspectRatio;
  onChange: (value: CanvasAspectRatio) => void;
};

export function AspectRatioField({ isZh, value, onChange }: Props) {
  return (
    <label className={DIALOG_LABEL}>
      {isZh ? "比例" : "Ratio"}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as CanvasAspectRatio)}
        className={DIALOG_FIELD}
      >
        <option value="9:16">9:16</option>
        <option value="16:9">16:9</option>
        <option value="1:1">1:1</option>
      </select>
    </label>
  );
}
