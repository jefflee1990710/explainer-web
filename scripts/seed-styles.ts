import { loadEnvConfig } from "@next/env";
import { stylesCollection } from "@/dao";
import { STYLE_IDS, STYLES, isStyleId } from "@/service/style/catalog";
import { catalogStyleFields } from "@/service/style/load-style";

loadEnvConfig(process.cwd());

// Patch prompt fields onto `styles`. Never touches preview* columns.
async function seedStyle(id: (typeof STYLE_IDS)[number]) {
  const now = new Date();
  const styles = await stylesCollection();
  await styles.updateOne(
    { _id: id },
    {
      $set: {
        ...catalogStyleFields(STYLES[id]),
        updatedAt: now,
      },
    },
    { upsert: true },
  );
  console.log(`Seeded style: ${id}`);
}

// Optional ids (`tsx scripts/seed-styles.ts doodle pixel`) seed only those styles.
async function main() {
  const only = process.argv.slice(2);
  const unknown = only.filter((id) => !isStyleId(id));
  if (unknown.length) throw new Error(`Unknown style id: ${unknown.join(", ")}`);
  for (const id of STYLE_IDS.filter((id) => !only.length || only.includes(id))) {
    await seedStyle(id);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
