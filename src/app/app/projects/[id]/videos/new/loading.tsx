import { EditorLoadingOverlay } from "@/presentation/components/app/projects/new/editor-loading-overlay";

// Shown as soon as the new-video link is clicked, before the editor workspace streams in.
export default function NewVideoEditorLoading() {
  return <EditorLoadingOverlay />;
}
