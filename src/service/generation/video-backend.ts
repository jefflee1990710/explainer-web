export type ClipVideoProvider = "openrouter" | "higgsfield" | "alicloud";

// Clip video uses OpenRouter Seedance 2.0 Fast (`frame_images`: first_frame + last_frame).
// AliCloud keys stay for stills; do not steal video into wan3 first/last media.
export function clipVideoProvider(_hasAlicloudKey?: boolean): ClipVideoProvider {
  return "openrouter";
}

export function shouldSubmitClipVideoToAlicloud(hasAlicloudKey?: boolean) {
  return clipVideoProvider(hasAlicloudKey) === "alicloud";
}
