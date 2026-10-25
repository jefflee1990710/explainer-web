import { loadEnvConfig } from "@next/env";
import { getUxDiagnosticsReport } from "@/service/analytics/ux-diagnostics";

loadEnvConfig(process.cwd());

async function main() {
  const report = await getUxDiagnosticsReport();
  console.log("=== UX DIAGNOSTICS SUMMARY ===");
  console.log(JSON.stringify(report.kpis, null, 2));
  console.log("\n=== FUNNEL ===");
  for (const step of report.funnel) {
    console.log(
      `${step.label}: ${step.userCount} users (${step.conversionFromTopPercent}% of total, drop-off: -${step.dropOffCount} / -${step.dropOffPercent}%)`,
    );
  }
  console.log("\n=== STUCK STAGES ===");
  for (const stage of report.stuckStages) {
    console.log(
      `- [${stage.severity.toUpperCase()}] ${stage.title}: ${stage.userCount} users (${stage.percentOfUsers}%) | Reason: ${stage.reason} | Sample: ${stage.sampleEmails.join(", ")}`,
    );
  }
  console.log("\n=== RECENT USERS (TOP 15) ===");
  for (const u of report.users.slice(0, 15)) {
    console.log(
      `- ${u.email} | credits=${u.credits} | legal=${u.hasAcceptedLegal} | chars=${u.completedCharacterCount}/${u.characterCount} | videos=${u.videoCount}(sb=${u.storyboardReadyCount},kf=${u.keyframeReadyCount},clip=${u.clipVideoReadyCount},reel=${u.reelReadyCount}) | life=${u.lifeShotCount} | failedJobs=${u.failedJobCount} | stuck=${u.diagnosis.stageId}`,
    );
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
