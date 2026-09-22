"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/presentation/components/i18n-provider";
import { createMcpKeyAction, revokeMcpKeyAction } from "@/presentation/actions/mcp";
import { McpInstallBlock } from "@/presentation/components/app/mcp/mcp-install-block";
import { McpStatChip } from "@/presentation/components/app/mcp/mcp-stat-chip";

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
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const dateLocale =
    locale === "zh-Hant" ? "zh-TW" : locale === "zh-Hans" ? "zh-CN" : locale;

  const cursorConfig = JSON.stringify(
    {
      mcpServers: {
        explainer: {
          url: endpoint,
          headers: {
            Authorization: "Bearer YOUR_API_KEY",
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
            AUTH: "Bearer YOUR_API_KEY",
          },
        },
      },
    },
    null,
    2,
  );

  const claudeCode = `claude mcp add --transport http explainer ${endpoint} \\
  --header "Authorization: Bearer YOUR_API_KEY"`;

  function createKey() {
    setError(null);
    startTransition(async () => {
      const result = await createMcpKeyAction("Default");
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNewSecret(result.secret);
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
    <div>
      <h1 className="font-display text-3xl font-bold">{t("mcp.title")}</h1>
      <p className="mt-2 text-sm text-muted">{t("mcp.subtitle")}</p>

      <section className="mt-6 rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-6 shadow-[6px_6px_0_0_rgba(18,20,28,0.08)]">
        <h2 className="font-display text-lg font-bold">{t("mcp.installTitle")}</h2>
        <p className="mt-2 font-mono text-xs text-muted break-all">{endpoint}</p>

        <McpInstallBlock title={t("mcp.installCursor")} code={cursorConfig} />
        <McpInstallBlock title={t("mcp.installClaudeDesktop")} code={claudeDesktopConfig} />
        <McpInstallBlock title={t("mcp.installClaudeCode")} code={claudeCode} />
      </section>

      <section className="mt-6 rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-lg font-bold">{t("mcp.keysTitle")}</h2>
          <button
            type="button"
            disabled={pending}
            onClick={createKey}
            className="rounded-full bg-accent-ink px-4 py-2 text-sm font-semibold text-lime disabled:opacity-40"
          >
            {pending ? t("common.loading") : t("mcp.createKey")}
          </button>
        </div>

        {newSecret ? (
          <div className="mt-4 rounded-[1rem] border border-accent-ink/15 bg-lime/40 p-4">
            <p className="text-sm font-medium">{t("mcp.keyOnce")}</p>
            <p className="mt-2 break-all font-mono text-sm">{newSecret}</p>
            <button
              type="button"
              onClick={copySecret}
              className="mt-3 rounded-full border border-accent-ink/15 px-3 py-1.5 text-xs font-semibold"
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
                  className="rounded-full border border-accent-ink/15 px-3 py-1.5 text-xs font-semibold"
                >
                  {t("mcp.revokeKey")}
                </button>
              </li>
            ))}
          </ul>
        )}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </section>

      <section className="mt-6 rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-6">
        <h2 className="font-display text-lg font-bold">{t("mcp.dashboardTitle")}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <McpStatChip label={t("mcp.calls30d", { count: String(usage.total) })} />
          <McpStatChip label={t("mcp.credits30d", { credits: String(usage.credits) })} />
          <McpStatChip label={t("mcp.errorRate", { rate: String(usage.errorRate) })} />
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
