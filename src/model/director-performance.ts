// Performance slots for on-camera read directors (talking-head family).
// These are the style layer users may copy and edit; the pipeline rules that
// make clips chain, time, and lip-sync stay in code. Kept off skill.ts so the
// client UI never pulls mongodb/zod into the bundle.
export const PERFORMANCE_KEYS = [
  "restingFace",
  "emphasisBeat",
  "hookBeat",
  "ctaBeat",
  "gestureLibrary",
  "headMotion",
  "anchorProp",
  "set",
  "light",
] as const;
export type PerformanceKey = (typeof PERFORMANCE_KEYS)[number];
export type PerformanceSlots = Record<PerformanceKey, string>;

// Prompt text language. English for "en"; Cantonese scaffolding for yue and zh.
export type PerformanceLanguage = "en" | "yue";

// System directors store one slot set per prompt language so the Cantonese
// video prompt keeps native phrasing. Custom directors edit English only.
export type SystemPerformance = Record<PerformanceLanguage, PerformanceSlots>;

// Draft field name for one performance slot, e.g. "performance.restingFace".
export const PERFORMANCE_FIELD_PREFIX = "performance.";
export type PerformanceField = `${typeof PERFORMANCE_FIELD_PREFIX}${PerformanceKey}`;
export const PERFORMANCE_FIELDS = PERFORMANCE_KEYS.map(
  (key) => `${PERFORMANCE_FIELD_PREFIX}${key}` as PerformanceField,
);

export function performanceKeyOf(field: string): PerformanceKey | undefined {
  if (!field.startsWith(PERFORMANCE_FIELD_PREFIX)) return undefined;
  const key = field.slice(PERFORMANCE_FIELD_PREFIX.length);
  return (PERFORMANCE_KEYS as readonly string[]).includes(key) ? (key as PerformanceKey) : undefined;
}
