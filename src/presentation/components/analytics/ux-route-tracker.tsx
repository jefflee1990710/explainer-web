"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { track } from "@/presentation/components/analytics/track";

// Map pathname into a human-readable funnel stage so drop-off reports are immediately clear.
function resolveUxStageFromPath(pathname: string): string {
  if (pathname === "/") return "landing_home";
  if (pathname.startsWith("/ai-influencer")) return "marketing_ai_influencer";
  if (pathname.startsWith("/product-promo")) return "marketing_product_promo";
  if (pathname.startsWith("/talking-head")) return "marketing_talking_head";
  if (pathname.startsWith("/cantonese")) return "marketing_cantonese";
  if (pathname.startsWith("/explainer")) return "marketing_explainer";
  if (pathname.startsWith("/right-tool")) return "marketing_right_tool";
  if (pathname.startsWith("/pricing")) return "marketing_pricing";
  if (pathname.startsWith("/academy")) return "marketing_academy";
  if (pathname.startsWith("/examples")) return "marketing_examples";
  if (pathname === "/posts") return "marketing_posts";
  if (pathname.startsWith("/posts/")) return "marketing_post_detail";
  if (pathname.startsWith("/contact")) return "marketing_contact";
  if (pathname.startsWith("/terms") || pathname.startsWith("/privacy")) return "marketing_legal";
  if (pathname.startsWith("/sign-in")) return "auth_sign_in";
  if (pathname.startsWith("/sign-up")) return "auth_sign_up";
  if (pathname.startsWith("/legal/accept")) return "onboarding_legal";
  if (pathname === "/app") return "studio_home";
  if (pathname === "/app/characters/generate") return "character_wizard";
  if (pathname.startsWith("/app/characters/")) return "character_detail";
  if (pathname === "/app/characters") return "character_list";
  if (pathname.startsWith("/app/wardrobe")) return "wardrobe_studio";
  if (pathname.startsWith("/app/life")) return "life_studio";
  if (pathname.startsWith("/app/room")) return "character_room";
  if (pathname.endsWith("/videos/new")) return "video_wizard_new";
  if (pathname.includes("/videos/")) return "video_production_workspace";
  if (pathname === "/app/projects/new") return "folder_new";
  if (pathname.startsWith("/app/projects/")) return "folder_workspace";
  if (pathname.startsWith("/app/billing")) return "studio_billing";
  if (pathname.startsWith("/app/tasks")) return "studio_tasks";
  if (pathname.startsWith("/scroadmin")) return "scro_admin";
  return "other_page";
}

// Tracks SPA route changes and sends `page_view` to both GA4 and MongoDB `ux_events`.
export function UxRouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedRef = useRef<string>("");

  useEffect(() => {
    if (!pathname) return;
    // Skip noisy admin self-tracking loops while still allowing normal pages.
    if (pathname.startsWith("/scroadmin")) return;

    const search = searchParams?.toString() ?? "";
    const fullPath = search ? `${pathname}?${search}` : pathname;
    if (lastTrackedRef.current === fullPath) return;
    lastTrackedRef.current = fullPath;

    const stage = resolveUxStageFromPath(pathname);
    track("page_view", {
      page_path: fullPath,
      page_location: typeof window !== "undefined" ? window.location.href : fullPath,
      page_title: typeof document !== "undefined" ? document.title : "",
      ux_stage: stage,
    });
  }, [pathname, searchParams]);

  return null;
}
