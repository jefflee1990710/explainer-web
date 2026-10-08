import { requireAppUser } from "@/service/auth";
import { textStylesCollection } from "@/dao";
import { toPublicTextStyle } from "@/presentation/serialize";
import type { TextStyleDoc } from "@/model/text-style";
import { TextStyleGrid } from "@/presentation/components/app/text-styles/text-style-grid";
import { TextStyleSystemGrid } from "@/presentation/components/app/text-styles/text-style-system-card";
import { TextStylesHeader } from "@/presentation/components/app/text-styles/text-styles-header";

export default async function TextStylesPage() {
  const user = await requireAppUser();
  const styles = await textStylesCollection();
  const docs = (await styles
    .find({ clerkUserId: user.clerkUserId })
    .sort({ updatedAt: -1 })
    .toArray()) as TextStyleDoc[];

  return (
    <div>
      <TextStylesHeader />
      <div className="mt-8">
        <TextStyleSystemGrid />
      </div>
      <div className="mt-8">
        <TextStyleGrid styles={docs.map(toPublicTextStyle)} />
      </div>
    </div>
  );
}
