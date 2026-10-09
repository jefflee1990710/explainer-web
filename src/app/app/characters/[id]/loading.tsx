import { CharacterPageSkeleton } from "@/presentation/components/app/characters/[id]/character-page-skeleton";

// Instant route shell: the URL is already /app/characters/[id] while data loads.
export default function CharacterLoading() {
  return <CharacterPageSkeleton />;
}
