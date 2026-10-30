import { usersCollection, uxEventsCollection } from "@/dao";

export type WebsiteFunnelStep = {
  stepId: string;
  label: string;
  description: string;
  visitorCount: number;
  conversionFromTopPercent: number;
  conversionFromPrevPercent: number;
  dropOffCount: number;
  dropOffPercent: number;
};

export type LandingPagePerformanceItem = {
  path: string;
  label: string;
  totalViews: number;
  uniqueVisitors: number;
  entrySessions: number;
  bounceSessions: number;
  bounceRatePercent: number;
  reachedAuthVisitors: number;
  convertedVisitors: number;
  conversionRatePercent: number;
};

export type ReferrerChannelItem = {
  channel: string;
  host: string;
  sessions: number;
  visitors: number;
  convertedVisitors: number;
  conversionRatePercent: number;
};

export type StepDropOffReasonItem = {
  reasonId: string;
  label: string;
  description: string;
  visitorCount: number;
  sharePercent: number;
  samplePaths: string[];
};

export type AuthConversionBreakdown = {
  signInPageVisitors: number;
  signUpPageVisitors: number;
  loginSuccessUsers: number;
  signUpSuccessUsers: number;
  googleAuthCount: number;
  emailAuthCount: number;
  googleCancelledCount: number;
  formEngagedCount: number;
  authFailureCount: number;
  recentFailures: Array<{
    code: string;
    mode: string;
    method: string;
    createdAtIso: string;
  }>;
};

export type VisitorJourneyRow = {
  visitorKey: string;
  anonId: string | null;
  clerkUserId: string | null;
  userEmail: string | null;
  entryPath: string;
  lastPath: string;
  referrerHost: string;
  locale: string;
  deviceLabel: string;
  pageViewCount: number;
  reachedAuthPage: boolean;
  authOutcome: "signed_up" | "logged_in" | "authenticated_session" | "auth_abandoned" | "browsing";
  dropOffReason: string | null;
  reachedStudio: boolean;
  pathTrail: string[];
  firstSeenIso: string;
  lastSeenIso: string;
};

export type WebsiteAnalyticsEventInput = {
  event: string;
  category?: string | null;
  anonId?: string | null;
  sessionId?: string | null;
  clerkUserId?: string | null;
  userEmail?: string | null;
  path?: string | null;
  referrer?: string | null;
  locale?: string | null;
  userAgent?: string | null;
  params?: Record<string, unknown>;
  createdAt: Date;
};

export type WebsiteAnalyticsReport = {
  generatedAtIso: string;
  kpis: {
    totalPublicPageViews: number;
    uniqueWebsiteVisitors: number;
    totalSessions: number;
    visitorsReachedAuth: number;
    authIntentRatePercent: number;
    convertedToAccountVisitors: number;
    visitorToAuthRatePercent: number;
    visitorsEnteredStudio: number;
    studioEntryRatePercent: number;
    newSignUps7d: number;
    newSignUps30d: number;
  };
  funnel: WebsiteFunnelStep[];
  step2DropOffReasons: StepDropOffReasonItem[];
  step3DropOffReasons: StepDropOffReasonItem[];
  landingPages: LandingPagePerformanceItem[];
  referrers: ReferrerChannelItem[];
  locales: Array<{ locale: string; visitors: number; sharePercent: number }>;
  authBreakdown: AuthConversionBreakdown;
  recentVisitors: VisitorJourneyRow[];
};

const LANDING_PAGE_LABELS: Record<string, string> = {
  "/": "首頁 (Landing Home)",
  "/ai-influencer": "AI 網紅工作台 (/ai-influencer)",
  "/product-promo": "產品宣傳 UGC (/product-promo)",
  "/talking-head": "口播短片 (/talking-head)",
  "/cantonese": "香港廣東話 (/cantonese)",
  "/explainer": "白板解說片 (/explainer)",
  "/right-tool": "工具比較 (/right-tool)",
  "/pricing": "方案價格 (/pricing)",
  "/examples": "成果範例 (/examples)",
  "/posts": "文章列表 (/posts)",
  "/posts/[slug]": "部落格文章頁 (/posts/*)",
  "/contact": "聯絡我們 (/contact)",
  "/terms": "服務條款 (/terms)",
  "/privacy": "私隱政策 (/privacy)",
};

// Normalize URL path to group dynamic blog slugs or query strings cleanly.
export function normalizeWebsitePath(rawPath?: string | null): string {
  if (!rawPath) return "/";
  const clean = (rawPath.split("?")[0] || "/").trim();
  if (!clean.startsWith("/")) return "/";
  if (clean.length > 1 && clean.endsWith("/")) {
    return clean.slice(0, -1);
  }
  return clean;
}

// Group individual blog article URLs under `/posts/[slug]` for aggregate landing page tables, while keeping top paths distinct.
export function bucketLandingPath(cleanPath: string): string {
  if (cleanPath.startsWith("/posts/") && cleanPath !== "/posts") {
    return "/posts/[slug]";
  }
  return cleanPath;
}

export function isPublicMarketingPath(cleanPath: string): boolean {
  if (
    cleanPath.startsWith("/app") ||
    cleanPath.startsWith("/scroadmin") ||
    cleanPath.startsWith("/api") ||
    cleanPath.startsWith("/sign-in") ||
    cleanPath.startsWith("/sign-up") ||
    cleanPath.startsWith("/legal") ||
    cleanPath.startsWith("/checkout")
  ) {
    return false;
  }
  return true;
}

export function isAuthPath(cleanPath: string): boolean {
  return cleanPath.startsWith("/sign-in") || cleanPath.startsWith("/sign-up");
}

export function isStudioPath(cleanPath: string): boolean {
  return cleanPath === "/app" || cleanPath.startsWith("/app/") || cleanPath.startsWith("/legal/accept");
}

export function isBotUserAgent(userAgent?: string | null): boolean {
  if (!userAgent) return false;
  return /adsbot|googlebot|bingbot|ahrefsbot|semrushbot|headlesschrome|bytespider|petalbot|meta-externalagent|facebookexternalhit|crawler|spider/i.test(
    userAgent,
  );
}

export function classifyVisitorDevice(userAgent?: string | null): string {
  if (!userAgent) return "Unknown";
  if (isBotUserAgent(userAgent)) return "Bot / Crawler";
  if (/instagram|fban|fbav|threads|micromessenger|line\/|bytedancewebview|tiktok/i.test(userAgent)) {
    return "In-App WebView";
  }
  if (/iphone|ipad|ipod/i.test(userAgent)) return "iOS";
  if (/android/i.test(userAgent)) return "Android";
  if (/macintosh|mac os x/i.test(userAgent)) return "Mac";
  if (/windows/i.test(userAgent)) return "Windows";
  if (/linux/i.test(userAgent)) return "Linux";
  return "Desktop";
}

// Extract `?next=` target from a raw `/sign-in?next=...` or `/sign-up?next=...` path.
export function extractAuthNextParam(rawPath?: string | null): string | null {
  if (!rawPath || !rawPath.includes("?")) return null;
  const query = rawPath.slice(rawPath.indexOf("?") + 1);
  try {
    const params = new URLSearchParams(query);
    const next = params.get("next");
    return next ? decodeURIComponent(next) : null;
  } catch {
    return null;
  }
}

// Classify an external referrer URL into a readable acquisition channel and hostname.
export function classifyReferrer(referrer?: string | null): {
  channel: string;
  host: string;
} {
  if (!referrer || !referrer.trim()) {
    return { channel: "直接流量 (Direct)", host: "(direct)" };
  }
  try {
    const url = new URL(referrer);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (!host || host === "scro.io" || host.endsWith(".scro.io") || host === "localhost") {
      return { channel: "站內導覽 / 直接進站 (Direct)", host: "(direct)" };
    }
    if (
      host.includes("google.") ||
      host.includes("bing.") ||
      host.includes("duckduckgo.") ||
      host.includes("yahoo.") ||
      host.includes("baidu.")
    ) {
      return { channel: "自然搜尋 (Organic Search)", host };
    }
    if (
      host.includes("chatgpt.") ||
      host.includes("openai.") ||
      host.includes("perplexity.") ||
      host.includes("claude.") ||
      host.includes("gemini.google")
    ) {
      return { channel: "AI 搜尋推薦 (AI / LLM Referral)", host };
    }
    if (
      host.includes("instagram.") ||
      host.includes("facebook.") ||
      host.includes("threads.") ||
      host.includes("t.co") ||
      host.includes("x.com") ||
      host.includes("twitter.") ||
      host.includes("youtube.") ||
      host.includes("linkedin.") ||
      host.includes("tiktok.")
    ) {
      return { channel: "社群媒體 (Social)", host };
    }
    return { channel: "外部推薦連結 (Referral)", host };
  } catch {
    return { channel: "直接流量 (Direct)", host: "(direct)" };
  }
}

function roundPercent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

// Pure analyzer that computes website entry -> sign-up/login -> studio funnel metrics from `ux_events`.
export function buildWebsiteAnalyticsFromEvents(
  events: readonly WebsiteAnalyticsEventInput[],
  options?: {
    userEmailsById?: ReadonlyMap<string, string>;
    newSignUps7d?: number;
    newSignUps30d?: number;
  },
): WebsiteAnalyticsReport {
  const userEmails = options?.userEmailsById ?? new Map<string, string>();

  // Sort oldest-to-newest so visitor journeys, entry pages, and conversion paths are chronological.
  const chronological = [...events].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  // Link `anonId` to `clerkUserId` whenever an anonymous visitor signs up or logs in during the same browser storage lifecycle.
  const anonToUser = new Map<string, string>();
  for (const ev of chronological) {
    if (ev.anonId && ev.clerkUserId) {
      anonToUser.set(ev.anonId, ev.clerkUserId);
    }
  }

  type VisitorAccumulator = {
    visitorKey: string;
    anonId: string | null;
    clerkUserId: string | null;
    userEmail: string | null;
    userAgent: string | null;
    entryPath: string | null;
    lastPath: string | null;
    referrerHost: string;
    referrerChannel: string;
    locale: string;
    pageViewCount: number;
    publicViewCount: number;
    visitedMarketing: boolean;
    reachedAuthPage: boolean;
    sawSignInPage: boolean;
    sawSignUpPage: boolean;
    authNextTargets: string[];
    engagedAuthForm: boolean;
    cancelledGooglePopup: boolean;
    hadAuthError: boolean;
    lastAuthErrorCode: string | null;
    didSignUpEvent: boolean;
    didLoginEvent: boolean;
    hasAuthenticatedEvent: boolean;
    sawLegalDialog: boolean;
    acceptedLegalDialog: boolean;
    didStudioAction: boolean;
    reachedStudio: boolean;
    pathTrail: string[];
    firstSeen: Date;
    lastSeen: Date;
  };

  const visitors = new Map<string, VisitorAccumulator>();

  // Session-level tracking for entry page & bounce rate.
  type SessionAccumulator = {
    sessionKey: string;
    visitorKey: string;
    entryBucketPath: string | null;
    publicPageViews: number;
    totalEvents: number;
    reachedAuthOrStudio: boolean;
    referrerChannel: string;
    referrerHost: string;
  };
  const sessions = new Map<string, SessionAccumulator>();

  // Per-landing-page stats
  const landingStats = new Map<
    string,
    {
      totalViews: number;
      visitors: Set<string>;
      entrySessions: number;
      bounceSessions: number;
    }
  >();

  let totalPublicPageViews = 0;
  let googleAuthCount = 0;
  let emailAuthCount = 0;
  let googleCancelledCount = 0;
  let formEngagedCount = 0;
  let authFailureCount = 0;
  const recentFailures: AuthConversionBreakdown["recentFailures"] = [];

  for (const ev of chronological) {
    if (ev.path && ev.path.startsWith("/scroadmin")) continue;

    const resolvedUserId =
      ev.clerkUserId || (ev.anonId ? anonToUser.get(ev.anonId) ?? null : null);
    const visitorKey =
      ev.anonId ||
      resolvedUserId ||
      ev.sessionId ||
      `anon_${ev.createdAt.getTime()}`;

    const cleanPath = ev.path ? normalizeWebsitePath(ev.path) : null;
    const isPublic = cleanPath ? isPublicMarketingPath(cleanPath) : false;
    const isAuth = cleanPath ? isAuthPath(cleanPath) : false;
    const isStudio = cleanPath ? isStudioPath(cleanPath) : false;

    let visitor = visitors.get(visitorKey);
    if (!visitor) {
      const refInfo = classifyReferrer(ev.referrer);
      visitor = {
        visitorKey,
        anonId: ev.anonId ?? null,
        clerkUserId: resolvedUserId,
        userEmail:
          ev.userEmail ||
          (resolvedUserId ? userEmails.get(resolvedUserId) ?? null : null),
        userAgent: ev.userAgent ?? null,
        entryPath: cleanPath,
        lastPath: cleanPath,
        referrerHost: refInfo.host,
        referrerChannel: refInfo.channel,
        locale: ev.locale?.trim() || "en",
        pageViewCount: 0,
        publicViewCount: 0,
        visitedMarketing: false,
        reachedAuthPage: false,
        sawSignInPage: false,
        sawSignUpPage: false,
        authNextTargets: [],
        engagedAuthForm: false,
        cancelledGooglePopup: false,
        hadAuthError: false,
        lastAuthErrorCode: null,
        didSignUpEvent: false,
        didLoginEvent: false,
        hasAuthenticatedEvent: Boolean(resolvedUserId),
        sawLegalDialog: false,
        acceptedLegalDialog: false,
        didStudioAction: false,
        reachedStudio: false,
        pathTrail: [],
        firstSeen: ev.createdAt,
        lastSeen: ev.createdAt,
      };
      visitors.set(visitorKey, visitor);
    }

    if (ev.createdAt > visitor.lastSeen) visitor.lastSeen = ev.createdAt;
    if (!visitor.anonId && ev.anonId) visitor.anonId = ev.anonId;
    if (!visitor.userAgent && ev.userAgent) visitor.userAgent = ev.userAgent;
    if (!visitor.clerkUserId && resolvedUserId) {
      visitor.clerkUserId = resolvedUserId;
    }
    if (!visitor.userEmail) {
      visitor.userEmail =
        ev.userEmail ||
        (visitor.clerkUserId ? userEmails.get(visitor.clerkUserId) ?? null : null);
    }
    if (ev.locale && (!visitor.locale || visitor.locale === "en")) {
      visitor.locale = ev.locale.trim();
    }
    if (visitor.referrerHost === "(direct)" && ev.referrer) {
      const refInfo = classifyReferrer(ev.referrer);
      if (refInfo.host !== "(direct)") {
        visitor.referrerHost = refInfo.host;
        visitor.referrerChannel = refInfo.channel;
      }
    }

    if (cleanPath) {
      if (!visitor.entryPath) visitor.entryPath = cleanPath;
      visitor.lastPath = cleanPath;
      if (
        visitor.pathTrail.length < 8 &&
        visitor.pathTrail[visitor.pathTrail.length - 1] !== cleanPath
      ) {
        visitor.pathTrail.push(cleanPath);
      }
    }

    if (ev.clerkUserId) {
      visitor.hasAuthenticatedEvent = true;
    }

    if (ev.event === "sign_up") {
      visitor.didSignUpEvent = true;
      visitor.hasAuthenticatedEvent = true;
      visitor.reachedAuthPage = true;
      const method = typeof ev.params?.method === "string" ? ev.params.method : "";
      if (method === "google") googleAuthCount += 1;
      else if (method === "email") emailAuthCount += 1;
    } else if (ev.event === "login") {
      visitor.didLoginEvent = true;
      visitor.hasAuthenticatedEvent = true;
      visitor.reachedAuthPage = true;
      const method = typeof ev.params?.method === "string" ? ev.params.method : "";
      if (method === "google") googleAuthCount += 1;
      else if (method === "email") emailAuthCount += 1;
    } else if (ev.event === "auth_cta_click") {
      visitor.reachedAuthPage = true;
      const target = typeof ev.params?.target === "string" ? ev.params.target : "";
      if (target.startsWith("/sign-in")) visitor.sawSignInPage = true;
      if (target.startsWith("/sign-up")) visitor.sawSignUpPage = true;
    } else if (
      ev.event === "auth_form_engaged" ||
      ev.event === "auth_submit_attempt" ||
      ev.event === "auth_mode_switch"
    ) {
      if (!visitor.engagedAuthForm) {
        visitor.engagedAuthForm = true;
        formEngagedCount += 1;
      }
      visitor.reachedAuthPage = true;
    } else if (ev.event === "auth_google_cancelled") {
      visitor.cancelledGooglePopup = true;
      visitor.engagedAuthForm = true;
      visitor.reachedAuthPage = true;
      googleCancelledCount += 1;
    } else if (ev.event === "auth_failed" || ev.event === "auth_session_failed") {
      authFailureCount += 1;
      visitor.reachedAuthPage = true;
      visitor.hadAuthError = true;
      const code =
        typeof ev.params?.code === "string"
          ? ev.params.code
          : typeof ev.params?.message === "string"
            ? ev.params.message
            : "unknown";
      visitor.lastAuthErrorCode = code;
      recentFailures.push({
        code,
        mode: typeof ev.params?.mode === "string" ? ev.params.mode : "sign-in",
        method: typeof ev.params?.method === "string" ? ev.params.method : "email",
        createdAtIso: ev.createdAt.toISOString(),
      });
    } else if (
      ev.event === "legal_dialog_shown" ||
      ev.event === "ux_blocker_legal_incomplete" ||
      ev.event === "legal_accept_error"
    ) {
      visitor.sawLegalDialog = true;
      visitor.reachedStudio = true;
    } else if (ev.event === "legal_accepted" || ev.event === "legal_dialog_accepted") {
      visitor.acceptedLegalDialog = true;
      visitor.didStudioAction = true;
      visitor.reachedStudio = true;
      visitor.hasAuthenticatedEvent = true;
    }

    if (
      ev.event !== "page_view" &&
      ev.event !== "legal_dialog_shown" &&
      (ev.category === "onboarding" ||
        ev.category === "character" ||
        ev.category === "wardrobe" ||
        ev.category === "life" ||
        ev.category === "video" ||
        ev.category === "editor")
    ) {
      visitor.didStudioAction = true;
    }

    if (isAuth) {
      visitor.reachedAuthPage = true;
      if (cleanPath?.startsWith("/sign-in")) visitor.sawSignInPage = true;
      if (cleanPath?.startsWith("/sign-up")) visitor.sawSignUpPage = true;
      const nextTarget =
        extractAuthNextParam(ev.path) ??
        (typeof ev.params?.nextPath === "string" ? ev.params.nextPath : null);
      if (nextTarget && !visitor.authNextTargets.includes(nextTarget)) {
        visitor.authNextTargets.push(nextTarget);
      }
    }

    if (isStudio || ev.event === "legal_accepted" || ev.category === "onboarding") {
      visitor.reachedStudio = true;
      visitor.hasAuthenticatedEvent = true;
    }

    const sessionKey = ev.sessionId || visitorKey;
    let sess = sessions.get(sessionKey);
    if (!sess) {
      const refInfo = classifyReferrer(ev.referrer);
      sess = {
        sessionKey,
        visitorKey,
        entryBucketPath: null,
        publicPageViews: 0,
        totalEvents: 0,
        reachedAuthOrStudio: false,
        referrerChannel: refInfo.channel,
        referrerHost: refInfo.host,
      };
      sessions.set(sessionKey, sess);
    }
    sess.totalEvents += 1;
    if (isAuth || isStudio || ev.event === "sign_up" || ev.event === "login") {
      sess.reachedAuthOrStudio = true;
    }

    if (ev.event === "page_view" && cleanPath) {
      visitor.pageViewCount += 1;
      if (isPublic) {
        totalPublicPageViews += 1;
        visitor.publicViewCount += 1;
        visitor.visitedMarketing = true;
        sess.publicPageViews += 1;

        const bucket = bucketLandingPath(cleanPath);
        if (!sess.entryBucketPath) {
          sess.entryBucketPath = bucket;
        }
        const stat = landingStats.get(bucket) ?? {
          totalViews: 0,
          visitors: new Set<string>(),
          entrySessions: 0,
          bounceSessions: 0,
        };
        stat.totalViews += 1;
        stat.visitors.add(visitorKey);
        landingStats.set(bucket, stat);
      }
    }
  }

  // Finalize session entry & bounce counts on landing pages.
  for (const sess of sessions.values()) {
    if (!sess.entryBucketPath) continue;
    const stat = landingStats.get(sess.entryBucketPath);
    if (!stat) continue;
    stat.entrySessions += 1;
    if (sess.publicPageViews === 1 && !sess.reachedAuthOrStudio && sess.totalEvents <= 1) {
      stat.bounceSessions += 1;
    }
  }

  const allVisitors = Array.from(visitors.values());
  // Website visitors: anyone who viewed a public/auth page or triggered any website session.
  const websiteVisitors = allVisitors.filter(
    (v) => v.visitedMarketing || v.reachedAuthPage || v.pageViewCount > 0,
  );
  const topVisitorBase = websiteVisitors.length;

  const reachedAuthList = websiteVisitors.filter(
    (v) => v.reachedAuthPage || v.didSignUpEvent || v.didLoginEvent,
  );
  const convertedAuthList = websiteVisitors.filter(
    (v) => v.didSignUpEvent || v.didLoginEvent || v.hasAuthenticatedEvent,
  );
  const enteredStudioList = websiteVisitors.filter((v) => v.reachedStudio);

  // Classify Step 2 drop-offs (visitors who reached /sign-up or /sign-in but did not convert).
  const step2DroppedVisitors = reachedAuthList.filter(
    (v) => !v.didSignUpEvent && !v.didLoginEvent && !v.hasAuthenticatedEvent,
  );

  function classifyStep2DropOff(v: VisitorAccumulator): {
    id: string;
    label: string;
    description: string;
  } {
    if (v.hadAuthError) {
      return {
        id: "auth_error_blocked",
        label: "驗證錯誤阻斷 (Auth Error / Invalid Credential)",
        description: "輸入密碼錯誤、信箱已註冊或網域未授權 (`auth_failed` / `auth_session_failed`)。",
      };
    }
    if (v.cancelledGooglePopup) {
      return {
        id: "google_popup_cancelled",
        label: "點擊 Google 後關閉彈窗或被內置瀏覽器攔截 (Google Popup Cancelled)",
        description: "點擊「以 Google 繼續」後關閉 OAuth 視窗，或在 IG/FB/WeChat 內置 WebView 彈窗受阻。",
      };
    }
    if (v.engagedAuthForm) {
      return {
        id: "form_engaged_abandoned",
        label: "已點擊輸入框或切換登入/註冊但未完成送出 (Form Engaged, Not Submitted)",
        description: "曾點擊 Email/密碼輸入框或切換登入/註冊模式，但在完成驗證前離開。",
      };
    }
    if (isBotUserAgent(v.userAgent)) {
      return {
        id: "bot_or_crawler",
        label: "搜尋引擎與廣告審核爬蟲 (AdsBot / Googlebot / Crawler)",
        description: "Google AdsBot 或搜尋爬蟲自動抓取 `/sign-up` 或 `/sign-in` 頁面，非真人流失。",
      };
    }
    if (v.authNextTargets.some((t) => t.startsWith("/academy"))) {
      return {
        id: "academy_lock_redirect",
        label: "由 Academy 課程鎖進入 `/sign-in?next=/academy/*` 後未登入離開",
        description: "從公開 Academy 課程頁點擊解鎖登入或預覽連結進入 `/sign-in?next=/academy/*`，僅單頁瀏覽即離開。",
      };
    }
    if (
      v.authNextTargets.some(
        (t) => t.startsWith("/scroadmin") || (t.startsWith("/app/") && t !== "/app"),
      )
    ) {
      return {
        id: "protected_route_redirect",
        label: "未登入直接開受保護網址被系統強制導向 `/sign-in?next=...`",
        description: "未登入或 Session 過期時直接開啟 `/app/projects/...` 或 `/scroadmin/...` 被 `proxy.ts` 重導向至 `/sign-in`。",
      };
    }
    return {
      id: "passive_cta_bounce",
      label: "從著陸頁點擊進入 `/sign-up` 或 `/sign-in` 後未互動即跳出 (Passive Auth Bounce)",
      description: "由廣告著陸頁（如 `/right-tool`、`/cantonese`、`/talking-head`）點擊 CTA 進入註冊頁，但未點擊 Google 或輸入 Email 即返回/關閉。",
    };
  }

  // Classify Step 3 visitors (completed auth / authenticated session) to explain why any stopped before or right at /app.
  function classifyStep3Outcome(v: VisitorAccumulator): {
    id: string;
    label: string;
    description: string;
  } {
    if (!v.reachedStudio) {
      return {
        id: "non_studio_destination",
        label: "登入狀態僅瀏覽公開頁或 `/academy`（未進入 `/app` 工作台）",
        description: "帶有已登入 Session 瀏覽首頁、`/academy` 教學或 `/pricing`，該次訪問並未開啟 `/app` 工作台。",
      };
    }
    if (v.sawLegalDialog && !v.acceptedLegalDialog && !v.didStudioAction) {
      return {
        id: "blocked_at_legal_dialog",
        label: "進入 `/app` 後停在「服務條款與私隱政策」強制彈窗 (`AcceptPoliciesDialog`)",
        description: "首次註冊進入 `/app` 時彈出必填服務條款與私隱政策同意框，未勾選同意即返回或離開。",
      };
    }
    const lastClean = v.lastPath || "";
    const backedOutToPublic =
      isAuthPath(lastClean) || (isPublicMarketingPath(lastClean) && !v.didStudioAction);
    if (!v.didStudioAction && backedOutToPublic) {
      return {
        id: "entered_app_then_backed_out",
        label: "完成註冊自動導向 `/app/videos/new` 後未操作即按返回離開 (Immediate Back-Out)",
        description: "完成註冊後進入 `/app/videos/new`（或看到條款彈窗/新片精靈），未建立角色或分鏡即按上一頁返回。",
      };
    }
    return {
      id: "proceeded_into_studio",
      label: "順利進入 `/app` 工作台並開始操作 (Active in Studio)",
      description: "完成註冊或登入後進入 `/app` 並進行建立角色、套用腳本或產生影片。",
    };
  }

  const step2Groups = new Map<
    string,
    { label: string; description: string; count: number; samples: Set<string> }
  >();
  for (const v of step2DroppedVisitors) {
    const info = classifyStep2DropOff(v);
    const group = step2Groups.get(info.id) ?? {
      label: info.label,
      description: info.description,
      count: 0,
      samples: new Set<string>(),
    };
    group.count += 1;
    const sample =
      v.authNextTargets[0]
        ? `${v.lastPath || "/sign-in"}?next=${v.authNextTargets[0]}`
        : v.pathTrail.join(" → ") || v.entryPath || "/sign-up";
    if (group.samples.size < 3) group.samples.add(sample);
    step2Groups.set(info.id, group);
  }

  const step2DropOffReasons: StepDropOffReasonItem[] = Array.from(
    step2Groups.entries(),
  )
    .map(([reasonId, g]) => ({
      reasonId,
      label: g.label,
      description: g.description,
      visitorCount: g.count,
      sharePercent: roundPercent(g.count, Math.max(1, step2DroppedVisitors.length)),
      samplePaths: Array.from(g.samples),
    }))
    .sort((a, b) => b.visitorCount - a.visitorCount);

  const step3Groups = new Map<
    string,
    { label: string; description: string; count: number; samples: Set<string> }
  >();
  for (const v of convertedAuthList) {
    const info = classifyStep3Outcome(v);
    const group = step3Groups.get(info.id) ?? {
      label: info.label,
      description: info.description,
      count: 0,
      samples: new Set<string>(),
    };
    group.count += 1;
    const sample = v.pathTrail.join(" → ") || v.entryPath || "/app";
    if (group.samples.size < 3) group.samples.add(sample);
    step3Groups.set(info.id, group);
  }

  const step3DropOffReasons: StepDropOffReasonItem[] = Array.from(
    step3Groups.entries(),
  )
    .map(([reasonId, g]) => ({
      reasonId,
      label: g.label,
      description: g.description,
      visitorCount: g.count,
      sharePercent: roundPercent(g.count, Math.max(1, convertedAuthList.length)),
      samplePaths: Array.from(g.samples),
    }))
    .sort((a, b) => b.visitorCount - a.visitorCount);

  // Build 4-step Website Entry -> Auth Page -> Signed Up / Logged In -> Entered Studio funnel.
  const rawSteps: Array<{
    stepId: string;
    label: string;
    description: string;
    count: number;
  }> = [
    {
      stepId: "website_entry",
      label: "1. 進站瀏覽官網 / 著陸頁 (Website Visitors)",
      description: "進入首頁、功能著陸頁、定價頁或部落格文章的不重複訪客數。",
      count: topVisitorBase,
    },
    {
      stepId: "auth_intent",
      label: "2. 點擊進入註冊 / 登入頁 (Visited /sign-up or /sign-in)",
      description: "從著陸頁點擊 CTA 進入註冊或登入流程的訪客。",
      count: reachedAuthList.length,
    },
    {
      stepId: "auth_completed",
      label: "3. 完成註冊或登入帳號 (Registered / Logged In)",
      description: "成功透過 Google 或 Email 完成註冊 (`sign_up`) 或登入 (`login`)。",
      count: convertedAuthList.length,
    },
    {
      stepId: "entered_studio",
      label: "4. 進入登入後工作台 (/app Studio Flow)",
      description: "完成驗證並進入 `/app` 工作台，銜接至 `/scroadmin/analytics` 創作漏斗。",
      count: enteredStudioList.length,
    },
  ];

  let prevCount = topVisitorBase;
  const funnel: WebsiteFunnelStep[] = rawSteps.map((step, idx) => {
    const conversionFromTopPercent = roundPercent(step.count, topVisitorBase);
    const conversionFromPrevPercent =
      idx === 0 ? 100 : roundPercent(step.count, Math.max(step.count, prevCount));
    const dropOffCount = idx === 0 ? 0 : Math.max(0, prevCount - step.count);
    const dropOffPercent = idx === 0 ? 0 : roundPercent(dropOffCount, prevCount);
    prevCount = step.count;
    return {
      stepId: step.stepId,
      label: step.label,
      description: step.description,
      visitorCount: step.count,
      conversionFromTopPercent,
      conversionFromPrevPercent,
      dropOffCount,
      dropOffPercent,
    };
  });

  // Landing pages performance table
  const landingPages: LandingPagePerformanceItem[] = Array.from(
    landingStats.entries(),
  )
    .map(([path, stat]) => {
      let reachedAuthVisitors = 0;
      let convertedVisitors = 0;
      for (const vKey of stat.visitors) {
        const v = visitors.get(vKey);
        if (!v) continue;
        if (v.reachedAuthPage || v.didSignUpEvent || v.didLoginEvent) {
          reachedAuthVisitors += 1;
        }
        if (v.didSignUpEvent || v.didLoginEvent || v.hasAuthenticatedEvent) {
          convertedVisitors += 1;
        }
      }
      const uniqueVisitors = stat.visitors.size;
      return {
        path,
        label: LANDING_PAGE_LABELS[path] || path,
        totalViews: stat.totalViews,
        uniqueVisitors,
        entrySessions: stat.entrySessions,
        bounceSessions: stat.bounceSessions,
        bounceRatePercent: roundPercent(stat.bounceSessions, stat.entrySessions),
        reachedAuthVisitors,
        convertedVisitors,
        conversionRatePercent: roundPercent(convertedVisitors, uniqueVisitors),
      };
    })
    .sort((a, b) => b.totalViews - a.totalViews || b.uniqueVisitors - a.uniqueVisitors);

  // Referrer channels table
  const refGroup = new Map<
    string,
    {
      channel: string;
      host: string;
      sessions: number;
      visitors: Set<string>;
      convertedVisitors: Set<string>;
    }
  >();
  for (const v of websiteVisitors) {
    const key = `${v.referrerChannel}::${v.referrerHost}`;
    const item = refGroup.get(key) ?? {
      channel: v.referrerChannel,
      host: v.referrerHost,
      sessions: 0,
      visitors: new Set<string>(),
      convertedVisitors: new Set<string>(),
    };
    item.visitors.add(v.visitorKey);
    if (v.didSignUpEvent || v.didLoginEvent || v.hasAuthenticatedEvent) {
      item.convertedVisitors.add(v.visitorKey);
    }
    refGroup.set(key, item);
  }
  for (const s of sessions.values()) {
    const v = visitors.get(s.visitorKey);
    if (!v) continue;
    const key = `${v.referrerChannel}::${v.referrerHost}`;
    const item = refGroup.get(key);
    if (item) item.sessions += 1;
  }

  const referrers: ReferrerChannelItem[] = Array.from(refGroup.values())
    .map((item) => ({
      channel: item.channel,
      host: item.host,
      sessions: Math.max(item.sessions, item.visitors.size),
      visitors: item.visitors.size,
      convertedVisitors: item.convertedVisitors.size,
      conversionRatePercent: roundPercent(
        item.convertedVisitors.size,
        item.visitors.size,
      ),
    }))
    .sort((a, b) => b.visitors - a.visitors || b.sessions - a.sessions)
    .slice(0, 12);

  // Locale breakdown
  const localeCounts = new Map<string, number>();
  for (const v of websiteVisitors) {
    const loc = v.locale || "en";
    localeCounts.set(loc, (localeCounts.get(loc) ?? 0) + 1);
  }
  const locales = Array.from(localeCounts.entries())
    .map(([locale, count]) => ({
      locale,
      visitors: count,
      sharePercent: roundPercent(count, topVisitorBase),
    }))
    .sort((a, b) => b.visitors - a.visitors);

  // Auth breakdown
  const authBreakdown: AuthConversionBreakdown = {
    signInPageVisitors: websiteVisitors.filter((v) => v.sawSignInPage).length,
    signUpPageVisitors: websiteVisitors.filter((v) => v.sawSignUpPage).length,
    loginSuccessUsers: allVisitors.filter((v) => v.didLoginEvent).length,
    signUpSuccessUsers: allVisitors.filter((v) => v.didSignUpEvent).length,
    googleAuthCount,
    emailAuthCount,
    googleCancelledCount,
    formEngagedCount,
    authFailureCount,
    recentFailures: recentFailures.slice(-10).reverse(),
  };

  // Recent visitor journeys (newest first)
  const recentVisitors: VisitorJourneyRow[] = [...websiteVisitors]
    .sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime())
    .slice(0, 80)
    .map((v) => {
      let authOutcome: VisitorJourneyRow["authOutcome"] = "browsing";
      let dropOffReason: string | null = null;
      if (v.didSignUpEvent) {
        authOutcome = "signed_up";
        dropOffReason = classifyStep3Outcome(v).label;
      } else if (v.didLoginEvent) {
        authOutcome = "logged_in";
        dropOffReason = classifyStep3Outcome(v).label;
      } else if (v.hasAuthenticatedEvent) {
        authOutcome = "authenticated_session";
        dropOffReason = classifyStep3Outcome(v).label;
      } else if (v.reachedAuthPage) {
        authOutcome = "auth_abandoned";
        dropOffReason = classifyStep2DropOff(v).label;
      }

      return {
        visitorKey: v.visitorKey,
        anonId: v.anonId,
        clerkUserId: v.clerkUserId,
        userEmail: v.userEmail,
        entryPath: v.entryPath || "/",
        lastPath: v.lastPath || "/",
        referrerHost: v.referrerHost,
        locale: v.locale,
        deviceLabel: classifyVisitorDevice(v.userAgent),
        pageViewCount: v.pageViewCount,
        reachedAuthPage: v.reachedAuthPage,
        authOutcome,
        dropOffReason,
        reachedStudio: v.reachedStudio,
        pathTrail: v.pathTrail,
        firstSeenIso: v.firstSeen.toISOString(),
        lastSeenIso: v.lastSeen.toISOString(),
      };
    });

  return {
    generatedAtIso: new Date().toISOString(),
    kpis: {
      totalPublicPageViews,
      uniqueWebsiteVisitors: topVisitorBase,
      totalSessions: sessions.size,
      visitorsReachedAuth: reachedAuthList.length,
      authIntentRatePercent: roundPercent(reachedAuthList.length, topVisitorBase),
      convertedToAccountVisitors: convertedAuthList.length,
      visitorToAuthRatePercent: roundPercent(convertedAuthList.length, topVisitorBase),
      visitorsEnteredStudio: enteredStudioList.length,
      studioEntryRatePercent: roundPercent(enteredStudioList.length, topVisitorBase),
      newSignUps7d: options?.newSignUps7d ?? 0,
      newSignUps30d: options?.newSignUps30d ?? 0,
    },
    funnel,
    step2DropOffReasons,
    step3DropOffReasons,
    landingPages,
    referrers,
    locales,
    authBreakdown,
    recentVisitors,
  };
}

// Load `ux_events` and `users` from MongoDB to build the Website Traffic & Registration Funnel report.
export async function getWebsiteAnalyticsReport(): Promise<WebsiteAnalyticsReport> {
  const [eventsCol, usersCol] = await Promise.all([
    uxEventsCollection(),
    usersCollection(),
  ]);

  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const [eventsRaw, users, newSignUps7d, newSignUps30d] = await Promise.all([
    eventsCol
      .find(
        {},
        {
          projection: {
            event: 1,
            category: 1,
            anonId: 1,
            sessionId: 1,
            clerkUserId: 1,
            userEmail: 1,
            path: 1,
            referrer: 1,
            locale: 1,
            userAgent: 1,
            params: 1,
            createdAt: 1,
          },
        },
      )
      .sort({ createdAt: -1 })
      .limit(5000)
      .toArray(),
    usersCol
      .find({}, { projection: { clerkUserId: 1, email: 1 } })
      .limit(2000)
      .toArray(),
    usersCol.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    usersCol.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
  ]);

  const userEmailsById = new Map<string, string>();
  for (const u of users) {
    if (u.clerkUserId && u.email) {
      userEmailsById.set(u.clerkUserId, u.email);
    }
  }

  return buildWebsiteAnalyticsFromEvents(eventsRaw, {
    userEmailsById,
    newSignUps7d,
    newSignUps30d,
  });
}
