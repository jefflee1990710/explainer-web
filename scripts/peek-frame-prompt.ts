import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";
import {
  characterReferenceUrls,
  frameLockReferenceUrls,
  sceneImageReferenceUrls,
} from "@/service/character/cast-prompt";
import { buildFramePrompt } from "@/service/higgsfield/frame-prompts";
import { mediaSrc } from "@/util/media-src";
import type { Project } from "@/model/project";

loadEnvConfig(process.cwd());

async function main() {
  const id = process.argv[2] || "6ab10cb5f75ad159e77ddd6e";
  const clipNumber = Number(process.argv[3] || "1");
  const p = (await videosCollection().then((c) =>
    c.findOne({ _id: new ObjectId(id) }),
  )) as Project | null;
  if (!p) throw new Error("找不到專案");

  const blueprintUrls = characterReferenceUrls(p);
  const out = (["start", "end"] as const).map((position) => {
    const stored = p.frames?.find((f) => f.clipNumber === clipNumber && f.position === position);
    const lockUrls = frameLockReferenceUrls(p);
    const live = buildFramePrompt(p, clipNumber, position);
    return {
      position,
      attachedRefs: sceneImageReferenceUrls({ lockUrls }).map((url) => ({
        kind: "blueprint" as const,
        url,
      })),
      storedPrompt: stored?.prompt || null,
      livePrompt: live,
    };
  });

  console.log(
    JSON.stringify(
      {
        projectId: id,
        language: p.language,
        sceneTextLanguage: p.sceneTextLanguage,
        clipNumber,
        blueprintUrl: blueprintUrls[0] || null,
        startUrl: mediaSrc(p.frames?.find((f) => f.clipNumber === clipNumber && f.position === "start")),
        endUrl: mediaSrc(p.frames?.find((f) => f.clipNumber === clipNumber && f.position === "end")),
        frames: out,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

main();
