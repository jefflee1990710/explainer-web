import type { Metadata } from "next";
import { buildPostDetailMetadata, PostDetailView } from "@/app/posts/post-detail-view";

export const dynamic = "force-dynamic";

type PostDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PostDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  return buildPostDetailMetadata(slug);
}

// SEO-friendly blog post detail page resolved by `slug`.
export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const { slug } = await params;
  return PostDetailView({ slug, listingKind: "posts" });
}
