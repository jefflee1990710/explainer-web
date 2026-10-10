import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { skillsCollection, videosCollection } from "@/dao";

loadEnvConfig(process.cwd());

async function main() {
  const skills = await skillsCollection();
  const skill = await skills.findOne({ slug: "talking-head-director" });
  const videos = await videosCollection();
  const video = await videos.findOne({ _id: new ObjectId("6ac78edcc542118f53c3b142") });
  const scene = video?.phaseA?.clips?.[0]?.startScene || "";
  console.log(
    JSON.stringify(
      {
        skillUpdatedAt: skill?.updatedAt,
        visual: skill?.profile?.visual,
        systemHasBed: /\bbed\b/i.test(skill?.systemPrompt || ""),
        videoSceneHasBed: /\bbed\b/i.test(scene),
        videoSceneHead: scene.slice(0, 280),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
