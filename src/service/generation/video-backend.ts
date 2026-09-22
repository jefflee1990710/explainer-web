export type ClipVideoProvider = "higgsfield" | "alicloud";

// Clip video is Higgsfield MiniMax H3 I2V (`image_url` + `end_image_url`).
// AliCloud keys stay for stills; do not steal video into wan3 first/last media.
export function clipVideoProvider(_hasAlicloudKey?: boolean): ClipVideoProvider {
  return "higgsfield";
}

export function shouldSubmitClipVideoToAlicloud(hasAlicloudKey?: boolean) {
  return clipVideoProvider(hasAlicloudKey) === "alicloud";
}
