import Link from "next/link";
import type { PublicSkill } from "@/lib/serialize";

export function SkillCard({ skill }: { skill: PublicSkill }) {
  return (
    <article className="rounded-2xl border border-line bg-card p-6">
      <p className="text-xs uppercase tracking-wide text-muted">{skill.slug}</p>
      <h2 className="mt-2 text-xl font-semibold">{skill.titleZh}</h2>
      <p className="mt-1 text-sm text-muted">{skill.title}</p>
      <p className="mt-4 text-sm leading-6 text-muted">{skill.description}</p>
      <Link
        href={`/app/projects/new?skill=${skill.slug}`}
        className="mt-6 inline-flex rounded-full bg-accent px-4 py-2 text-sm text-white"
      >
        使用這個技能
      </Link>
    </article>
  );
}
