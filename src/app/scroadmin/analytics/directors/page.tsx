import { AnalyticsSectionNav } from "@/app/scroadmin/analytics/analytics-section-nav";
import { DirectorCatalogBrowser } from "@/app/scroadmin/analytics/directors/director-catalog-browser";
import { listHardcodedDirectorCatalog } from "@/service/director/admin-catalog";

export const dynamic = "force-dynamic";

// Admin inspector for hardcoded directors (`/scroadmin/analytics/directors`).
export default function ScroAdminDirectorsPage() {
  const catalog = listHardcodedDirectorCatalog();

  return (
    <main className="space-y-6">
      <div className="space-y-4">
        <AnalyticsSectionNav />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Hardcoded directors</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-[#12141c]">導演設定與提示詞</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
            程式裡寫死的導演，包含行為設定、profile、performance、system prompt、reference，以及 Phase A
            會額外接上的規則。分鏡規劃模型是 {catalog.storyboardModel}，thinking {catalog.storyboardThinking}。
          </p>
        </div>
      </div>
      <DirectorCatalogBrowser catalog={catalog} />
    </main>
  );
}
