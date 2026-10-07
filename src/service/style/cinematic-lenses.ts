import type { Style } from "@/service/style/types";

// Primes a Cinematic realistic clip may use. The director picks from the shot.
export const CINEMATIC_LENS_KIT = "24mm f/1.2, 35mm f/1.4, 50mm f/1.4, 80mm f/1.4";

export const CINEMATIC_LENS_RULE = [
  "Lens: every clip uses one prime from this kit only: 24mm f/1.2, 35mm f/1.4, 50mm f/1.4, 80mm f/1.4.",
  "Choose from the content. 24mm f/1.2 is a wide place. 35mm f/1.4 is a natural full body. 50mm f/1.4 is a person. 80mm f/1.4 is a face or a detail.",
  "The start still and the end still may use different lenses. A push can go from 35mm f/1.4 to 80mm f/1.4. A pull can go from 50mm f/1.4 back to 24mm f/1.2.",
  "Write both lenses into the Camera line and into the motion. One lens change per clip, slow, on a gimbal. No handheld shake, no whip, and no snap zoom.",
].join(" ");

const CINEMATIC_LOOK =
  "photorealistic cinematic still: natural skin and fabric detail, believable lighting with a soft key and gentle fill, shallow depth of field, filmic colour grading, no illustration. The lens is exactly one of 24mm f/1.2, 35mm f/1.4, 50mm f/1.4, or 80mm f/1.4, the lens named in the scene.";

const CINEMATIC_MOTION =
  "Gimbal-smooth and slow. A clip may hold one prime, or move from one prime to another, such as 35mm f/1.4 to 80mm f/1.4, or 50mm f/1.4 back to 24mm f/1.2. No handheld shake, no whip, no snap zoom.";

// Catalog realistic still says "35mm" from the first seed. This override wins.
export function applyCinematicLenses(style: Style): Style {
  if (style.id !== "realistic") return style;
  return {
    ...style,
    description: "真實光影。每段在 24mm f/1.2、35mm f/1.4、50mm f/1.4、80mm f/1.4 裡選鏡頭。",
    look: CINEMATIC_LOOK,
    motion: CINEMATIC_MOTION,
  };
}
