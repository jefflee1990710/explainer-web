"use client";

import type { ReactNode } from "react";
import { DirectorPromptBlock } from "@/app/scroadmin/analytics/directors/director-prompt-block";
import { DirectorVisibilityToggle } from "@/app/scroadmin/analytics/directors/director-visibility-toggle";
import type { DirectorFieldRow, HardcodedDirectorDetail } from "@/service/director/admin-catalog";

function FieldTable({ rows }: { rows: DirectorFieldRow[] }) {
  return (
    <dl className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white">
      {rows.map((row) => (
        <div key={row.key} className="grid gap-1 px-4 py-3 sm:grid-cols-[12rem_1fr] sm:gap-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {row.label}
            <span className="mt-0.5 block font-mono normal-case tracking-normal text-zinc-400">{row.key}</span>
          </dt>
          <dd className="whitespace-pre-wrap text-sm leading-6 text-[#12141c]">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{title}</h3>
      {children}
    </section>
  );
}

// Full hardcoded director record: settings, profile, prompts, and runtime rules.
export function DirectorDetailPanel({
  director,
  pickerEnabled,
  operatorEmail,
  onVisibility,
}: {
  director: HardcodedDirectorDetail;
  pickerEnabled: boolean;
  operatorEmail: string;
  onVisibility: (slug: string, enabled: boolean) => void;
}) {
  const updated = new Date(director.updatedAt).toLocaleString("zh-HK");
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start gap-4">
        {director.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={director.previewUrl}
            alt=""
            className="h-24 w-16 rounded-xl object-cover ring-1 ring-zinc-200"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs text-zinc-500">{director.slug}</p>
          <h2 className="mt-1 font-display text-2xl font-bold text-[#12141c]">{director.title}</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-700">{director.description}</p>
          <p className="mt-2 text-sm leading-6 text-zinc-600">{director.suggestedUseCase}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-700">排序 {director.sortOrder}</span>
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-700">
              {director.isActive ? "啟用" : "停用"}
            </span>
            {!pickerEnabled ? (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">僅管理員可見</span>
            ) : director.hiddenInPicker ? (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">不在選擇器</span>
            ) : (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800">選擇器可見</span>
            )}
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-500">更新 {updated}</span>
          </div>
          <p className="mt-2 font-mono text-[11px] text-zinc-400">{director.id}</p>
          <DirectorVisibilityToggle
            slug={director.slug}
            enabled={pickerEnabled}
            operatorEmail={operatorEmail}
            onChange={onVisibility}
          />
        </div>
      </header>

      <Section title="行為設定">
        <FieldTable rows={director.behavior} />
      </Section>

      <Section title="輸入限制">
        <FieldTable
          rows={[
            { key: "requiresSource", label: "需要指令", value: director.inputSchema.requiresSource ? "是" : "否" },
            {
              key: "optionalCharacterImage",
              label: "角色圖可選",
              value: director.inputSchema.optionalCharacterImage ? "是" : "否",
            },
            { key: "aspectRatios", label: "比例", value: director.inputSchema.aspectRatios.join(", ") },
            {
              key: "durationPresets",
              label: "時長預設",
              value: director.inputSchema.durationPresets.join(", ") || "未設定",
            },
          ]}
        />
      </Section>

      <Section title="生成預設">
        <p className="text-xs leading-5 text-zinc-500">
          imageQuality 與 imageResolution 會進靜幀生成。寫實風格會改成 high / 2k。imageModel 與 videoModel
          存在導演物件上，目前送出工作不會讀這兩個欄位。分鏡規劃模型是頁首標示的 Gemini。
        </p>
        <FieldTable
          rows={[
            { key: "imageModel", label: "imageModel", value: director.higgsfieldDefaults.imageModel },
            { key: "imageQuality", label: "imageQuality", value: director.higgsfieldDefaults.imageQuality },
            { key: "imageResolution", label: "imageResolution", value: director.higgsfieldDefaults.imageResolution },
            { key: "videoModel", label: "videoModel", value: director.higgsfieldDefaults.videoModel },
          ]}
        />
      </Section>

      <Section title="Profile">
        <FieldTable rows={director.profile} />
      </Section>

      <Section title="Performance">
        {director.performance.length === 0 ? (
          <p className="text-sm text-zinc-500">這個導演沒有 performance。</p>
        ) : (
          director.performance.map((group) => (
            <div key={group.language} className="space-y-2">
              <p className="text-sm font-semibold text-[#12141c]">{group.label}</p>
              <FieldTable rows={group.slots} />
            </div>
          ))
        )}
      </Section>

      <Section title="System prompt">
        <DirectorPromptBlock title="systemPrompt" text={director.systemPrompt} defaultOpen />
      </Section>

      <Section title="References">
        {director.references.length === 0 ? (
          <p className="text-sm text-zinc-500">沒有 reference 檔。</p>
        ) : (
          director.references.map((ref) => (
            <DirectorPromptBlock key={ref.path} title={ref.path} text={ref.content} />
          ))
        )}
      </Section>

      <Section title="Phase A / Phase B 技能提示">
        <p className="text-xs leading-5 text-zinc-500">
          由 system prompt 加上對應 reference 組成，不含每次生成才接上的視覺風格。Phase A 排除
          prompt-contract 與 examples。Phase B 只含 prompt-contract。
        </p>
        <DirectorPromptBlock title="Phase A 技能提示" text={director.phaseAPrompt} />
        <DirectorPromptBlock title="Phase B 技能提示" text={director.phaseBPrompt} />
      </Section>

      <Section title="執行時附加規則">
        {director.runtimeBlocks.length === 0 ? (
          <p className="text-sm text-zinc-500">這個導演沒有專屬附加規則。通用的語言、關鍵幀和場景細節規則仍會在生成時接上。</p>
        ) : (
          director.runtimeBlocks.map((block) => (
            <DirectorPromptBlock key={block.title} title={block.title} note={block.note} text={block.text} />
          ))
        )}
      </Section>
    </div>
  );
}
