// Post-output actions shown for users already classified as 已成功產出內容.

export const POST_ACTIVATION_EVENTS = [
  "opencut_export_started",
  "opencut_export_done",
  "opencut_export_error",
  "video_share_target_clicked",
  "video_share_link_copied",
  "video_share_native",
  "video_share_caption_copied",
  "life_photo_downloaded",
  "life_photo_saved",
  "opencut_editor_opened",
  "opencut_edit_saved",
  "video_created",
  "life_shot_submitted",
] as const;

export type PostActivationEventName = (typeof POST_ACTIVATION_EVENTS)[number];

const POST_ACTIVATION_LABELS: Record<PostActivationEventName, string> = {
  opencut_export_started: "開始匯出 MP4",
  opencut_export_done: "匯出完成",
  opencut_export_error: "匯出失敗",
  video_share_target_clicked: "分享到平台",
  video_share_link_copied: "複製影片連結",
  video_share_native: "系統分享",
  video_share_caption_copied: "複製分享文案",
  life_photo_downloaded: "下載 Life 照片",
  life_photo_saved: "儲存 Life 照片",
  opencut_editor_opened: "開啟剪輯器",
  opencut_edit_saved: "儲存剪輯",
  video_created: "再建立影片",
  life_shot_submitted: "再提交 Life 照片",
};

const POST_ACTIVATION_EVENT_SET = new Set<string>(POST_ACTIVATION_EVENTS);

export type PostActivationEventInput = {
  event: string;
  clerkUserId?: string | null;
  createdAt: Date;
  params?: Record<string, unknown>;
};

export type PostActivationActionSummary = {
  event: PostActivationEventName;
  label: string;
  count: number;
  uniqueUsers: number;
};

export type PostActivationBehavior = {
  activatedUserCount: number;
  actions: PostActivationActionSummary[];
  recentByUser: Record<string, string[]>;
};

const RECENT_ACTION_LIMIT = 3;

function isPostActivationEvent(event: string): event is PostActivationEventName {
  return POST_ACTIVATION_EVENT_SET.has(event);
}

// Human label for one post-output click, including the share platform when present.
export function postActivationActionLabel(
  event: string,
  params?: Record<string, unknown>,
): string {
  const base = isPostActivationEvent(event) ? POST_ACTIVATION_LABELS[event] : event;
  const target = params?.target;
  if (event === "video_share_target_clicked" && typeof target === "string" && target.trim()) {
    return `${base} · ${target.trim()}`;
  }
  return base;
}

// Aggregate catalog clicks for users who already produced a clip, reel, or Life photo.
export function buildPostActivationBehavior(
  activatedUserIds: readonly string[],
  events: readonly PostActivationEventInput[],
): PostActivationBehavior {
  const activated = new Set(activatedUserIds);
  const counts = new Map<PostActivationEventName, number>();
  const usersByEvent = new Map<PostActivationEventName, Set<string>>();
  const eventsByUser = new Map<string, PostActivationEventInput[]>();

  for (const eventName of POST_ACTIVATION_EVENTS) {
    counts.set(eventName, 0);
    usersByEvent.set(eventName, new Set());
  }

  for (const event of events) {
    const userId = event.clerkUserId;
    if (!userId || !activated.has(userId) || !isPostActivationEvent(event.event)) continue;
    counts.set(event.event, (counts.get(event.event) ?? 0) + 1);
    usersByEvent.get(event.event)?.add(userId);
    const bucket = eventsByUser.get(userId) ?? [];
    bucket.push(event);
    eventsByUser.set(userId, bucket);
  }

  const actions = POST_ACTIVATION_EVENTS.map((eventName) => ({
    event: eventName,
    label: POST_ACTIVATION_LABELS[eventName],
    count: counts.get(eventName) ?? 0,
    uniqueUsers: usersByEvent.get(eventName)?.size ?? 0,
  })).sort(
    (a, b) =>
      b.count - a.count ||
      POST_ACTIVATION_EVENTS.indexOf(a.event) - POST_ACTIVATION_EVENTS.indexOf(b.event),
  );

  const recentByUser: Record<string, string[]> = {};
  for (const [userId, userEvents] of eventsByUser) {
    recentByUser[userId] = [...userEvents]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, RECENT_ACTION_LIMIT)
      .map((event) => postActivationActionLabel(event.event, event.params));
  }

  return {
    activatedUserCount: activated.size,
    actions,
    recentByUser,
  };
}
