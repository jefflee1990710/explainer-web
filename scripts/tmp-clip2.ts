import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";
import { buildFramePrompt } from "@/service/higgsfield/frame-prompts";
import { loadRenderableStyle } from "@/service/style/renderable-style";

loadEnvConfig(process.cwd());

async function main() {
  const projects = await videosCollection();
  const project = await projects.findOne({ _id: new ObjectId("6abe90f81b52ea9fae30415f") });
  if (!project?.phaseA) throw new Error("no phaseA");
  const style = await loadRenderableStyle(project.styleId);
  for (const position of ["start", "end"] as const) {
    const prompt = buildFramePrompt(project as never, 2, position, { style } as never);
    const scene = prompt.split("\n").find((line) => line.startsWith("Scene:")) || "";
    const lock = prompt.split("\n").find((line) => line.startsWith("Silent demonstrator")) || "";
    console.log(`--- ${position} (${prompt.length} chars)\n${scene}\n\n${lock}\n`);
    for (const line of prompt.split("\n")) console.log(String(line.length).padStart(5), line.slice(0, 110));
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
