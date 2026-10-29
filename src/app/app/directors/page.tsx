import { requireAppUser } from "@/service/auth";
import { listSelectableSkills } from "@/service/director/selectable-skills";
import { toPublicSkills } from "@/presentation/serialize";
import { DirectorGrid } from "@/presentation/components/app/directors/director-grid";
import { DirectorsHeader } from "@/presentation/components/app/directors/directors-header";

export default async function DirectorsPage() {
  const user = await requireAppUser();
  const skills = await listSelectableSkills(user.clerkUserId);
  const publicSkills = toPublicSkills(skills);
  const systemDirectors = publicSkills.filter((item) => !item.isCustom);
  const myDirectors = publicSkills.filter((item) => item.isCustom);

  return (
    <div className="space-y-8">
      <DirectorsHeader systemDirectors={systemDirectors} />
      <DirectorGrid section="mine" directors={myDirectors} />
      <DirectorGrid section="system" directors={systemDirectors} />
    </div>
  );
}
