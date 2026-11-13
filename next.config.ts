import path from "node:path";
import type { NextConfig } from "next";

// Marketing files are served as static assets. Keeping them out of every
// serverless trace is what makes "Deploying outputs" take most of a Vercel build.
const PUBLIC_TRACE_EXCLUDES = [
  "public/character-looks/**/*",
  "public/landing/**/*",
  "public/hero/**/*",
  "public/showcase/**/*",
  "public/pricing/**/*",
  "public/posters/**/*",
  "public/examples/**/*",
  "public/flags/**/*",
  "public/cta/**/*",
  "public/life-templates/**/*",
  "public/life-pose-previews/**/*",
  "public/nav-tools/**/*",
  "public/home/**/*",
  "public/**/*.mp4",
  "public/**/*.webm",
];

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "*": PUBLIC_TRACE_EXCLUDES,
  },
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      // OpenCut's local Whisper worker is not bundled. Subtitle plates come from Scro.
      "onnxruntime-node": path.join(process.cwd(), "src/service/opencut/empty-module.cjs"),
      "@huggingface/transformers": path.join(process.cwd(), "src/service/opencut/transformers-stub.ts"),
    };
    // opencut-wasm's glue reads the wasm exports synchronously, and editor
    // modules call those helpers while the module is still evaluating.
    config.experiments = { ...(config.experiments ?? {}), syncWebAssembly: true };
    config.module = config.module ?? {};
    config.module.rules = config.module.rules ?? [];
    config.module.rules.push({
      test: /opencut_wasm_bg\.wasm$/,
      type: "webassembly/sync",
    });
    return config;
  },
  // Native ffmpeg binary used to concat clips into one reel.
  // AI SDK downloads URL images via a runtime require("undici").
  serverExternalPackages: ["ffmpeg-static", "undici", "@ai-sdk/provider-utils"],
  experimental: {
    webpackBuildWorker: true,
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
