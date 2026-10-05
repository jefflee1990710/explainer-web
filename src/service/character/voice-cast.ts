import { charactersCollection } from "@/dao";
import type { CastMember } from "@/model/character";
import { isCharacterVoice } from "@/model/character-voice";

// Generation reads the character's current voice, so a lock saved after the
// video was created still reaches the next clip prompt.
export async function withCurrentCharacterVoices(
  cast: CastMember[] | undefined,
): Promise<CastMember[] | undefined> {
  if (!cast?.length) return cast;
  const characters = await charactersCollection();
  const docs = await characters
    .find({ _id: { $in: cast.map((member) => member.characterId) } })
    .toArray();
  const byId = new Map(docs.map((doc) => [doc._id.toHexString(), doc]));
  return cast.map((member) => {
    const doc = byId.get(member.characterId.toHexString());
    if (!doc) return member;
    const next = { ...member };
    if (isCharacterVoice(doc.voice)) next.voice = doc.voice;
    else delete next.voice;
    return next;
  });
}
