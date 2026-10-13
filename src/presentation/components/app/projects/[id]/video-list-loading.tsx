import { Spinner } from "@/presentation/components/spinner";

// Shown after the filtered page is already on screen, while records are still loading.
export function VideoListLoading({ label }: { label: string }) {
  return (
    <p className="flex items-center gap-2 text-sm text-muted" role="status">
      <Spinner />
      {label}
    </p>
  );
}
