"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { PublicSkill } from "@/lib/serialize";

export function SkillCard({ skill }: { skill: PublicSkill }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.35 }}
      className="rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-6 shadow-[6px_6px_0_0_rgba(18,20,28,0.08)] backdrop-blur"
    >
      <h2 className="font-display text-xl font-bold">{skill.titleZh}</h2>
      <p className="mt-1 text-sm text-muted">{skill.title}</p>
      <p className="mt-4 text-sm leading-6 text-muted">{skill.description}</p>
      <Link
        href={`/app/projects/new?skill=${skill.slug}`}
        className="mt-6 inline-flex rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c]"
      >
        使用這個風格
      </Link>
    </motion.article>
  );
}
