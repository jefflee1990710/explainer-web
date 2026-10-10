import type { VideoEdit } from "@/model/video-edit";
import { isFade } from "@/service/reel/assembly-plan";
import { clipPairTransitions } from "@/service/video-edit/edit-transition";

// The server reel already joins every clip with hard cuts. Export can start from it
// when the edit adds no bookend and no fade between clips.
export function reelCoversJoins(edit: VideoEdit, clipNumbers: number[]) {
  if (edit.intro || edit.outro) return false;
  return !clipPairTransitions(edit, clipNumbers).some(isFade);
}
