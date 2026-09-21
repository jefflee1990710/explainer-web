import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { videosCollection } from "../src/lib/collections";
import { regenerateFrames } from "../src/lib/higgsfield/pipeline";
import type { Project } from "../src/types/project";

loadEnvConfig(process.cwd());

async function main() {
  const id = new ObjectId("6aae09120d76b8b8baa76aaa");
  const project = (await videosCollection().then((c) => c.findOne({ _id: id }))) as Project;
  try {
    await regenerateFrames(project, [
      { clipNumber: 1, position: "start" },
      { clipNumber: 1, position: "end" },
    ]);
    console.log("ok");
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();
