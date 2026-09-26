import { SKILL_GUIDE_FIELDS, type SkillGuide } from "@/presentation/components/app/projects/[id]/skill-guide";

// Selected-skill cheat sheet above the type cards, not inside them.
export function SkillGuideRows({ guide }: { guide: SkillGuide }) {
  return (
    <dl className="grid gap-1.5 sm:grid-cols-2">
      {SKILL_GUIDE_FIELDS.map((field) => (
        <div key={field.key} className="grid grid-cols-[2.25rem_1fr] gap-2 text-[11px] leading-4">
          <dt className="font-semibold text-muted">{field.label}</dt>
          <dd className="text-foreground/85">{guide[field.key]}</dd>
        </div>
      ))}
    </dl>
  );
}
