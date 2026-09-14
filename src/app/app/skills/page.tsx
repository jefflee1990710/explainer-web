import { skillsCollection } from "@/lib/collections";
import { toPublicSkill } from "@/lib/serialize";
import { SkillCard } from "./skill-card";

export default async function SkillsPage() {
  const skills = await skillsCollection();
  const list = await skills.find({ isActive: true }).sort({ sortOrder: 1 }).toArray();

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">風格</h1>
      <p className="mt-2 text-sm text-muted">
        依用途挑選解說風格。可用於 Reels、行銷、簡報與更多場景，之後會持續新增。
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {list.map((skill) => (
          <SkillCard key={skill.slug} skill={toPublicSkill(skill)} />
        ))}
      </div>
    </div>
  );
}
