"use server";

import { setDirectorPickerEnabled as setDirectorPickerEnabledService } from "@/service/director/director-visibility-actions";

export type { DirectorVisibilityResult } from "@/service/director/director-visibility-actions";

// Client entry for the director on/off switch in scroadmin.
export async function setDirectorPickerEnabled(slug: string, enabled: boolean) {
  return setDirectorPickerEnabledService(slug, enabled);
}
