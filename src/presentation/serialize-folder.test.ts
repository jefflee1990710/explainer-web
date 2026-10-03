import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import type { Folder } from "@/model/folder";
import type { Project } from "@/model/project";
import { toPublicFolder } from "@/presentation/serialize";

function folder(): Folder {
  return {
    _id: new ObjectId(),
    userId: new ObjectId(),
    clerkUserId: "user_1",
    name: "Scro",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  };
}

function video(overrides: Partial<Project> & { title: string }): Project {
  const { title, ...rest } = overrides;
  return {
    _id: new ObjectId(),
    userId: new ObjectId(),
    clerkUserId: "user_1",
    projectId: new ObjectId(),
    skillId: new ObjectId(),
    skillSlug: "cartoon-explainer-video-director",
    source: title,
    aspectRatio: "9:16",
    durationPreset: "short",
    status: "production",
    phaseA: { localizedTitle: title, englishTitle: title } as Project["phaseA"],
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...rest,
    clips: rest.clips ?? [],
    creditsCharged: rest.creditsCharged ?? false,
  };
}

test("folder videos list the most recently updated first", () => {
  const older = video({
    title: "Old",
    createdAt: new Date("2026-10-03T00:00:00Z"),
    updatedAt: new Date("2026-10-03T00:00:00Z"),
  });
  const newer = video({
    title: "Fresh generation",
    createdAt: new Date("2026-10-01T00:00:00Z"),
    updatedAt: new Date("2026-10-03T12:00:00Z"),
  });
  const cards = toPublicFolder(folder(), [older, newer]).videos;
  assert.deepEqual(
    cards.map((card) => card.title),
    ["Fresh generation", "Old"],
  );
});
