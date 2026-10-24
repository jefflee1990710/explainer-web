import type { MetadataRoute } from "next";

// Web App Manifest for mobile home-screen shortcuts, PWA metadata, and search brand signals.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Scro — AI Influencer & Explainer Video Studio",
    short_name: "Scro",
    description:
      "Build a virtual KOL with locked face, custom wardrobe, cloned voice across 21 languages, Life feed photos, and AI-directed short videos.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0c10",
    theme_color: "#12141c",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
