import { skillsCollection } from "@/lib/collections";
import { toPublicSkill } from "@/lib/serialize";
import { SkillCard } from "./skill-card";

export default async function SkillsPage() {
  const skills = await skillsCollection();
  const list = await skills.find({ isActive: true }).sort({ sortOrder: 1 }).toArray();

  return (
    <div>
      <h1 className="text-3xl font-semibold">技能</h1>
      <p className="mt-2 text-sm text-muted">
        每個技能是一套導演方法。第一個是卡通解說影片導演。
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {list.map((skill) => (
          <SkillCard key={skill.slug} skill={toPublicSkill(skill)} />
        ))}
      </div>
    </div>
  );
}
