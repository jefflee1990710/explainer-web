"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { PublicProject } from "@/lib/serialize";

const STATUS_LABEL: Record<string, string> = {
  draft: "草稿",
  phase_a: "撰寫分鏡中",
  awaiting_approval: "待核准",
  approved: "已核准",
  generating: "產片中",
  ready: "已完成",
  failed: "失敗",
};

export function ProjectList({ projects }: { projects: PublicProject[] }) {
  if (projects.length === 0) {
    return (
      <p className="text-sm text-muted">還沒有專案。先選一種風格開始。</p>
    );
  }

  return (
    <div className="grid gap-3">
      {projects.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: index * 0.04 }}
        >
          <Link
            href={`/app/projects/${item.id}`}
            className="block rounded-[1.25rem] border border-accent-ink/10 bg-paper/85 p-5 shadow-[4px_4px_0_0_rgba(18,20,28,0.06)] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_rgba(198,242,75,0.55)]"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-display font-semibold">
                  {item.phaseA?.localizedTitle ||
                    item.phaseA?.englishTitle ||
                    "未命名專案"}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{item.source}</p>
              </div>
              <span className="shrink-0 rounded-full bg-lime/70 px-3 py-1 text-xs font-semibold text-accent-ink">
                {STATUS_LABEL[item.status] || item.status}
              </span>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
