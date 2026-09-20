"use client";

import { motion } from "framer-motion";
import type { PublicSkill } from "@/lib/serialize";

// Video-type (narrative skill) chips for the create form; skill is per video, not per folder.
export function SkillPicker({
  skills,
  value,
  onChange,
  disabled,
}: {
  skills: PublicSkill[];
  value: string;
  onChange: (slug: string) => void;
  disabled?: boolean;
}) {
  if (skills.length === 0) {
    return <p className="text-sm text-muted">目前沒有可用的影片類型。</p>;
  }

  return (
    <div role="radiogroup" aria-label="影片類型" className="grid gap-2 sm:grid-cols-2">
      {skills.map((skill) => {
        const active = skill.slug === value;
        return (
          <motion.button
            key={skill.slug}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(skill.slug)}
            whileTap={{ scale: 0.98 }}
            className={`flex min-h-[52px] cursor-pointer flex-col items-start justify-center rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 ${
              active
                ? "border-accent-ink bg-accent-ink text-paper"
                : "border-accent-ink/10 bg-paper/70 hover:border-accent-ink/30"
            }`}
          >
            <span className="text-sm font-semibold">{skill.titleZh}</span>
            <span className={`mt-0.5 text-xs ${active ? "text-paper/75" : "text-muted"}`}>
              {skill.title}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
