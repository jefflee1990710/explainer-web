import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";
import { loadStoredSkill } from "@/service/director/load-skill";
import { resolveRunSkill } from "@/service/director/run-skill";
import { loadRenderableStyle } from "@/service/style/renderable-style";
import { runPhaseBForClip } from "@/service/director/run-phase-b";
import { withCurrentCharacterVoices } from "@/service/character/voice-cast";

loadEnvConfig(process.cwd());

async function main() {
  const clipNumber = Number(process.argv[2] || 1);
  const projects = await videosCollection();
  const project = await projects.findOne({ _id: new ObjectId("6ac78edcc542118f53c3b142") });
  if (!project?.phaseA) throw new Error("missing project");
  const skill = await loadStoredSkill(project.skillId);
  if (!skill) throw new Error("missing skill");
  const style = await loadRenderableStyle({
    styleId: project.styleId,
    ownerClerkUserId: project.clerkUserId,
  });
  const resolved = await resolveRunSkill(skill);
  console.log("clip", clipNumber, "model", process.env.DIRECTOR_MODEL || "gemini-3.8-flash");
  const out = await runPhaseBForClip({
    skill: resolved,
    style,
    phaseA: project.phaseA,
    clipNumber,
    language: project.language,
    voiceGender: project.voiceGender,
    speechPace: project.speechPace,
    characterImageUrl: project.characterImageUrl,
    cast: await withCurrentCharacterVoices(project.cast),
  });
  console.log(JSON.stringify({ clipNumber: out.clipNumber, durationSeconds: out.durationSeconds, promptLen: out.prompt.length }, null, 2));
}

main().catch((e) => {
  console.error("FAILED", e);
  process.exit(1);
});
