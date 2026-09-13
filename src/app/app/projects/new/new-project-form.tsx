"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createProjectAction } from "@/lib/actions/projects";
import { uploadCharacterImageAction } from "@/lib/actions/upload";
import { DURATION_PRESETS } from "@/lib/director/duration-presets";
import type { PublicSkill } from "@/lib/serialize";

export function NewProjectForm({ skill }: { skill: PublicSkill }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [characterImageUrl, setCharacterImageUrl] = useState("");

  async function onUpload(file: File) {
    const data = new FormData();
    data.set("file", file);
    const result = await uploadCharacterImageAction(data);
    if (result.ok) setCharacterImageUrl(result.url);
    else setError(result.error);
  }

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError("");
    formData.set("skillSlug", skill.slug);
    if (characterImageUrl) formData.set("characterImageUrl", characterImageUrl);
    const result = await createProjectAction(formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`/app/projects/${result.project.id}`);
  }

  return (
    <form action={onSubmit} className="mt-8 space-y-6 rounded-2xl border border-line bg-card p-6">
      <label className="block">
        <span className="text-sm font-medium">題材或腳本</span>
        <textarea
          name="source"
          required
          rows={8}
          className="mt-2 w-full rounded-xl border border-line px-3 py-2 text-sm"
          placeholder="貼上文章、產品說明或你想解釋的主題"
        />
      </label>

      <fieldset>
        <legend className="text-sm font-medium">畫面比例</legend>
        <div className="mt-2 flex gap-3 text-sm">
          {["16:9", "9:16", "1:1"].map((ratio) => (
            <label key={ratio} className="flex items-center gap-2">
              <input type="radio" name="aspectRatio" value={ratio} required />
              {ratio}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="text-sm font-medium">片長</span>
        <select
          name="durationPreset"
          defaultValue="punchy"
          className="mt-2 w-full rounded-xl border border-line px-3 py-2 text-sm"
        >
          {Object.values(DURATION_PRESETS).map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}（{preset.hint}）
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium">角色參考圖（選填）</span>
        <input
          type="file"
          accept="image/*"
          className="mt-2 block text-sm"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void onUpload(file);
          }}
        />
        {characterImageUrl ? (
          <p className="mt-2 text-xs text-muted">已上傳參考圖</p>
        ) : null}
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-accent px-5 py-2 text-sm text-white disabled:opacity-60"
      >
        {pending ? "撰寫分鏡中…" : "產生分鏡提案"}
      </button>
    </form>
  );
}
