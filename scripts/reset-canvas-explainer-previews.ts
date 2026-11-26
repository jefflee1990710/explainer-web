// One-off: clears every preview inside a canvas's Explainer groups so Run group regenerates them.
// Usage: npx tsx scripts/reset-canvas-explainer-previews.ts <canvasId> [--dry-run]

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const [canvasId, flag] = process.argv.slice(2);
  if (!canvasId) throw new Error("Pass a canvas id.");
  const dryRun = flag === "--dry-run";

  const { ObjectId } = await import("mongodb");
  const { canvasProjectsCollection } = await import("@/dao");
  const { canvasGroupsForProject } = await import("@/service/canvas/core/groups");
  const { clearStaleOutputs } = await import("@/service/canvas/core/stale-outputs");

  const projects = await canvasProjectsCollection();
  const project = await projects.findOne({ _id: new ObjectId(canvasId) });
  if (!project) throw new Error(`Canvas ${canvasId} not found.`);

  const explainerIds = canvasGroupsForProject(project.nodes, project.groups)
    .filter((g) => g.kind === "explainer")
    .flatMap((g) => g.memberIds);
  const res = clearStaleOutputs(project.nodes, project.edges, explainerIds, new Date().toISOString());
  console.log(`${dryRun ? "[dry-run] " : ""}clearing ${res.clearedIds.length} node(s):`, res.clearedIds.join(", "));
  if (!dryRun && res.clearedIds.length > 0) {
    await projects.updateOne({ _id: project._id }, { $set: { nodes: res.nodes, updatedAt: new Date() } });
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
