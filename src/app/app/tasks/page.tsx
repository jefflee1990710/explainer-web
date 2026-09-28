import { requireAppUser } from "@/service/auth";
import { listTasks } from "@/service/generation/task-list";
import { TasksView } from "@/presentation/components/app/tasks/tasks-view";

// Every generation task of the signed-in user; the view polls for updates.
export default async function TasksPage() {
  const user = await requireAppUser();
  const tasks = await listTasks(user.clerkUserId);
  return <TasksView initial={tasks} />;
}
