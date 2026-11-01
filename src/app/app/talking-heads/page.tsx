import { UseCaseVideoListPage } from "@/presentation/components/app/use-case-video-list-page";

export default async function TalkingHeadsPage({
  searchParams,
}: {
  searchParams?: Promise<{ stay?: string; project?: string }>;
}) {
  return <UseCaseVideoListPage useCase="talking-head" searchParams={searchParams} />;
}
