import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { DIRECTORS } from "@/service/director/catalog";
import {
  DIRECTOR_RULE_MODULES,
  getDirectorRuleModule,
} from "@/service/director/rules";

const EXPLAINER_SLUGS = new Set([
  "cartoon-explainer-video-director",
  "paper-cutout-explainer-video-director",
]);

test("every director in DIRECTORS has its own standalone rule file in src/service/director/rules/<slug>.ts with zero cross-director rule imports", () => {
  for (const director of DIRECTORS) {
    const mod = DIRECTOR_RULE_MODULES[director.slug];
    assert.ok(mod, `Missing rule module for ${director.slug}`);
    assert.equal(mod.slug, director.slug);

    const filePath = path.join(
      process.cwd(),
      "src/service/director/rules",
      `${director.slug}.ts`,
    );
    assert.ok(existsSync(filePath), `Missing dedicated file ${filePath}`);

    const src = readFileSync(filePath, "utf8");
    assert.match(
      src,
      /ISOLATED DIRECTOR RULES: 1 Director = 1 File/,
      `${director.slug}.ts must carry the isolation header comment`,
    );
    // Must not import from any other director's rule file in src/service/director/rules/
    for (const other of DIRECTORS) {
      if (other.slug === director.slug) continue;
      assert.doesNotMatch(
        src,
        new RegExp(`director/rules/${other.slug}`),
        `${director.slug}.ts must not import from ${other.slug}.ts`,
      );
    }
  }
});

test("only cartoon-explainer and paper-cutout-explainer allow invented props and use whiteboard/cutout diagram rules; all other directors forbid invented props and contain zero whiteboard leakage", () => {
  for (const director of DIRECTORS) {
    const mod = getDirectorRuleModule(director.slug);
    const isExplainer = EXPLAINER_SLUGS.has(director.slug);

    assert.equal(
      mod.allowsInventedProps,
      isExplainer,
      `${director.slug} allowsInventedProps should be ${isExplainer}`,
    );

    const sceneDetail = mod.phaseASceneDetailBlock({ realistic: true, selfShot: false });
    const keyframeDelta = mod.phaseAKeyframeDeltaBlock({
      language: "en",
      hasCharacter: true,
      steadyStills: isExplainer,
    });
    const phaseABlock = mod.phaseADirectorBlock({
      aspectRatio: "9:16",
      hasCharacter: true,
      smoothMotion: true,
      realistic: true,
      sceneTextEnabled: true,
    });
    const phaseBMotion = mod.phaseBMotionRules({
      smoothMotion: true,
      realistic: true,
      clipNumber: 1,
    });

    if (isExplainer) {
      assert.match(sceneDetail, /slid in from the frame edge, written on, wiped off/);
      assert.match(phaseBMotion, /Whiteboard cardboard physics/);
    } else {
      assert.doesNotMatch(
        sceneDetail,
        /slid in from the frame edge, written on, wiped off/,
        `${director.slug} sceneDetail must not contain whiteboard slide/wipe rules`,
      );
      assert.doesNotMatch(
        keyframeDelta,
        /a cloud becomes a flower|one prop slides about 1\/4 of the frame/,
        `${director.slug} keyframeDelta must not contain cartoon morph/prop-slide rules`,
      );
      assert.doesNotMatch(
        phaseBMotion,
        /Whiteboard cardboard physics|presenter corner/,
        `${director.slug} phaseBMotion must not contain whiteboard cardboard physics`,
      );
      if (
        director.slug !== "talking-head-director" &&
        director.slug !== "full-body-talking-head-director" &&
        director.slug !== "opening-director" &&
        director.slug !== "ending-director"
      ) {
        assert.match(
          phaseABlock,
          /ZERO INVENTED PROPS/i,
          `${director.slug} phaseABlock must enforce ZERO INVENTED PROPS`,
        );
      }
    }
  }
});

test("AGENTS.md documents the 1 Director = 1 File isolation rule", () => {
  const agents = readFileSync(path.join(process.cwd(), "AGENTS.md"), "utf8");
  assert.match(agents, /1 Director = 1 File/i);
  assert.match(agents, /src\/service\/director\/rules\//);
});
