import { Suspense } from "react";
import { requireAppUser } from "@/service/auth";
import { isHotTopicsCacheFresh } from "@/service/home/hot-topics";
import { HomeView } from "@/presentation/components/app/home-view";

export default async function DashboardPage() {
  const user = await requireAppUser();
  const cacheFresh = isHotTopicsCacheFresh(user.hotTopicsCache);

  return (
    <Suspense fallback={null}>
      <HomeView
        initialHotTopics={user.hotTopicsCache?.topics}
        hotTopicsNeedRefresh={!cacheFresh}
      />
    </Suspense>
  );
}
