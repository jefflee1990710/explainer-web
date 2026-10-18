import assert from "node:assert/strict";
import test from "node:test";
import { dialogueVoiceLock } from "@/service/director/character-voice";
import { lifeSceneQuery, lifeShotPrompt, parseCommonsImageSearch } from "@/service/character/life-prompt";
import { personaDeliveryLine, personaFromFields, randomCharacterPersona } from "@/service/character/persona";

test("a random persona is a coherent pack", () => {
  const persona = randomCharacterPersona(() => 0);
  assert.equal(persona.city, "Hong Kong");
  assert.ok(persona.interests.includes("milk tea"));
  assert.match(personaDeliveryLine(persona), /quick/);
  assert.match(personaDeliveryLine(persona), /Hong Kong/);
});

test("blank persona fields stay unset", () => {
  assert.equal(
    personaFromFields({
      city: "  ",
      warmth: "warm",
      pace: "even",
      humor: "playful",
      summary: "",
      interests: " , ",
    }),
    null,
  );
});

test("persona changes wording and leaves the timbre lock in place", () => {
  const persona = randomCharacterPersona(() => 0);
  const voice = {
    gender: "female" as const,
    age: "adult" as const,
    pitch: "mid" as const,
    resonance: "mixed" as const,
    texture: "warm" as const,
    weight: "medium" as const,
  };
  const plain = dialogueVoiceLock([{ name: "May", voice }]);
  const withPersona = dialogueVoiceLock([{ name: "May", voice, persona }]);
  assert.match(plain || "", /May: adult female, mid, mixed, warm, medium/);
  assert.doesNotMatch(plain || "", /Tone and wording only/);
  assert.match(withPersona || "", /May: adult female, mid, mixed, warm, medium/);
  assert.match(withPersona || "", /Tone and wording only/);
  assert.match(withPersona || "", /Keep the timbre lock unchanged/);
  assert.match(withPersona || "", /lives in Hong Kong/);
});

test("a life photo keeps the character face and only borrows the place", () => {
  const prompt = lifeShotPrompt({
    name: "May",
    kind: "food",
    place: "Hong Kong",
    interests: ["milk tea"],
  });
  assert.match(prompt, /first reference image is their identity/);
  assert.match(prompt, /second reference image is only the place/);
  assert.match(prompt, /Do not keep the other face/);
  assert.equal(lifeSceneQuery({ place: "Hong Kong", kind: "food" }), "Hong Kong local food dish");
  assert.equal(lifeSceneQuery({ place: "Taipei", kind: "hobby", interest: "bookstores" }), "Taipei bookstores");
});

test("commons search keeps place photos and drops portraits", () => {
  const hits = parseCommonsImageSearch({
    query: {
      pages: {
        "1": {
          title: "File:Harbour.jpg",
          imageinfo: [{ thumburl: "https://upload.wikimedia.org/harbour.jpg", mime: "image/jpeg" }],
        },
        "2": {
          title: "File:Portrait of a person.jpg",
          imageinfo: [{ thumburl: "https://upload.wikimedia.org/face.jpg", mime: "image/jpeg" }],
        },
        "3": {
          title: "File:Map.svg",
          imageinfo: [{ thumburl: "https://upload.wikimedia.org/map.png", mime: "image/svg+xml" }],
        },
      },
    },
  });
  assert.deepEqual(hits.map((hit) => hit.title), ["Harbour.jpg"]);
});
