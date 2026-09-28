// Polls many provider jobs and may mirror results to Blob; allow up to 5 minutes.
export const maxDuration = 300;
export { GET } from "@/presentation/api/cron/refresh-jobs/route";
