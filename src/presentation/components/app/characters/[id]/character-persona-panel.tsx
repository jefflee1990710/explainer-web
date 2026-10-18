"use client";

import Link from "next/link";
import { useState } from "react";
import { saveCharacterPersonaAction } from "@/presentation/actions/characters";
import { CharacterPersonaFields } from "@/presentation/components/app/characters/character-persona-fields";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { PublicCharacter } from "@/presentation/serialize";
import { draftFromPersona, emptyPersonaDraft, personaFromFields, type PersonaDraft } from "@/service/character/persona";
import { translateAppError } from "@/util/i18n/translate-app-error";

// Persona lives on the character, separate from the blueprint and the voice lock.
export function CharacterPersonaPanel({
  character,
  onSaved,
}: {
  character: PublicCharacter;
  onSaved: (character: PublicCharacter) => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<PersonaDraft>(
    character.persona ? draftFromPersona(character.persona) : emptyPersonaDraft(),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function onSave() {
    setPending(true);
    setError("");
    setSaved(false);
    try {
      const result = await saveCharacterPersonaAction(character.id, personaFromFields(draft));
      setPending(false);
      if (!result.ok) {
        setError(translateAppError(result.error, t));
        return;
      }
      onSaved(result.character);
      setSaved(true);
    } catch {
      setError(t("errors.personaSaveFailed"));
      setPending(false);
    }
  }

  return (
    <section className="max-w-2xl rounded-2xl border border-accent-ink/10 bg-paper/90 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold">{t("persona.title")}</h2>
        <Link
          href={`/app/life?character=${character.id}`}
          className="text-xs font-bold text-accent-ink underline-offset-2 hover:underline"
        >
          {t("persona.lifeLink")}
        </Link>
      </div>
      <CharacterPersonaFields draft={draft} onChange={setDraft} disabled={pending} />
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => void onSave()}
          className="inline-flex h-9 cursor-pointer items-center rounded-full bg-accent px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? <Spinner className="mr-2 h-3.5 w-3.5" /> : null}
          {t("persona.save")}
        </button>
        {saved ? <span className="text-xs font-semibold text-muted">{t("persona.saved")}</span> : null}
        {error ? <span className="text-xs font-semibold text-red-600">{error}</span> : null}
      </div>
    </section>
  );
}
