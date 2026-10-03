import { requireAppUser } from "@/service/auth";
import { listSelectableStyles } from "@/service/style/list";
import { StyleGrid } from "@/presentation/components/app/styles/style-grid";
import { StylesHeader } from "@/presentation/components/app/styles/styles-header";

export default async function StylesPage() {
  const user = await requireAppUser();
  const { system, mine } = await listSelectableStyles(user.clerkUserId);

  return (
    <div>
      <StylesHeader />
      <div className="mt-8">
        <StyleGrid section="system" styles={system} />
      </div>
      <div className="mt-8">
        <StyleGrid section="mine" styles={mine} />
      </div>
    </div>
  );
}
