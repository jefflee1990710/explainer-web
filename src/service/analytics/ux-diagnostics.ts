import {
  charactersCollection,
  generationJobsCollection,
  lifeShotsCollection,
  projectsCollection,
  usersCollection,
  uxEventsCollection,
  videosCollection,
} from "@/dao";
import {
  buildPostActivationBehavior,
  type PostActivationActionSummary,
} from "@/service/analytics/post-activation";
import {
  buildRetrospectiveFunnel,
  classifyUserStuckStage,
  type FunnelStepMetric,
  type StuckStageClassification,
  type StuckStageId,
  type UserJourneySnapshot,
} from "@/service/analytics/ux-classifier";

export type StuckStageSummaryItem = {
  stageId: StuckStageId;
  title: string;
  reason: string;
  recommendation: string;
  severity: "high" | "medium" | "low" | "healthy";
  userCount: number;
  percentOfUsers: number;
  sampleEmails: string[];
};

export type UserDiagnosticRow = UserJourneySnapshot & {
  diagnosis: StuckStageClassification;
  postActivationActions: string[];
};

export type PostActivationReport = {
  activatedUserCount: number;
  actions: PostActivationActionSummary[];
};

export type RecentUxEventRow = {
  id: string;
  event: string;
  category: string;
  source: "client" | "server";
  userEmail: string | null;
  clerkUserId: string | null;
  path: string | null;
  paramsSummary: string;
  createdAtIso: string;
};

export type DropOffPageItem = {
  path: string;
  exitCount: number;
  totalViews: number;
};

export type BlockerEventBreakdown = {
  event: string;
  count: number;
  lastError: string | null;
  lastSeenIso: string;
};

export type UxDiagnosticsReport = {
  generatedAtIso: string;
  kpis: {
    totalUsers: number;
    activeUsers7d: number;
    activatedUsers: number;
    activationRatePercent: number;
    totalEventsLogged: number;
    blockerEventsCount: number;
    failedGenerationJobsCount: number;
  };
  funnel: FunnelStepMetric[];
  stuckStages: StuckStageSummaryItem[];
  dropOffPages: DropOffPageItem[];
  blockers: BlockerEventBreakdown[];
  users: UserDiagnosticRow[];
  recentEvents: RecentUxEventRow[];
  postActivation: PostActivationReport;
};

function summarizeParams(params?: Record<string, unknown>): string {
  if (!params) return "";
  const entries = Object.entries(params)
    .filter(([key]) => key !== "page_location" && key !== "page_title")
    .slice(0, 4)
    .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`);
  return entries.join(" · ");
}

// Build a full UX funnel & drop-off diagnostic report from MongoDB state + `ux_events`.
export async function getUxDiagnosticsReport(): Promise<UxDiagnosticsReport> {
  const [
    usersCol,
    foldersCol,
    charactersCol,
    videosCol,
    lifeCol,
    jobsCol,
    eventsCol,
  ] = await Promise.all([
    usersCollection(),
    projectsCollection(),
    charactersCollection(),
    videosCollection(),
    lifeShotsCollection(),
    generationJobsCollection(),
    uxEventsCollection(),
  ]);

  const [
    users,
    folders,
    characters,
    videos,
    lifeShots,
    failedJobs,
    recentEventsRaw,
    totalEventsLogged,
  ] = await Promise.all([
    usersCol.find({}).sort({ createdAt: -1 }).limit(300).toArray(),
    foldersCol
      .find({}, { projection: { clerkUserId: 1, createdAt: 1 } })
      .toArray(),
    charactersCol
      .find(
        {},
        {
          projection: {
            clerkUserId: 1,
            starterGift: 1,
            versions: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      )
      .toArray(),
    videosCol
      .find(
        {},
        {
          projection: {
            clerkUserId: 1,
            status: 1,
            phaseA: 1,
            frames: 1,
            clips: 1,
            reelUrl: 1,
            finalUrl: 1,
            error: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      )
      .toArray(),
    lifeCol
      .find(
        {},
        { projection: { clerkUserId: 1, status: 1, resultUrl: 1, createdAt: 1 } },
      )
      .toArray(),
    jobsCol
      .find(
        { status: { $in: ["failed", "nsfw"] } },
        {
          projection: {
            projectId: 1,
            characterId: 1,
            kind: 1,
            error: 1,
            createdAt: 1,
          },
        },
      )
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray(),
    eventsCol.find({}).sort({ createdAt: -1 }).limit(500).toArray(),
    eventsCol.countDocuments({}),
  ]);

  // Index owner maps for failed jobs.
  const videoOwnerById = new Map<string, string>();
  for (const v of videos) {
    if (v._id) videoOwnerById.set(v._id.toString(), v.clerkUserId);
  }
  const characterOwnerById = new Map<string, string>();
  for (const c of characters) {
    if (c._id) characterOwnerById.set(c._id.toString(), c.clerkUserId);
  }

  const failedJobsByUser = new Map<string, number>();
  for (const job of failedJobs) {
    const owner =
      (job.projectId && videoOwnerById.get(job.projectId.toString())) ||
      (job.characterId && characterOwnerById.get(job.characterId.toString()));
    if (owner) {
      failedJobsByUser.set(owner, (failedJobsByUser.get(owner) ?? 0) + 1);
    }
  }

  // Group counts per clerkUserId.
  const folderCountByUser = new Map<string, number>();
  for (const f of folders) {
    folderCountByUser.set(
      f.clerkUserId,
      (folderCountByUser.get(f.clerkUserId) ?? 0) + 1,
    );
  }

  const charStatsByUser = new Map<
    string,
    { total: number; completed: number; lastAt: number }
  >();
  for (const c of characters) {
    // Exclude pre-seeded starter characters so we measure real user creation.
    if (c.starterGift) continue;
    const prev = charStatsByUser.get(c.clerkUserId) ?? {
      total: 0,
      completed: 0,
      lastAt: 0,
    };
    prev.total += 1;
    const hasCompletedVersion = (c.versions ?? []).some(
      (v) => v.status === "completed" || Boolean(v.blueprintUrl),
    );
    if (hasCompletedVersion) prev.completed += 1;
    const ts = c.updatedAt ? new Date(c.updatedAt).getTime() : 0;
    if (ts > prev.lastAt) prev.lastAt = ts;
    charStatsByUser.set(c.clerkUserId, prev);
  }

  const lifeStatsByUser = new Map<string, { count: number; lastAt: number }>();
  for (const shot of lifeShots) {
    const prev = lifeStatsByUser.get(shot.clerkUserId) ?? {
      count: 0,
      lastAt: 0,
    };
    if (shot.status !== "failed" && Boolean(shot.resultUrl)) {
      prev.count += 1;
    }
    const ts = shot.createdAt ? new Date(shot.createdAt).getTime() : 0;
    if (ts > prev.lastAt) prev.lastAt = ts;
    lifeStatsByUser.set(shot.clerkUserId, prev);
  }

  const videoStatsByUser = new Map<
    string,
    {
      total: number;
      storyboardReady: number;
      keyframeReady: number;
      clipVideoReady: number;
      reelReady: number;
      lastAt: number;
    }
  >();

  for (const v of videos) {
    const prev = videoStatsByUser.get(v.clerkUserId) ?? {
      total: 0,
      storyboardReady: 0,
      keyframeReady: 0,
      clipVideoReady: 0,
      reelReady: 0,
      lastAt: 0,
    };
    prev.total += 1;
    const hasStoryboard =
      Boolean(v.phaseA && (v.phaseA.clips?.length ?? 0) > 0) ||
      (v.clips?.length ?? 0) > 0;
    if (hasStoryboard) prev.storyboardReady += 1;

    const hasKeyframe = (v.frames ?? []).some(
      (f) => f.status === "completed" && Boolean(f.outputUrl || f.blobUrl),
    );
    if (hasKeyframe) prev.keyframeReady += 1;

    const hasClipVideo = (v.clips ?? []).some(
      (c) => c.status === "completed" && Boolean(c.outputUrl || c.blobUrl),
    );
    if (hasClipVideo) prev.clipVideoReady += 1;

    if (Boolean(v.reelUrl || v.finalUrl)) {
      prev.reelReady += 1;
    }
    const ts = v.updatedAt ? new Date(v.updatedAt).getTime() : 0;
    if (ts > prev.lastAt) prev.lastAt = ts;
    videoStatsByUser.set(v.clerkUserId, prev);
  }

  // Analyze recent `ux_events` for credit blocks, last path, session exits, and blocker breakdown.
  const creditBlockByUser = new Map<string, number>();
  const lastEventByUser = new Map<
    string,
    { event: string; path: string | null; at: number }
  >();
  const pageViewsByPath = new Map<string, number>();
  const lastPathBySession = new Map<string, string>();
  const blockerCounts = new Map<
    string,
    { count: number; lastError: string | null; lastSeenIso: string }
  >();

  // Iterate oldest-to-newest so lastPathBySession reflects the final page before exit.
  const chronologicalEvents = [...recentEventsRaw].reverse();
  for (const ev of chronologicalEvents) {
    const cleanPath = ev.path ? ev.path.split("?")[0] || "/" : null;
    if (ev.event === "page_view" && cleanPath) {
      pageViewsByPath.set(cleanPath, (pageViewsByPath.get(cleanPath) ?? 0) + 1);
      const sessKey = ev.sessionId || ev.anonId || ev.clerkUserId;
      if (sessKey) {
        lastPathBySession.set(sessKey, cleanPath);
      }
    }

    if (ev.clerkUserId) {
      if (
        ev.event.includes("insufficient_credits") ||
        ev.event.includes("second_clip_locked")
      ) {
        creditBlockByUser.set(
          ev.clerkUserId,
          (creditBlockByUser.get(ev.clerkUserId) ?? 0) + 1,
        );
      }
      const ts = ev.createdAt ? new Date(ev.createdAt).getTime() : 0;
      const existing = lastEventByUser.get(ev.clerkUserId);
      if (!existing || ts >= existing.at) {
        lastEventByUser.set(ev.clerkUserId, {
          event: ev.event,
          path: cleanPath,
          at: ts,
        });
      }
    }

    if (ev.category === "blocker") {
      const prev = blockerCounts.get(ev.event) ?? {
        count: 0,
        lastError: null,
        lastSeenIso: ev.createdAt.toISOString(),
      };
      prev.count += 1;
      const errParam =
        ev.params && typeof ev.params.error === "string"
          ? ev.params.error
          : null;
      if (errParam) prev.lastError = errParam;
      prev.lastSeenIso = ev.createdAt.toISOString();
      blockerCounts.set(ev.event, prev);
    }
  }

  const exitCountByPath = new Map<string, number>();
  for (const [, exitPath] of lastPathBySession) {
    exitCountByPath.set(exitPath, (exitCountByPath.get(exitPath) ?? 0) + 1);
  }

  const dropOffPages: DropOffPageItem[] = Array.from(pageViewsByPath.entries())
    .map(([path, totalViews]) => ({
      path,
      totalViews,
      exitCount: exitCountByPath.get(path) ?? 0,
    }))
    .sort((a, b) => b.exitCount - a.exitCount || b.totalViews - a.totalViews)
    .slice(0, 10);

  const blockers: BlockerEventBreakdown[] = Array.from(blockerCounts.entries())
    .map(([event, info]) => ({
      event,
      count: info.count,
      lastError: info.lastError,
      lastSeenIso: info.lastSeenIso,
    }))
    .sort((a, b) => b.count - a.count);

  const userEmailByClerkId = new Map<string, string>();
  const snapshots: UserJourneySnapshot[] = users.map((u) => {
    userEmailByClerkId.set(u.clerkUserId, u.email);
    const charStat = charStatsByUser.get(u.clerkUserId);
    const videoStat = videoStatsByUser.get(u.clerkUserId);
    const lifeStat = lifeStatsByUser.get(u.clerkUserId);
    const lastEv = lastEventByUser.get(u.clerkUserId);

    const lastTimestamps = [
      u.updatedAt ? new Date(u.updatedAt).getTime() : 0,
      u.createdAt ? new Date(u.createdAt).getTime() : 0,
      charStat?.lastAt ?? 0,
      videoStat?.lastAt ?? 0,
      lifeStat?.lastAt ?? 0,
      lastEv?.at ?? 0,
    ];
    const maxTs = Math.max(...lastTimestamps);

    return {
      clerkUserId: u.clerkUserId,
      email: u.email || "(no email)",
      name: u.name || "User",
      credits: u.credits ?? 0,
      hasAcceptedLegal: Boolean(u.legalAcceptance?.acceptedAt),
      folderCount: folderCountByUser.get(u.clerkUserId) ?? 0,
      characterCount: charStat?.total ?? 0,
      completedCharacterCount: charStat?.completed ?? 0,
      lifeShotCount: lifeStat?.count ?? 0,
      videoCount: videoStat?.total ?? 0,
      storyboardReadyCount: videoStat?.storyboardReady ?? 0,
      keyframeReadyCount: videoStat?.keyframeReady ?? 0,
      clipVideoReadyCount: videoStat?.clipVideoReady ?? 0,
      reelReadyCount: videoStat?.reelReady ?? 0,
      failedJobCount: failedJobsByUser.get(u.clerkUserId) ?? 0,
      creditBlockCount: creditBlockByUser.get(u.clerkUserId) ?? 0,
      lastPath: lastEv?.path ?? null,
      lastEvent: lastEv?.event ?? null,
      createdAt: u.createdAt ? new Date(u.createdAt) : new Date(0),
      lastActiveAt: maxTs > 0 ? new Date(maxTs) : new Date(0),
    };
  });

  const funnel = buildRetrospectiveFunnel(snapshots);

  const diagnosed = snapshots
    .map((snap) => ({
      ...snap,
      diagnosis: classifyUserStuckStage(snap),
    }))
    .sort((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime());

  // Clicks after a user already has a clip, reel, or Life photo.
  const postActivation = buildPostActivationBehavior(
    diagnosed
      .filter((row) => row.diagnosis.stageId === "activated_producing")
      .map((row) => row.clerkUserId),
    chronologicalEvents.map((ev) => ({
      event: ev.event,
      clerkUserId: ev.clerkUserId,
      createdAt: ev.createdAt ? new Date(ev.createdAt) : new Date(0),
      params: ev.params,
    })),
  );

  const userRows: UserDiagnosticRow[] = diagnosed.map((row) => ({
    ...row,
    postActivationActions: postActivation.recentByUser[row.clerkUserId] ?? [],
  }));

  // Group stuck stages across all users.
  const stageGroupMap = new Map<
    StuckStageId,
    {
      classification: StuckStageClassification;
      count: number;
      emails: string[];
    }
  >();

  for (const row of userRows) {
    const id = row.diagnosis.stageId;
    const prev = stageGroupMap.get(id) ?? {
      classification: row.diagnosis,
      count: 0,
      emails: [],
    };
    prev.count += 1;
    if (prev.emails.length < 5 && row.email) {
      prev.emails.push(row.email);
    }
    stageGroupMap.set(id, prev);
  }

  const totalUsers = userRows.length;
  const stuckStages: StuckStageSummaryItem[] = Array.from(
    stageGroupMap.values(),
  )
    .map(({ classification, count, emails }) => ({
      stageId: classification.stageId,
      title: classification.title,
      reason: classification.reason,
      recommendation: classification.recommendation,
      severity: classification.severity,
      userCount: count,
      percentOfUsers:
        totalUsers > 0 ? Math.round((count / totalUsers) * 1000) / 10 : 0,
      sampleEmails: emails,
    }))
    .sort((a, b) => b.userCount - a.userCount);

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const activeUsers7d = userRows.filter(
    (u) => u.lastActiveAt.getTime() >= sevenDaysAgo,
  ).length;
  const activatedUsers = userRows.filter(
    (u) => u.diagnosis.stageId === "activated_producing",
  ).length;

  const recentEvents: RecentUxEventRow[] = recentEventsRaw
    .slice(0, 80)
    .map((ev) => ({
      id: ev._id?.toString() ?? Math.random().toString(36),
      event: ev.event,
      category: ev.category,
      source: ev.source,
      userEmail:
        ev.userEmail ??
        (ev.clerkUserId ? userEmailByClerkId.get(ev.clerkUserId) ?? null : null),
      clerkUserId: ev.clerkUserId ?? null,
      path: ev.path ?? null,
      paramsSummary: summarizeParams(ev.params),
      createdAtIso: ev.createdAt
        ? new Date(ev.createdAt).toISOString()
        : new Date().toISOString(),
    }));

  return {
    generatedAtIso: new Date().toISOString(),
    kpis: {
      totalUsers,
      activeUsers7d,
      activatedUsers,
      activationRatePercent:
        totalUsers > 0
          ? Math.round((activatedUsers / totalUsers) * 1000) / 10
          : 0,
      totalEventsLogged,
      blockerEventsCount: blockers.reduce((acc, b) => acc + b.count, 0),
      failedGenerationJobsCount: failedJobs.length,
    },
    funnel,
    stuckStages,
    dropOffPages,
    blockers,
    users: userRows,
    recentEvents,
    postActivation: {
      activatedUserCount: postActivation.activatedUserCount,
      actions: postActivation.actions,
    },
  };
}
