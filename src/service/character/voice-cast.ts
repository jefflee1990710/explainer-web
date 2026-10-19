import { charactersCollection } from "@/dao";
import type { CastMember, Character } from "@/model/character";
import { isCharacterVoice } from "@/model/character-voice";

export function mergeCurrentCharacterVoices(
  cast: CastMember[] | undefined,
  docs: Array<Pick<Character, "_id" | "voice" | "voiceSample">>,
): CastMember[] | undefined {
  if (!cast?.length) return cast;
  const byId = new Map(docs.map((doc) => [doc._id.toHexString(), doc]));
  return cast.map((member) => {
    const doc = byId.get(member.characterId.toHexString());
    if (!doc) return member;
    const next = { ...member };
    if (isCharacterVoice(doc.voice)) next.voice = doc.voice;
    else delete next.voice;
    if (doc.voiceSample?.elevenVoiceId && doc.voiceSample?.url) {
      next.voiceSample = {
        url: doc.voiceSample.url,
        elevenVoiceId: doc.voiceSample.elevenVoiceId,
      };
    } else {
      delete next.voiceSample;
    }
    return next;
  });
}

// Generation reads the character's current voice and voiceSample, so a lock or
// cloned voice saved after the video was created still reaches the next clip.
export async function withCurrentCharacterVoices(
  cast: CastMember[] | undefined,
): Promise<CastMember[] | undefined> {
  if (!cast?.length) return cast;
  const characters = await charactersCollection();
  const docs = await characters
    .find({ _id: { $in: cast.map((member) => member.characterId) } })
    .toArray();
  return mergeCurrentCharacterVoices(cast, docs);
}
