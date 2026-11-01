import { UseCaseVideoListPage } from "@/presentation/components/app/use-case-video-list-page";

export default async function ExplainersPage({
  searchParams,
}: {
  searchParams?: Promise<{ stay?: string; project?: string }>;
}) {
  return <UseCaseVideoListPage useCase="explainer" searchParams={searchParams} />;
}
