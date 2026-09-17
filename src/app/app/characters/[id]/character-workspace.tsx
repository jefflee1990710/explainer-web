"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  editCharacterVersionAction,
  renameCharacterAction,
  retryCharacterVersionAction,
  setDefaultVersionAction,
  type CharacterResult,
} from "@/lib/actions/characters";
import type { PublicCharacter } from "@/lib/serialize";
import { useCharacterPoll } from "./use-character-poll";
import { VersionDetail } from "./version-detail";
import { VersionList } from "./version-list";

// Split character workspace: version list left, selected version right.
export function CharacterWorkspace({
  character: initial,
  credits,
  subscribed,
}: {
  character: PublicCharacter;
  credits: number;
  subscribed: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [character, setCharacter] = useState(initial);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [name, setName] = useState(initial.name);

  const onPoll = useCallback((next: PublicCharacter) => setCharacter(next), []);
  const onPollError = useCallback((message: string) => setError(message), []);
  useCharacterPoll(character, onPoll, onPollError);

  const versionParam = searchParams.get("version");
  const selected =
    character.versions.find((version) => version.id === versionParam) ||
    character.versions.find((version) => version.id === character.defaultVersionId) ||
    character.versions[0];

  function select(id: string) {
    router.replace(`${pathname}?version=${id}`);
  }

  async function run(key: string, action: () => Promise<CharacterResult>) {
    setPending(key);
    setError("");
    try {
      const result = await action();
      setPending("");
      if (!result.ok) {
        setError(result.error);
        if (result.error.includes("訂閱") || result.error.includes("credits 不足")) {
          router.push("/app/billing");
        }
        return;
      }
      setCharacter(result.character);
      router.refresh();
      return result.character;
    } catch {
      setError("操作失敗，請再試一次");
      setPending("");
      return undefined;
    }
  }

  async function onEdit(instruction: string) {
    const next = await run("edit", () =>
      editCharacterVersionAction(character.id, selected.id, instruction),
    );
    // Jump to the new version so the user watches it generate.
    if (next) select(next.versions[0].id);
  }

  function onRename() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === character.name) {
      setName(character.name);
      return;
    }
    void run("rename", () => renameCharacterAction(character.id, trimmed));
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/app/characters" className="text-sm font-semibold text-muted transition hover:text-foreground">
            ← 回到角色
          </Link>
          <input
            type="text"
            value={name}
            maxLength={40}
            aria-label="角色名稱"
            onChange={(event) => setName(event.target.value)}
            onBlur={onRename}
            onKeyDown={(event) => {
              if (event.key === "Enter") (event.target as HTMLInputElement).blur();
            }}
            className="font-display mt-2 block w-full max-w-md rounded-lg border border-transparent bg-transparent text-3xl font-bold hover:border-accent-ink/15 focus-visible:border-accent-ink/30 focus-visible:outline-none"
          />
        </div>
        <p className="text-sm text-muted">
          {character.styleName} · {character.versions.length} 個版本
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[17.5rem_minmax(0,1fr)] md:items-start">
        <VersionList character={character} selectedId={selected.id} onSelect={select} />
        <VersionDetail
          character={character}
          version={selected}
          credits={credits}
          subscribed={subscribed}
          pending={pending}
          error={error}
          onSetDefault={() =>
            void run("default", () => setDefaultVersionAction(character.id, selected.id))
          }
          onEdit={(instruction) => void onEdit(instruction)}
          onRetry={() =>
            void run("retry", () => retryCharacterVersionAction(character.id, selected.id))
          }
        />
      </div>
    </div>
  );
}
