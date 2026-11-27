"use client";

// Read-only Start / Length / Ratio. Empty and disabled until a source video supplies them.

import type { DerivedVideoSection, SectionRatio } from "@/app/app/canvas/nodes/source-video-section";
import { SECTION_RATIOS } from "@/app/app/canvas/nodes/source-video-section";
import { DIALOG_FIELD, DIALOG_LABEL } from "@/app/app/canvas/scro-dialog-shell";

type Props = {
  isZh: boolean;
  section: DerivedVideoSection | undefined;
};

const fieldClass = `${DIALOG_FIELD} !cursor-default disabled:cursor-not-allowed`;

export function SourceVideoSectionFields({ isZh, section }: Props) {
  const ratio = section?.ratio ?? "";
  return (
    <div className="grid grid-cols-3 gap-2">
      <label className={DIALOG_LABEL}>
        {isZh ? "開始（秒）" : "Start (s)"}
        <input
          type="text"
          readOnly
          disabled={!section}
          value={section ? String(section.start) : ""}
          aria-label={isZh ? "開始（秒）" : "Start (s)"}
          className={fieldClass}
        />
      </label>
      <label className={DIALOG_LABEL}>
        {isZh ? "長度（秒）" : "Length (s)"}
        <input
          type="text"
          readOnly
          disabled={!section}
          value={section ? String(section.length) : ""}
          aria-label={isZh ? "長度（秒）" : "Length (s)"}
          className={fieldClass}
        />
      </label>
      <label className={DIALOG_LABEL}>
        {isZh ? "比例" : "Ratio"}
        <select
          value={ratio}
          disabled
          aria-label={isZh ? "比例" : "Ratio"}
          className={fieldClass}
        >
          <option value="">{section ? "" : "—"}</option>
          {SECTION_RATIOS.map((choice: SectionRatio) => (
            <option key={choice} value={choice}>
              {choice}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
