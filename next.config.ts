import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
