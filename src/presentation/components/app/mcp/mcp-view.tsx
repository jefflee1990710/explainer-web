"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/presentation/components/i18n-provider";
import { createMcpKeyAction, revokeMcpKeyAction } from "@/presentation/actions/mcp";
import { McpInstallBlock } from "@/presentation/components/app/mcp/mcp-install-block";
import { McpStatChip } from "@/presentation/components/app/mcp/mcp-stat-chip";
import {
  buildGenerationCurlExample,
  buildPollCurlExample,
  getGenerationApiDocs,
  type GenerationApiFeatureId,
} from "@/service/api/generation-docs";

type KeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
};

type ToolStat = {
  tool: string;
  calls: number;
  errors: number;
  credits: number;
};

export function McpView({
  endpoint,
  keys,
  usage,
}: {
  endpoint: string;
  keys: KeyRow[];
  usage: {
    total: number;
    credits: number;
    errorRate: number;
    byTool: ToolStat[];
  };
}) {
  const { t, locale } = useI18n();
  const isEn = locale === "en";
  const isHans = locale === "zh-Hans";
  const tr = (zhHant: string, zhHans: string, en: string) =>
    isEn ? en : isHans ? zhHans : zhHant;

  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [keyName, setKeyName] = useState("");
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeFeatureId, setActiveFeatureId] =
    useState<GenerationApiFeatureId>("simple");

  const dateLocale =
    locale === "zh-Hant" ? "zh-TW" : locale === "zh-Hans" ? "zh-CN" : locale;

  const baseUrl = useMemo(() => {
    try {
      return new URL(endpoint).origin;
    } catch {
      return "https://scro.io";
    }
  }, [endpoint]);

  const apiDocs = useMemo(() => getGenerationApiDocs(locale), [locale]);
  const activeDoc = useMemo(
    () => apiDocs.find((d) => d.id === activeFeatureId) ?? apiDocs[0]!,
    [apiDocs, activeFeatureId],
  );

  const displayApiKey = newSecret || "exp_live_YOUR_API_KEY";

  const cursorConfig = JSON.stringify(
    {
      mcpServers: {
        explainer: {
          url: endpoint,
          headers: {
            Authorization: `Bearer ${displayApiKey}`,
          },
        },
      },
    },
    null,
    2,
  );

  const claudeDesktopConfig = JSON.stringify(
    {
      mcpServers: {
        explainer: {
          command: "npx",
          args: ["-y", "mcp-remote", endpoint, "--header", "Authorization:${AUTH}"],
          env: {
            AUTH: `Bearer ${displayApiKey}`,
          },
        },
      },
    },
    null,
    2,
  );

  const claudeCode = `claude mcp add --transport http explainer ${endpoint} \\
  --header "Authorization: Bearer ${displayApiKey}"`;

  function createKey() {
    setError(null);
    const trimmedName = keyName.trim() || "Default";
    startTransition(async () => {
      const result = await createMcpKeyAction(trimmedName);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNewSecret(result.secret);
      setKeyName("");
      router.refresh();
    });
  }

  function revokeKey(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await revokeMcpKeyAction(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  async function copySecret() {
    if (!newSecret) return;
    await navigator.clipboard.writeText(newSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mx-auto max-w-5xl pb-12">
      <h1 className="font-display text-3xl font-bold">
        {tr(
          "API 金鑰管理與開發文件 · API & MCP",
          "API 密钥管理与开发文档 · API & MCP",
          "API Key Management & Generation API Docs",
        )}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {tr(
          "建立並管理你的 Bearer API 金鑰（exp_live_*），透過 REST API v1 或 MCP 驅動 Simple、Explainer、Talking、Story、Swap、Teleport、Poster 與 Life 八大生成引擎。",
          "创建并管理你的 Bearer API 密钥（exp_live_*），通过 REST API v1 或 MCP 驱动 Simple、Explainer、Talking、Story、Swap、Teleport、Poster 与 Life 八大生成引擎。",
          "Create and manage Bearer API keys (exp_live_*) to call all 8 video & image generation engines (Simple, Explainer, Talking, Story, Swap, Teleport, Poster, Life) via REST API v1 or MCP.",
        )}
      </p>

      {/* 1. API Key Management */}
      <section className="mt-6 rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-6 shadow-[6px_6px_0_0_rgba(18,20,28,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold">{t("mcp.keysTitle")}</h2>
            <p className="mt-0.5 text-xs text-muted">
              {tr(
                "所有 /api/v1/* 與 /api/mcp 請求皆使用 Authorization: Bearer exp_live_<key> 驗證。",
                "所有 /api/v1/* 与 /api/mcp 请求皆使用 Authorization: Bearer exp_live_<key> 验证。",
                "Authenticate all /api/v1/* and /api/mcp requests with Authorization: Bearer exp_live_<key>.",
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder={tr(
                "金鑰名稱（例：Production API）",
                "密钥名称（例：Production API）",
                "Key name (e.g. Production API)",
              )}
              maxLength={40}
              className="h-9 rounded-full border border-accent-ink/15 bg-paper px-3.5 text-sm focus:outline-none"
            />
            <button
              type="button"
              disabled={pending}
              onClick={createKey}
              className="cursor-pointer rounded-full bg-accent-ink px-4 py-2 text-sm font-semibold text-lime disabled:opacity-40"
            >
              {pending ? t("common.loading") : t("mcp.createKey")}
            </button>
          </div>
        </div>

        {newSecret ? (
          <div className="mt-4 rounded-[1rem] border border-accent-ink/15 bg-lime/40 p-4">
            <p className="text-sm font-medium">{t("mcp.keyOnce")}</p>
            <p className="mt-2 break-all font-mono text-sm">{newSecret}</p>
            <button
              type="button"
              onClick={copySecret}
              className="mt-3 cursor-pointer rounded-full border border-accent-ink/15 px-3 py-1.5 text-xs font-semibold"
            >
              {copied ? t("mcp.keyCopied") : t("mcp.copyKey")}
            </button>
          </div>
        ) : null}

        {keys.length === 0 ? (
          <p className="mt-4 text-sm text-muted">{t("mcp.keysEmpty")}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {keys.map((key) => (
              <li
                key={key.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border border-accent-ink/10 px-4 py-3"
              >
                <div>
                  <p className="font-semibold">{key.name}</p>
                  <p className="font-mono text-xs text-muted">{key.keyPrefix}…</p>
                  <p className="mt-1 text-xs text-muted">
                    {tr("建立於 ", "创建于 ", "Created ")}{" "}
                    {new Date(key.createdAt).toLocaleDateString(dateLocale)} ·{" "}
                    {key.lastUsedAt
                      ? t("mcp.lastUsed", {
                          date: new Date(key.lastUsedAt).toLocaleString(dateLocale),
                        })
                      : t("mcp.neverUsed")}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => revokeKey(key.id)}
                  className="cursor-pointer rounded-full border border-accent-ink/15 px-3 py-1.5 text-xs font-semibold hover:bg-red-500/10 hover:text-red-500"
                >
                  {t("mcp.revokeKey")}
                </button>
              </li>
            ))}
          </ul>
        )}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </section>

      {/* 2. REST API Documentation for All 8 Generation Features */}
      <section className="mt-6 rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-6 shadow-[6px_6px_0_0_rgba(18,20,28,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold">
              {tr(
                "REST API v1 生成端點文件（8 大創作功能）",
                "REST API v1 生成端点文档（8 大创作功能）",
                "REST API v1 Generation Documentation (8 Studio Features)",
              )}
            </h2>
            <p className="mt-1 text-xs text-muted">
              {tr(
                "點選下方功能切換查看對應的 REST 端點、請求參數、計費標準與可一鍵複製的 cURL 範例。",
                "点选下方功能切换查看对应的 REST 端点、请求参数、计费标准与可一键复制的 cURL 范例。",
                "Select a studio feature below to inspect its endpoint, parameters, credit cost, and ready-to-run cURL examples.",
              )}
            </p>
          </div>
          <span className="rounded-full bg-[#12141c] px-3 py-1 font-mono text-xs font-semibold text-[#c6f24b]">
            {baseUrl}/api/v1
          </span>
        </div>

        {/* 8 Feature Selector Pills */}
        <div className="mt-4 flex flex-wrap gap-2">
          {apiDocs.map((doc) => {
            const active = doc.id === activeDoc.id;
            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => setActiveFeatureId(doc.id)}
                className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                  active
                    ? "border-[#12141c] bg-[#12141c] text-[#c6f24b]"
                    : "border-accent-ink/15 bg-paper text-foreground hover:border-accent-ink/40"
                }`}
              >
                {doc.id}
              </button>
            );
          })}
        </div>

        {/* Active Feature Endpoint Specification */}
        <div className="mt-5 rounded-2xl border border-accent-ink/12 bg-paper/60 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-[#c6f24b] px-2 py-0.5 font-mono text-xs font-extrabold text-[#12141c]">
                  {activeDoc.method}
                </span>
                <code className="font-mono text-sm font-bold">
                  {activeDoc.endpoint}
                </code>
                <span className="rounded-full border border-accent-ink/15 px-2.5 py-0.5 text-[11px] font-semibold text-muted">
                  {activeDoc.badge}
                </span>
              </div>
              <h3 className="mt-2 font-display text-lg font-bold">
                {activeDoc.title}
              </h3>
              <p className="mt-1 text-sm text-muted">{activeDoc.summary}</p>
            </div>
            <div className="rounded-xl border border-accent-ink/10 bg-paper px-3.5 py-2 text-right text-xs">
              <span className="block font-semibold text-muted">
                {tr("計費標準", "计费标准", "Credit Cost")}
              </span>
              <span className="mt-0.5 block font-bold">{activeDoc.creditCost}</span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted">
            <span>
              <strong className="text-foreground">
                {tr("狀態查詢 (Poll)：", "状态查询 (Poll)：", "Poll Status: ")}
              </strong>
              <code className="ml-1 font-mono">GET {activeDoc.pollEndpoint}</code>
            </span>
            {activeDoc.actionEndpoint ? (
              <span>
                <strong className="text-foreground">
                  {tr("後續操作 (Actions)：", "后续操作 (Actions)：", "Follow-up Actions: ")}
                </strong>
                <code className="ml-1 font-mono">POST {activeDoc.actionEndpoint}</code>
              </span>
            ) : null}
          </div>

          {/* Parameters Table */}
          <div className="mt-5 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-accent-ink/15 text-muted">
                  <th className="py-2 pr-3 font-semibold">
                    {tr("參數名稱", "参数名称", "Parameter")}
                  </th>
                  <th className="py-2 pr-3 font-semibold">
                    {tr("型別", "类型", "Type")}
                  </th>
                  <th className="py-2 pr-3 font-semibold">
                    {tr("必填", "必填", "Required")}
                  </th>
                  <th className="py-2 font-semibold">
                    {tr("說明", "说明", "Description")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeDoc.parameters.map((param) => (
                  <tr
                    key={param.name}
                    className="border-b border-accent-ink/8 align-top"
                  >
                    <td className="py-2 pr-3 font-mono font-bold">
                      {param.name}
                    </td>
                    <td className="py-2 pr-3 font-mono text-muted">
                      {param.type}
                    </td>
                    <td className="py-2 pr-3">
                      {param.required ? (
                        <span className="rounded bg-accent-ink px-1.5 py-0.5 text-[10px] font-bold text-lime">
                          {tr("必填", "必填", "Required")}
                        </span>
                      ) : (
                        <span className="text-muted">
                          {tr("選填", "选填", "Optional")}
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-muted">{param.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Copyable cURL & Response Blocks */}
          <McpInstallBlock
            title={tr(
              `1. 發起生成請求 (${activeDoc.method} ${activeDoc.endpoint})`,
              `1. 发起生成请求 (${activeDoc.method} ${activeDoc.endpoint})`,
              `1. Create Generation Job (${activeDoc.method} ${activeDoc.endpoint})`,
            )}
            code={buildGenerationCurlExample(activeDoc, baseUrl, displayApiKey)}
          />

          <McpInstallBlock
            title={tr(
              `2. 查詢任務狀態 (GET ${activeDoc.pollEndpoint})`,
              `2. 查询任务状态 (GET ${activeDoc.pollEndpoint})`,
              `2. Poll Job Status (GET ${activeDoc.pollEndpoint})`,
            )}
            code={buildPollCurlExample(activeDoc, baseUrl, displayApiKey)}
          />

          <McpInstallBlock
            title={tr("回應範例 (201 Created)", "响应范例 (201 Created)", "Sample Response (201 Created)")}
            code={JSON.stringify(activeDoc.sampleResponse, null, 2)}
          />
        </div>
      </section>

      {/* 3. MCP Server Configuration */}
      <section className="mt-6 rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-6">
        <h2 className="font-display text-lg font-bold">{t("mcp.installTitle")}</h2>
        <p className="mt-2 break-all font-mono text-xs text-muted">{endpoint}</p>

        <McpInstallBlock title={t("mcp.installCursor")} code={cursorConfig} />
        <McpInstallBlock
          title={t("mcp.installClaudeDesktop")}
          code={claudeDesktopConfig}
        />
        <McpInstallBlock title={t("mcp.installClaudeCode")} code={claudeCode} />
      </section>

      {/* 4. 30-Day API & MCP Usage Stats */}
      <section className="mt-6 rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-6">
        <h2 className="font-display text-lg font-bold">{t("mcp.dashboardTitle")}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <McpStatChip label={t("mcp.calls30d", { count: String(usage.total) })} />
          <McpStatChip
            label={t("mcp.credits30d", { credits: String(usage.credits) })}
          />
          <McpStatChip
            label={t("mcp.errorRate", { rate: String(usage.errorRate) })}
          />
        </div>

        {usage.byTool.length === 0 ? (
          <p className="mt-4 text-sm text-muted">{t("mcp.noUsage")}</p>
        ) : (
          <div className="mt-4">
            <h3 className="text-sm font-semibold">{t("mcp.byTool")}</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {usage.byTool.map((row) => (
                <li
                  key={row.tool}
                  className="flex justify-between border-t border-accent-ink/10 py-2"
                >
                  <span className="font-mono">{row.tool}</span>
                  <span className="text-muted">
                    {row.calls} calls · {row.credits} credits · {row.errors} err
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
