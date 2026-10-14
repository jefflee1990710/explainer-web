import { EditorLoadingOverlay } from "@/presentation/components/app/projects/new/editor-loading-overlay";

// Shown as soon as a video card is opened, before the editor document arrives.
export default function VideoEditorLoading() {
  return <EditorLoadingOverlay />;
}
