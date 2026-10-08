import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import sharp from "sharp";
import { charactersCollection, videosCollection } from "@/dao";

loadEnvConfig(process.cwd());

const VIDEO_ID = new ObjectId("6ac5102f1cb7f316b0c054d9");

async function main() {
  const videos = await videosCollection();
  const video = await videos.findOne({ _id: VIDEO_ID });
  if (!video) throw new Error("missing video");
  const cast = video.cast ?? [];
  console.log(
    JSON.stringify(
      {
        skill: video.skillSlug,
        aspect: video.aspectRatio,
        cast: cast.map((member) => ({
          name: member.name,
          characterId: String(member.characterId),
          versionId: String(member.versionId),
          blueprintUrl: member.blueprintUrl,
          prompt: member.prompt?.slice(0, 180),
        })),
        sceneRefs: video.phaseA?.clips?.[0]?.referenceImageIds,
        products: (video.products ?? []).map((item) => item.name),
        referenceImages: video.referenceImages?.length,
      },
      null,
      2,
    ),
  );
  const characters = await charactersCollection();
  for (const member of cast) {
    const character = await characters.findOne({ _id: member.characterId });
    const version = character?.versions.find((item) => item.id.equals(member.versionId));
    console.log(
      JSON.stringify(
        {
          name: character?.name,
          profileUrl: version?.profileUrl,
          profileStatus: version?.profileStatus,
          blueprintUrl: version?.blueprintUrl,
          styleId: version?.styleId,
        },
        null,
        2,
      ),
    );
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
