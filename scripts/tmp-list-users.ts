import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { usersCollection, subscriptionsCollection, projectsCollection, skillsCollection } =
    await import("@/dao");
  const users = await usersCollection();
  const subs = await subscriptionsCollection();
  const folders = await projectsCollection();
  const skills = await skillsCollection();
  const list = await users
    .find({}, { projection: { email: 1, name: 1, credits: 1, clerkUserId: 1 } })
    .toArray();
  const active = await subs
    .find(
      { status: { $in: ["trialing", "active"] } },
      { projection: { clerkUserId: 1, planId: 1, status: 1 } },
    )
    .toArray();
  const activeIds = new Set(active.map((row) => row.clerkUserId));
  for (const user of list) {
    const email = String(user.email || "");
    const masked = email.replace(/(^.).*(@.*$)/, "$1***$2");
    const folderCount = await folders.countDocuments({ clerkUserId: user.clerkUserId });
    console.log(
      JSON.stringify({
        name: user.name,
        email: masked,
        credits: user.credits,
        subscribed: activeIds.has(user.clerkUserId),
        folders: folderCount,
      }),
    );
  }
  const skillRows = await skills.find({}, { projection: { slug: 1, isActive: 1 } }).toArray();
  console.log(skillRows.map((row) => `${row.slug}:${row.isActive}`).join(","));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
