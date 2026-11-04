import { requireAppUser } from "@/service/auth";
import { listTasks } from "@/service/generation/task-list";
import { TasksView } from "@/presentation/components/app/tasks/tasks-view";

const YEAR_LOOKBACK_MS = 365 * 24 * 60 * 60 * 1000;

// Every generation task of the signed-in user; the view polls for updates.
export default async function TasksPage() {
  const user = await requireAppUser();
  const tasks = await listTasks(user.clerkUserId, {
    limit: 120,
    lookbackMs: YEAR_LOOKBACK_MS,
  });
  return <TasksView initial={tasks} />;
}
