import { requireAppUser } from "@/service/auth";
import { listSelectableSkills } from "@/service/director/selectable-skills";
import { toPublicSkill } from "@/presentation/serialize";
import { DirectorGrid } from "@/presentation/components/app/directors/director-grid";
import { DirectorsHeader } from "@/presentation/components/app/directors/directors-header";

export default async function DirectorsPage() {
  const user = await requireAppUser();
  const skills = (await listSelectableSkills(user.clerkUserId)).map(toPublicSkill);
  const system = skills.filter((skill) => !skill.isCustom);
  const mine = skills.filter((skill) => skill.isCustom);

  return (
    <div>
      <DirectorsHeader />
      <div className="mt-8">
        <DirectorGrid section="system" directors={system} />
      </div>
      <div className="mt-8">
        <DirectorGrid section="mine" directors={mine} />
      </div>
    </div>
  );
}
