"use client";

import { BrandLoadingCenter } from "@/presentation/components/brand-loading-indicator";

/** Centered brand loader while the OpenCut chunk downloads. */
export function OpenCutEditorLoading() {
	return <BrandLoadingCenter size="lg" className="h-full min-h-[16rem]" />;
}
