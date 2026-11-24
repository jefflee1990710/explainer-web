"use client";

// Light look picker on a Swap render node in relight mode.

import { JUTSU_LIGHT_LOOKS } from "@/service/jutsu/light-looks";
import { DIALOG_LABEL } from "@/app/app/canvas/scro-dialog-shell";
import { CanvasPreviewSelect } from "@/app/app/canvas/nodes/canvas-preview-select";

export function SwapLightLookField({
  isZh,
  value,
  disabled,
  onChange,
}: {
  isZh: boolean;
  value: string | undefined;
  disabled?: boolean;
  onChange: (lightLookId: string) => void;
}) {
  const label = isZh ? "打光風格" : "Light look";
  return (
    <div className={`nodrag ${DIALOG_LABEL}`}>
      {label}
      <CanvasPreviewSelect
        value={value ?? JUTSU_LIGHT_LOOKS[0]?.id ?? ""}
        ariaLabel={label}
        disabled={disabled}
        options={JUTSU_LIGHT_LOOKS.map((look) => ({
          value: look.id,
          label: isZh ? look.nameZhHant : look.nameEn,
          previewUrl: look.image,
        }))}
        onChange={onChange}
      />
    </div>
  );
}
