import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";

loadEnvConfig(process.cwd());

async function main() {
  const { videosCollection } = await import("@/dao");
  const { videoLocksFingerprint } = await import("@/service/director/video-locks");
  const project = await (await videosCollection()).findOne({
    _id: new ObjectId("6aca25d0aee1e0adb1d53a01"),
  });
  if (!project?.phaseA) throw new Error("missing");
  const clips = project.phaseA.clips.map((clip) => ({
    n: clip.clipNumber,
    setId: clip.backgroundSetId ?? null,
    start: clip.startScene || clip.explainerScene,
    end: clip.endScene,
    motion: clip.motionCamera,
  }));
  const scenes = clips.map((clip) => `${clip.start}\n${clip.end}\n${clip.motion}`).join("\n");
  console.log(
    JSON.stringify(
      {
        skillSlug: project.skillSlug,
        objectSheetItems: project.objectSheetItems,
        objectSheetUrl: project.objectSheetUrl ?? null,
        objectSheetError: project.objectSheetError ?? null,
        backgroundPlates: (project.backgroundPlates || []).map((plate) => ({
          setId: plate.setId,
          name: plate.name,
          notes: plate.notes,
          clipNumbers: plate.clipNumbers,
          url: plate.url ?? null,
        })),
        fingerprint: videoLocksFingerprint({
          objects: project.objectSheetItems,
          sets: project.backgroundPlates,
        }),
        whiteboardHits: scenes.match(/whiteboard|白板|board/gi),
        clipSets: clips.map((clip) => ({ n: clip.n, setId: clip.setId })),
        scenes: clips,
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
