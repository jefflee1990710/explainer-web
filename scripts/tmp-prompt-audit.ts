import { loadEnvConfig } from "@next/env";
import { videosCollection } from "@/dao";
import { frameSubmitPlan } from "@/service/higgsfield/frame-prompts";
import { clipEndScene, clipStartScene } from "@/service/director/dual-beat";
import { loadRenderableStyle } from "@/service/style/renderable-style";

loadEnvConfig(process.cwd());

async function main() {
  const projects = await videosCollection();
  const list = await projects
    .find({ "phaseA.clips.0": { $exists: true } })
    .sort({ updatedAt: -1 })
    .limit(40)
    .toArray();
  const rows: Array<Record<string, unknown>> = [];
  const overByProject = new Map<string, number>();
  for (const project of list) {
    const style = await loadRenderableStyle({
      styleId: project.styleId,
      ownerClerkUserId: project.clerkUserId,
    } as never).catch(() => undefined);
    for (const clip of project.phaseA!.clips) {
      for (const position of ["start", "end"] as const) {
        let prompt = "";
        try {
          prompt = frameSubmitPlan(project as never, clip.clipNumber, position, undefined, style as never).prompt;
        } catch {
          continue;
        }
        const raw = (position === "start" ? clipStartScene(clip as never) : clipEndScene(clip as never)) || "";
        const sent = (prompt.split("\n").find((line) => line.startsWith("Scene:")) || "").slice(7);
        if (prompt.length >= 5000 && !process.env.SHOWN) {
          process.env.SHOWN = "1";
          console.log(project._id.toString(), clip.clipNumber, position, prompt.length);
          for (const line of prompt.split("\n")) console.log(String(line.length).padStart(5), line.slice(0, 100));
        }
        if (prompt.length >= 5000) {
          const key = `${project._id}`;
          overByProject.set(key, (overByProject.get(key) || 0) + 1);
        }
        rows.push({
          skill: project.skillSlug,
          total: prompt.length,
          raw: raw.length,
          sent: sent.length,
          kept: raw.length ? Math.round((100 * sent.length) / raw.length) : 100,
          hasSet: /2\)\s/.test(sent),
          rawHasSet: /2\)\s/.test(raw),
          lostCore: ["1)", "4)"].some((tag) => raw.includes(`${tag} `) && !sent.includes(`${tag} `)),
          lostLight: raw.includes("3) ") && !sent.includes("3) "),
          lostQuotes: [...raw.matchAll(/「([^」]+)」/g)].filter((m) => !sent.includes(m[0])).length,
        });
      }
    }
  }
  const n = rows.length;
  const over = rows.filter((r) => (r.kept as number) < 100);
  const bySkill = new Map<string, { n: number; cut: number; lost: number }>();
  for (const r of rows) {
    const s = bySkill.get(r.skill as string) || { n: 0, cut: 0, lost: 0 };
    s.n++;
    if ((r.kept as number) < 100) s.cut++;
    if ((r.lostQuotes as number) > 0) s.lost++;
    bySkill.set(r.skill as string, s);
  }
  const keptSorted = over.map((r) => r.kept as number).sort((a, b) => a - b);
  console.log({
    frames: n,
    sceneTrimmed: over.length,
    lostAQuotedLabel: rows.filter((r) => (r.lostQuotes as number) > 0).length,
    lostSet: rows.filter((r) => r.rawHasSet && !r.hasSet).length,
    lostCore: rows.filter((r) => r.lostCore).length,
    lostLight: rows.filter((r) => r.lostLight).length,
    trimmedNotFromBudget: over.filter((r) => (r.total as number) < 4400 && !r.lostLight).length,
    keptMedianWhenTrimmed: keptSorted[Math.floor(keptSorted.length / 2)],
    keptMin: keptSorted[0],
    rawMedian: rows.map((r) => r.raw as number).sort((a, b) => a - b)[Math.floor(n / 2)],
    overCap5000: rows.filter((r) => (r.total as number) >= 5000).length,
  });
  console.log(Object.fromEntries(bySkill));
  console.log(Object.fromEntries(overByProject));
  const totals = rows.map((r) => r.total as number).sort((a, b) => a - b);
  const fixed = rows.map((r) => (r.total as number) - (r.sent as number)).sort((a, b) => a - b);
  console.log({
    fixedP50: fixed[Math.floor(n / 2)],
    fixedP90: fixed[Math.floor(n * 0.9)],
    fixedOverBudget: fixed.filter((f) => f >= 4800).length,
    overWithFloorOnly: rows.filter((r) => (r.total as number) >= 5000 && (r.total as number) - (r.sent as number) < 4800).length,
  });
  console.log({ p10: totals[Math.floor(n * 0.1)], p50: totals[Math.floor(n / 2)], p90: totals[Math.floor(n * 0.9)], max: totals[n - 1] });
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
