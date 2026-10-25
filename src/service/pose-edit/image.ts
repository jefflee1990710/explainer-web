export const POSE_EDIT_MAX_BYTES = 8 * 1024 * 1024;

export type PoseEditImageType = "image/jpeg" | "image/png" | "image/webp";

const JPEG = [0xff, 0xd8, 0xff] as const;
const PNG = [0x89, 0x50, 0x4e, 0x47] as const;
const RIFF = [0x52, 0x49, 0x46, 0x46] as const;
const WEBP = [0x57, 0x45, 0x42, 0x50] as const;

function hasMagic(bytes: Uint8Array, magic: readonly number[], offset = 0) {
  if (bytes.length < offset + magic.length) return false;
  for (let index = 0; index < magic.length; index += 1) {
    if (bytes[offset + index] !== magic[index]) return false;
  }
  return true;
}

// jpeg is FF D8 FF, png is 89 50 4E 47, webp is RIFF plus WEBP at offset 8.
export function sniffPoseEditImage(bytes: Uint8Array): PoseEditImageType | null {
  if (hasMagic(bytes, JPEG)) return "image/jpeg";
  if (hasMagic(bytes, PNG)) return "image/png";
  if (hasMagic(bytes, RIFF) && hasMagic(bytes, WEBP, 8)) return "image/webp";
  return null;
}
