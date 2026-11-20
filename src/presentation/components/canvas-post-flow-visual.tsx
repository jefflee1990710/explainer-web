"use client";

import { ArrowRight, CheckCircle2, Film, Music, Sparkles } from "lucide-react";
import { useI18n } from "@/presentation/components/i18n-provider";

// Clean Canvas workflow diagram used by the public feature pages.
export function CanvasPostFlowVisual() {
  const { locale } = useI18n();
  const isZhHant = locale === "zh-Hant";
  const isZhHans = locale === "zh-Hans";

  const copy = isZhHant
    ? {
        badge: "Scro Canvas 自動剪輯與混音流程",
        node1Title: "AI 影片與配音積木",
        node1Desc: "口播／解說／換角成品 ＋ AI 旁白",
        node2Title: "自動混音與串接",
        node2Desc: "自動壓低背景音、去頭尾靜音、順暢合併",
        node3Title: "成片直接下載",
        node3Desc: "背景自動跑完，直接下載高畫質 MP4",
      }
    : isZhHans
      ? {
          badge: "Scro Canvas 自动剪辑与混音流程",
          node1Title: "AI 视频与配音积木",
          node1Desc: "口播 / 解说 / 换角成品 + AI 旁白",
          node2Title: "自动混音与拼接",
          node2Desc: "自动避让人声、去头尾静音、流畅合并",
          node3Title: "成片直接下载",
          node3Desc: "后台自动跑完，直接下载高清 MP4",
        }
      : {
          badge: "Scro Canvas Automated Assembly",
          node1Title: "Generated Clips & AI Voice",
          node1Desc: "Talking-head, explainer, or swap clips + crisp voiceover",
          node2Title: "Auto Merge & Audio Mix",
          node2Desc: "Trim dead air, duck background music & stitch seamlessly",
          node3Title: "Ready-to-Post MP4",
          node3Desc: "Completes in the cloud—preview and download anywhere",
        };

  return (
    <div className="rounded-2xl border border-[#252c3b] bg-[#0e121a] p-5 text-white shadow-[0_18px_48px_rgba(18,20,28,0.18)] md:p-7">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#c6f24b]">
          <Sparkles className="h-3.5 w-3.5" />
          {copy.badge}
        </span>
        <span className="rounded-full bg-[#c6f24b]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#c6f24b]">
          100% Automated
        </span>
      </div>

      <div className="mt-5 grid items-center gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
        <div className="rounded-xl border border-white/12 bg-[#141925] p-4">
          <div className="flex items-center gap-2 text-sky-400">
            <Film className="h-4 w-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">{isZhHant ? "輸入" : isZhHans ? "输入" : "Input"}</span>
          </div>
          <p className="mt-2 font-display text-sm font-bold text-white">{copy.node1Title}</p>
          <p className="mt-1 text-xs leading-5 text-white/60">{copy.node1Desc}</p>
        </div>

        <ArrowRight className="mx-auto hidden h-4 w-4 text-[#c6f24b] md:block" />

        <div className="rounded-xl border border-[#c6f24b]/35 bg-[#171e2b] p-4">
          <div className="flex items-center gap-2 text-amber-300">
            <Music className="h-4 w-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">{isZhHant ? "自動處理" : isZhHans ? "自动处理" : "Auto-Flow"}</span>
          </div>
          <p className="mt-2 font-display text-sm font-bold text-white">{copy.node2Title}</p>
          <p className="mt-1 text-xs leading-5 text-white/65">{copy.node2Desc}</p>
        </div>

        <ArrowRight className="mx-auto hidden h-4 w-4 text-[#c6f24b] md:block" />

        <div className="rounded-xl border border-emerald-400/35 bg-emerald-500/10 p-4">
          <div className="flex items-center gap-2 text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">{isZhHant ? "完成" : isZhHans ? "完成" : "Done"}</span>
          </div>
          <p className="mt-2 font-display text-sm font-bold text-white">{copy.node3Title}</p>
          <p className="mt-1 text-xs leading-5 text-white/70">{copy.node3Desc}</p>
        </div>
      </div>
    </div>
  );
}
