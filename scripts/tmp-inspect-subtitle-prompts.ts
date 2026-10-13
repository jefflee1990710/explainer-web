import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";

loadEnvConfig(process.cwd());

function pickLettering(text: string) {
  return (text || "")
    .split(/(?<=\.)\s+/)
    .filter((part) => /subtitle|「|spell exactly|lettering|Look:|on-canvas/i.test(part))
    .map((part) => part.trim());
}

async function main() {
  const videos = await videosCollection();
  const row = await videos.findOne({ _id: new ObjectId("6aca25d0aee1e0adb1d53a01") });
  if (!row) {
    console.log("missing");
    process.exit(0);
  }
  const clips = (row.phaseA?.clips || []).map((c) => {
    const startLabel = [...(c.startScene || "").matchAll(/「([^」]+)」/g)].map((m) => m[1]);
    const endLabel = [...(c.endScene || "").matchAll(/「([^」]+)」/g)].map((m) => m[1]);
    const startSub = [...(c.startScene || "").matchAll(/Subtitle:\s*"([^"]+)"/g)].map((m) => m[1]);
    const endSub = [...(c.endScene || "").matchAll(/Subtitle:\s*"([^"]+)"/g)].map((m) => m[1]);
    return {
      n: c.clipNumber,
      startVo: c.startVo,
      endVo: c.endVo,
      startLabel,
      startSub,
      endLabel,
      endSub,
      sameStart: startLabel[0] === startSub[0],
      sameEnd: endLabel[0] === endSub[0],
    };
  });
  const frame1 = (row.frames || []).find((f) => f.clipNumber === 1 && f.position === "start");
  const clip1 = (row.clips || []).find((c) => c.clipNumber === 1);
  console.log(JSON.stringify({ clips, frame1Lettering: pickLettering(frame1?.prompt || ""), clip1Lettering: pickLettering(clip1?.prompt || "") }, null, 2));
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
