import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // Native ffmpeg binary used to concat clips into one reel.
  // AI SDK downloads URL images via a runtime require("undici").
  serverExternalPackages: ["ffmpeg-static", "undici", "@ai-sdk/provider-utils"],
  experimental: {
    serverActions: {
      // Frame annotations (data URL) and Video-tab brand uploads (videos up to 50MB).
      bodySizeLimit: "60mb",
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "**.higgsfield.ai" },
    ],
  },
};

export default nextConfig;
