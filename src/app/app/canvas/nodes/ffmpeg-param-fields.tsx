// Table-driven controls for FFmpeg edit params (see ffmpeg-param-field-table.ts).

import { CanvasTextDialogField } from "@/app/app/canvas/nodes/canvas-text-dialog-field";
import { FFMPEG_PARAM_FIELDS, type FfmpegParamField } from "@/app/app/canvas/nodes/ffmpeg-param-field-table";

const fieldClass =
  "nodrag rounded-[8px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90";

type Props = {
  modelId: string;
  isZh: boolean;
  toolParams: Record<string, unknown>;
  onToolParam: (key: string, value: unknown) => void;
};

function FieldControl({ field, isZh, toolParams, onToolParam }: { field: FfmpegParamField } & Omit<Props, "modelId">) {
  const raw = toolParams[field.key];
  const label = isZh ? field.zh : field.en;

  if (field.kind === "check") {
    return (
      <label className="flex cursor-pointer items-center gap-1.5 text-[10.5px] text-white/70">
        <input
          type="checkbox"
          checked={raw === undefined ? Boolean(field.def) : Boolean(raw)}
          onChange={(e) => onToolParam(field.key, e.target.checked)}
          className="nodrag accent-[#c6f24b]"
        />
        {label}
      </label>
    );
  }

  return (
    <div className={`flex flex-col gap-1 ${field.wide ? "col-span-2" : ""}`}>
      <label className="text-[10px] text-white/50">{label}</label>
      {field.kind === "select" ? (
        <select
          value={String(raw ?? field.def ?? "")}
          onChange={(e) => onToolParam(field.key, e.target.value)}
          className={`${fieldClass} cursor-pointer`}
        >
          {field.options?.map(([value, zh, en]) => (
            <option key={value} value={value}>
              {isZh ? zh : en}
            </option>
          ))}
        </select>
      ) : field.kind === "number" ? (
        <input
          type="number"
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          value={raw !== undefined ? Number(raw) : field.def !== undefined ? Number(field.def) : ""}
          onChange={(e) => onToolParam(field.key, e.target.value === "" ? undefined : Number(e.target.value))}
          className={fieldClass}
        />
      ) : field.kind === "textarea" ? (
        <CanvasTextDialogField
          value={String(raw ?? "")}
          onValue={(next) => onToolParam(field.key, next)}
          rows={2}
          dialogLabel={label}
          className={`${fieldClass} resize-y`}
        />
      ) : (
        <CanvasTextDialogField
          multiline={false}
          value={String(raw ?? "")}
          onValue={(next) => onToolParam(field.key, next)}
          dialogLabel={label}
          className={fieldClass}
        />
      )}
    </div>
  );
}

export function FfmpegParamFields({ modelId, isZh, toolParams, onToolParam }: Props) {
  const fields = (FFMPEG_PARAM_FIELDS[modelId] ?? []).filter((f) => !f.show || f.show(toolParams));
  if (fields.length === 0) return null;
  return (
    <div className="grid grid-cols-2 items-end gap-1.5">
      {fields.map((field) => (
        <FieldControl key={field.key} field={field} isZh={isZh} toolParams={toolParams} onToolParam={onToolParam} />
      ))}
    </div>
  );
}
