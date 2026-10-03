"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { renameFolderAction } from "@/presentation/actions/projects";
import { useI18n } from "@/presentation/components/i18n-provider";
import { committedFolderName } from "@/service/folder";
import { translateAppError } from "@/util/i18n/translate-app-error";

const NAME_MAX = 80;

// Inline project title — same blur-to-save pattern as the character name.
export function FolderNameField({
  folderId,
  name: initial,
}: {
  folderId: string;
  name: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setName(initial);
    setSaved(initial);
  }, [initial]);

  async function onRename() {
    const next = committedFolderName(saved, name);
    if (!next) {
      setName(saved);
      return;
    }
    setPending(true);
    setError("");
    const result = await renameFolderAction(folderId, next);
    setPending(false);
    if (!result.ok) {
      setError(translateAppError(result.error, t));
      setName(saved);
      return;
    }
    setSaved(next);
    setName(next);
    router.refresh();
  }

  return (
    <div>
      <input
        type="text"
        value={name}
        maxLength={NAME_MAX}
        disabled={pending}
        aria-label={t("folder.nameLabel")}
        onChange={(event) => setName(event.target.value)}
        onBlur={() => {
          void onRename();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") (event.target as HTMLInputElement).blur();
        }}
        className="font-display mt-2 block w-full max-w-md rounded-lg border border-transparent bg-transparent text-3xl font-bold hover:border-accent-ink/15 focus-visible:border-accent-ink/30 focus-visible:outline-none disabled:opacity-60"
      />
      {error ? (
        <p className="mt-1 text-sm text-accent" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
