import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ObjectId } from "mongodb";
import type { CharacterVersion } from "@/model/character";
import { characterLibraryImages } from "@/service/canvas/use-cases/projects";

function version(patch: Partial<CharacterVersion> & Pick<CharacterVersion, "id">): CharacterVersion {
  return {
    prompt: "",
    status: "completed",
    creditsCharged: true,
    createdAt: new Date(),
    ...patch,
  };
}

describe("characterLibraryImages", () => {
  it("keeps the face and the standing figure from the same version", () => {
    const older = new ObjectId();
    const chosen = new ObjectId();
    const images = characterLibraryImages({
      defaultVersionId: chosen,
      versions: [
        version({
          id: older,
          portraitUrl: "https://blob/old-face.png",
          profileUrl: "https://blob/old-body.png",
        }),
        version({
          id: chosen,
          portraitUrl: "https://blob/face.png",
          profileUrl: "https://blob/body.png",
          blueprintUrl: "https://blob/board.png",
        }),
      ],
    });
    assert.deepEqual(images, {
      previewUrl: "https://blob/body.png",
      portraitUrl: "https://blob/face.png",
      fullBodyUrl: "https://blob/body.png",
    });
  });

  it("skips a face-only default when a later completed version has both stills", () => {
    const faceOnly = new ObjectId();
    const both = new ObjectId();
    const images = characterLibraryImages({
      defaultVersionId: faceOnly,
      versions: [
        version({ id: faceOnly, portraitUrl: "https://blob/face-only.png" }),
        version({
          id: both,
          portraitUrl: "https://blob/face.png",
          profileUrl: "https://blob/body.png",
        }),
      ],
    });
    assert.equal(images?.portraitUrl, "https://blob/face.png");
    assert.equal(images?.fullBodyUrl, "https://blob/body.png");
  });
});
