import { apiError, fromResult, readJson, withApiUser } from "@/service/api/respond";
import {
  addCharacterStyleAction,
  deleteCharacterAction,
  editCharacterVersionAction,
  getCharacterAction,
  refreshCharacterAction,
  renameCharacterAction,
  retryCharacterVersionAction,
  saveCharacterVoiceAction,
  setDefaultVersionAction,
  suggestCharacterVoiceAction,
} from "@/service/character/actions";
import type { CharacterVoice } from "@/model/character-voice";

type Params = { id: string };

type CharacterActionBody = {
  action?: string;
  versionId?: string;
  editInstruction?: string;
  styleId?: string;
  voice?: CharacterVoice | null;
  name?: string;
};

// One character. `?refresh=1` also advances any in-flight blueprint job (poll).
export const GET = withApiUser<Params>(async ({ request, params }) => {
  const refresh = new URL(request.url).searchParams.get("refresh") === "1";
  return fromResult(
    refresh ? await refreshCharacterAction(params.id) : await getCharacterAction(params.id),
  );
});

// Character actions. `action` picks one:
//   rename       – { name }
//   edit         – new version from { versionId, editInstruction }
//   addStyle     – restyle into { styleId }
//   retry        – requeue a failed { versionId }
//   setDefault   – make { versionId } the default sheet
//   saveVoice    – { voice } (object or null to clear)
//   suggestVoice – fill voice from the blueprint
export const POST = withApiUser<Params>(async ({ request, params }) => {
  const body = await readJson<CharacterActionBody>(request);
  const id = params.id;
  switch (body.action) {
    case "rename":
      return fromResult(await renameCharacterAction(id, String(body.name ?? "")));
    case "edit":
      return fromResult(
        await editCharacterVersionAction(id, String(body.versionId ?? ""), String(body.editInstruction ?? "")),
      );
    case "addStyle":
      return fromResult(await addCharacterStyleAction(id, String(body.styleId ?? "")));
    case "retry":
      return fromResult(await retryCharacterVersionAction(id, String(body.versionId ?? "")));
    case "setDefault":
      return fromResult(await setDefaultVersionAction(id, String(body.versionId ?? "")));
    case "saveVoice":
      return fromResult(await saveCharacterVoiceAction(id, body.voice ?? null));
    case "suggestVoice":
      return fromResult(await suggestCharacterVoiceAction(id));
    default:
      return apiError(`未知的 action: ${String(body.action ?? "")}`);
  }
});

export const DELETE = withApiUser<Params>(async ({ params }) => {
  return fromResult(await deleteCharacterAction(params.id));
});
