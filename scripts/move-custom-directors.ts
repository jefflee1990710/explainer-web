/**
 * Move custom directors out of `skills` into `userDirectors`, keeping `_id`.
 * Existing videos store that id as `skillId`.
 * Usage: npx tsx scripts/move-custom-directors.ts
 */
import { loadEnvConfig } from "@next/env";
import { skillsCollection, userDirectorsCollection } from "@/dao";

loadEnvConfig(process.cwd());

async function main() {
  const skills = await skillsCollection();
  const directors = await userDirectorsCollection();
  const docs = await skills.find({ ownerClerkUserId: { $exists: true, $type: "string", $ne: "" } }).toArray();
  let moved = 0;
  for (const doc of docs) {
    if (!doc.ownerClerkUserId) continue;
    await directors.replaceOne({ _id: doc._id }, doc, { upsert: true });
    const removed = await skills.deleteOne({ _id: doc._id, ownerClerkUserId: doc.ownerClerkUserId });
    if (removed.deletedCount !== 1) {
      throw new Error(`copied ${doc._id.toHexString()} but did not remove it from skills`);
    }
    moved += 1;
  }
  const left = await skills.countDocuments({ ownerClerkUserId: { $exists: true, $type: "string", $ne: "" } });
  console.log(`moved ${moved} custom directors; ${left} remain in skills`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
