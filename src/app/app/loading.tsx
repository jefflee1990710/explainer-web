import { StudioRouteSkeleton } from "@/presentation/studio/studio-route-skeleton";

// Instant feedback while server pages fetch Mongo data (see app/*/page.tsx).
export default function AppLoading() {
  return <StudioRouteSkeleton />;
}
