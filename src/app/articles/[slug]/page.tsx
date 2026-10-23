import type { Metadata } from "next";
import { buildPostDetailMetadata, PostDetailView } from "@/app/posts/post-detail-view";

export const dynamic = "force-dynamic";

type ArticleDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ArticleDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  return buildPostDetailMetadata(slug);
}

// Public /articles/[slug] detail page (canonical URL for bundled directory articles).
export default async function ArticleDetailPage({ params }: ArticleDetailPageProps) {
  const { slug } = await params;
  return PostDetailView({ slug, listingKind: "articles" });
}
