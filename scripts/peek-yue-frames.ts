import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";
import { mediaSrc } from "@/util/media-src";
import type { Project } from "@/model/project";

loadEnvConfig(process.cwd());

async function main() {
  const p = (await videosCollection().then((c) =>
    c.findOne({ _id: new ObjectId("6ab10cb5f75ad159e77ddd6e") }),
  )) as Project | null;
  console.log(
    JSON.stringify(
      {
        status: p?.status,
        frames: p?.frames?.map((f) => ({
          c: f.clipNumber,
          p: f.position,
          status: f.status,
          hasBlueprintNote: /BLUEPRINT \/ reference sheet only/.test(f.prompt || ""),
          url: mediaSrc(f),
          error: f.error,
        })),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

main();
