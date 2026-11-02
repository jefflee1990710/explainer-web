import { UseCaseVideoListPage } from "@/presentation/components/app/use-case-video-list-page";

// Gemini 4 Argon can think for several minutes before the storyboard returns.
export const maxDuration = 800;

export default async function TalkingHeadsPage({
  searchParams,
}: {
  searchParams?: Promise<{ stay?: string; project?: string; projectId?: string }>;
}) {
  return <UseCaseVideoListPage useCase="talking-head" searchParams={searchParams} />;
}
