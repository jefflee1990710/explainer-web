import assert from "node:assert/strict";
import { test } from "node:test";
import {
  defaultSkillSlugForUseCase,
  filterSkillsForUseCase,
  newVideoPathForUseCase,
  parseUseCaseParam,
  videoMatchesUseCase,
} from "@/service/video/use-case";

test("use-case helpers filter fixed system slugs and build create URLs", () => {
  assert.equal(parseUseCaseParam("explainer"), "explainer");
  assert.equal(parseUseCaseParam("nope"), undefined);

  assert.equal(videoMatchesUseCase("paper-cutout-explainer-video-director", "explainer"), true);
  assert.equal(videoMatchesUseCase("papercraft-diorama-director", "explainer"), true);
  assert.equal(videoMatchesUseCase("talking-head-director", "explainer"), false);
  assert.equal(videoMatchesUseCase("talking-head-director", "talking-head"), true);

  const skills = [
    { slug: "paper-cutout-explainer-video-director", isCustom: false },
    { slug: "papercraft-diorama-director", isCustom: false },
    { slug: "cartoon-explainer-video-director", isCustom: false },
    { slug: "talking-head-director", isCustom: false },
    { slug: "my-custom", isCustom: true },
  ];
  assert.deepEqual(
    filterSkillsForUseCase(skills, "explainer").map((s) => s.slug),
    [
      "paper-cutout-explainer-video-director",
      "papercraft-diorama-director",
      "cartoon-explainer-video-director",
    ],
  );
  assert.deepEqual(
    filterSkillsForUseCase(skills, "talking-head").map((s) => s.slug),
    ["talking-head-director"],
  );

  assert.equal(
    defaultSkillSlugForUseCase("talking-head", filterSkillsForUseCase(skills, "talking-head")),
    "talking-head-director",
  );
  assert.equal(
    newVideoPathForUseCase("explainer", { projectId: "abc" }),
    "/app/videos/new?useCase=explainer&projectId=abc",
  );
});
