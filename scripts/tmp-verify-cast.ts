import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";

loadEnvConfig(process.cwd());

async function main() {
  const { getDb } = await import("../src/dao/mongo");
  const db = await getDb();
  const video = await db.collection("videos").findOne({
    _id: new ObjectId("6acc86a73137014a17f22d14"),
  });
  const frame = (video?.frames as Array<Record<string, unknown>> | undefined)?.[0];
  const cast = (video?.cast as Array<Record<string, unknown>> | undefined)?.[0];
  console.log(
    JSON.stringify({
      name: cast?.name,
      characterId: String(cast?.characterId),
      versionId: String(cast?.versionId),
      url: cast?.blueprintUrl,
      frameStatus: frame?.status,
      frameError: frame?.error ?? null,
    }),
  );
  process.exit(0);
}

main();
