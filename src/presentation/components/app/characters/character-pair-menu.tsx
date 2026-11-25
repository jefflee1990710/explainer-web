"use client";

// Shared character row: face and standing figure in one frame, name on the right.
// Canvas dropdowns and every other character menu use this so the choice looks the same.

import { Check } from "lucide-react";
import type { PublicCharacter, PublicCharacterVersion } from "@/presentation/serialize";

export type CharacterPair = {
  portraitUrl?: string;
  fullBodyUrl?: string;
};

type VersionLike = Pick<PublicCharacterVersion, "id" | "status" | "portraitUrl" | "profileUrl" | "blueprintUrl">;

// Face and full-body stills from one version. A blueprint stands in when neither still exists.
export function characterPairFromVersion(version?: VersionLike | null): CharacterPair {
  const portraitUrl = version?.portraitUrl?.trim() || undefined;
  const fullBodyUrl = version?.profileUrl?.trim() || undefined;
  if (portraitUrl || fullBodyUrl) return { portraitUrl, fullBodyUrl };
  const blueprint = version?.blueprintUrl?.trim();
  return blueprint ? { portraitUrl: blueprint } : {};
}

export function characterPairFromPublic(
  character: Pick<PublicCharacter, "versions" | "defaultVersionId" | "previewUrl">,
): CharacterPair {
  const versions = character.versions ?? [];
  const completed = versions.filter((version) => !version.status || version.status === "completed");
  const preferred = completed.find((version) => version.id === character.defaultVersionId);
  const ordered = [...(preferred ? [preferred] : []), ...[...completed].reverse(), ...[...versions].reverse()];
  const both = ordered.find((version) => version.portraitUrl?.trim() && version.profileUrl?.trim());
  const any = both ?? ordered.find((version) => version.portraitUrl?.trim() || version.profileUrl?.trim() || version.blueprintUrl?.trim());
  const pair = characterPairFromVersion(any);
  if (pair.portraitUrl || pair.fullBodyUrl) return pair;
  const preview = character.previewUrl?.trim();
  return preview ? { portraitUrl: preview } : {};
}

export function CharacterPairFrame({
  portraitUrl,
  fullBodyUrl,
  large = false,
}: CharacterPair & { large?: boolean }) {
  const face = portraitUrl || fullBodyUrl;
  const body = portraitUrl && fullBodyUrl ? fullBodyUrl : undefined;
  if (!face) return null;
  const height = large ? "h-28" : "h-10";
  const faceWidth = large ? "w-28" : "w-10";
  const bodyWidth = large ? "w-16" : "w-[22px]";
  return (
    <span className={`flex ${height} shrink-0 overflow-hidden rounded-md border border-white/10 bg-[#e7e7e7]`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={face} alt="" loading="lazy" className={`${height} ${faceWidth} object-cover`} />
      {body ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={body} alt="" loading="lazy" className={`${height} ${bodyWidth} object-contain`} />
      ) : null}
    </span>
  );
}

export function CharacterMenu({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-h-80 overflow-y-auto rounded-[12px] border border-white/10 bg-[#12161f] p-1 text-white shadow-[0_18px_42px_rgba(0,0,0,0.35)]">
      {children}
    </div>
  );
}

export function CharacterMenuRow({
  label,
  portraitUrl,
  fullBodyUrl,
  selected = false,
  disabled = false,
  onClick,
}: CharacterPair & {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full cursor-pointer items-center gap-3 rounded-[8px] px-2 py-1.5 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
        selected ? "bg-[#c6f24b]/15" : "hover:bg-white/6"
      }`}
    >
      <CharacterPairFrame portraitUrl={portraitUrl} fullBodyUrl={fullBodyUrl} large />
      <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold">{label}</span>
      {selected ? <Check className="h-4 w-4 shrink-0 text-[#c6f24b]" /> : null}
    </button>
  );
}
