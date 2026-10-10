import { loadEnvConfig } from "@next/env";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { skillsCollection } from "@/dao";
import { parseSystemProfile } from "@/service/director/profile";

loadEnvConfig(process.cwd());

async function read(relative: string) {
  return readFile(path.join(process.cwd(), "skills/talking-head-director", relative), "utf8");
}

async function main() {
  const skills = await skillsCollection();
  const before = await skills.findOne({ slug: "talking-head-director" });
  if (!before) throw new Error("找不到對鏡讀稿導演");
  const profile = parseSystemProfile(JSON.parse(await read("profile.json")));
  const systemPrompt = await read("SKILL.md");
  const proposal = await read("references/talking-head-proposal-contract.md");
  const prompt = await read("references/talking-head-prompt-contract.md");
  const references = before.references.map((ref) => {
    if (ref.path.endsWith("talking-head-proposal-contract.md")) return { ...ref, content: proposal };
    if (ref.path.endsWith("talking-head-prompt-contract.md")) return { ...ref, content: prompt };
    return ref;
  });
  await skills.updateOne(
    { slug: "talking-head-director" },
    { $set: { profile, systemPrompt, references, updatedAt: new Date() } },
  );
  const after = await skills.findOne({ slug: "talking-head-director" });
  console.log(
    JSON.stringify({
      videoModel: after?.higgsfieldDefaults?.videoModel,
      visualHasBooks: /bookshelf/.test(after?.profile?.visual || ""),
      promptHasBed: /\bbed\b/i.test(after?.systemPrompt || ""),
      proposalHasBooks: /bookshelf/.test(references.map((ref) => ref.content).join("\n")),
    }),
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
