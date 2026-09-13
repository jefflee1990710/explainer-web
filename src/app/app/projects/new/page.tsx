import { redirect } from "next/navigation";
import { skillsCollection } from "@/lib/collections";
import { toPublicSkill } from "@/lib/serialize";
import { NewProjectForm } from "./new-project-form";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ skill?: string }>;
}) {
  const params = await searchParams;
  const slug = typeof params.skill === "string" ? params.skill : "";
  const skills = await skillsCollection();
  const skill = await skills.findOne({
    slug: slug || "cartoon-explainer-video-director",
    isActive: true,
  });
  if (!skill) redirect("/app/skills");

  return (
    <div>
      <p className="text-sm text-muted">{skill.title}</p>
      <h1 className="mt-2 text-3xl font-semibold">{skill.titleZh}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        必填題材與畫面比例。AI 會先交出分鏡，不會立刻產片。
      </p>
      <NewProjectForm skill={toPublicSkill(skill)} />
    </div>
  );
}
