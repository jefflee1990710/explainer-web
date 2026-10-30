import { revalidatePath } from "next/cache";
import { isDirectorSlug } from "@/model/director";
import { resolveScroAdmin } from "@/service/academy/admin";
import { setBuiltinDirectorEnabled } from "@/service/director/director-visibility";

export type DirectorVisibilityResult = { ok: true } | { ok: false; error: string };

// Admin switch on /scroadmin/analytics/directors. Off hides the director from every inbox except the operator.
export async function setDirectorPickerEnabled(
  slug: string,
  enabled: boolean,
): Promise<DirectorVisibilityResult> {
  const admin = await resolveScroAdmin();
  if (!admin.ok) return { ok: false, error: "沒有權限" };
  if (!isDirectorSlug(slug)) return { ok: false, error: "未知導演" };
  try {
    await setBuiltinDirectorEnabled(slug, enabled);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "儲存失敗" };
  }
  revalidatePath("/scroadmin/analytics/directors");
  revalidatePath("/app/directors");
  return { ok: true };
}
