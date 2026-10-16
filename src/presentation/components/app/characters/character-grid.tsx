"use client";

import { useEffect, useMemo, useState } from "react";
import { MotionConfig, motion } from "framer-motion";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicCharacter, PublicStyle } from "@/presentation/serialize";
import { BulkDeleteCharactersDialog } from "@/presentation/components/app/characters/bulk-delete-characters-dialog";
import { CharacterBulkToolbar } from "@/presentation/components/app/characters/character-bulk-toolbar";
import { CharacterCard } from "@/presentation/components/app/characters/character-card";
import { CreateCharacterButton } from "@/presentation/components/app/characters/create-character-modal";

export function CharacterGrid({
  characters,
  credits,
  subscribed,
  styles,
  atCharacterLimit = false,
}: {
  characters: PublicCharacter[];
  credits: number;
  subscribed: boolean;
  // Passed through to the empty-state create button's style picker.
  styles: PublicStyle[];
  atCharacterLimit?: boolean;
}) {
  const { t } = useI18n();
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Drop optimistic deleted IDs once the server list refreshes.
  useEffect(() => {
    setDeletedIds(new Set());
  }, [characters]);

  const visible = useMemo(
    () => characters.filter((character) => !deletedIds.has(character.id)),
    [characters, deletedIds],
  );

  const selectedCharacters = useMemo(
    () => visible.filter((character) => selectedIds.has(character.id)),
    [visible, selectedIds],
  );

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectMode() {
    if (selectMode || selectedCharacters.length > 0) {
      setSelectMode(false);
      setSelectedIds(new Set());
      return;
    }
    setSelectMode(true);
  }

  if (visible.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-accent-ink/20 bg-paper/60 p-10 text-center">
        <p className="font-display text-lg font-bold">{t("characters.emptyTitle")}</p>
        <p className="mt-2 text-sm text-muted">{t("characters.emptyBody")}</p>
        <div className="mt-5">
          <CreateCharacterButton
            credits={credits}
            subscribed={subscribed}
            styles={styles}
            atCharacterLimit={atCharacterLimit}
            className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          />
        </div>
      </div>
    );
  }

  const activeSelect = selectMode || selectedCharacters.length > 0;

  return (
    <MotionConfig reducedMotion="user">
      <CharacterBulkToolbar
        totalCount={visible.length}
        selectedCount={selectedCharacters.length}
        selectMode={selectMode}
        onToggleSelectMode={toggleSelectMode}
        onSelectAll={() => {
          setSelectMode(true);
          setSelectedIds(new Set(visible.map((character) => character.id)));
        }}
        onDeselectAll={() => setSelectedIds(new Set())}
        onOpenDelete={() => setConfirmOpen(true)}
      />
      <motion.div layout className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {visible.map((character) => (
          <CharacterCard
            key={character.id}
            character={character}
            selected={selectedIds.has(character.id)}
            selectMode={activeSelect}
            onToggleSelect={toggleOne}
          />
        ))}
      </motion.div>
      {confirmOpen && selectedCharacters.length > 0 ? (
        <BulkDeleteCharactersDialog
          selected={selectedCharacters}
          onClose={() => setConfirmOpen(false)}
          onDeleted={(ids) => {
            setConfirmOpen(false);
            setDeletedIds((prev) => new Set([...prev, ...ids]));
            setSelectedIds(new Set());
            setSelectMode(false);
          }}
        />
      ) : null}
    </MotionConfig>
  );
}
