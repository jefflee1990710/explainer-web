import path from "node:path";
import type { NextConfig } from "next";

const opencutSrc = path.join(process.cwd(), "opencut/apps/web/src");
const opencutModules = [
  path.join(process.cwd(), "opencut/apps/web/node_modules"),
  path.join(process.cwd(), "opencut/node_modules"),
];

// OpenCut source uses `@/` for its own src. Rewrite that only for files inside opencut/.
class OpenCutAliasPlugin {
  apply(compiler: { hooks: { normalModuleFactory: { tap: (name: string, fn: (nmf: OpenCutFactory) => void) => void } } }) {
    compiler.hooks.normalModuleFactory.tap("OpenCutAliasPlugin", (factory) => {
      factory.hooks.beforeResolve.tap("OpenCutAliasPlugin", (data) => {
        if (!data?.context?.includes(`${path.sep}opencut${path.sep}apps${path.sep}web${path.sep}`)) return;
        if (data.request.startsWith("@/")) {
          data.request = path.join(opencutSrc, data.request.slice(2));
        } else if (data.request === "mediabunny" || data.request.startsWith("mediabunny/")) {
          data.request = path.join(opencutModules[0], data.request);
        }
      });
    });
  }
}

type OpenCutFactory = {
  hooks: { beforeResolve: { tap: (name: string, fn: (data: { context?: string; request: string } | undefined) => void) => void } };
};

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
    resolveAlias: {
      "@opencut-inline": "./opencut/apps/web/src/embed/scro-inline-editor.tsx",
    },
  },
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@opencut-inline": path.join(opencutSrc, "embed/scro-inline-editor.tsx"),
      "onnxruntime-node": path.join(process.cwd(), "src/service/opencut/empty-module.cjs"),
      "@huggingface/transformers": path.join(process.cwd(), "src/service/opencut/transformers-stub.ts"),
    };
    const modules = Array.isArray(config.resolve.modules) ? config.resolve.modules : ["node_modules"];
    config.resolve.modules = [...modules, ...opencutModules];
    config.plugins = config.plugins ?? [];
    config.plugins.push(new OpenCutAliasPlugin());
    config.experiments = { ...(config.experiments ?? {}), asyncWebAssembly: true };
    config.module = config.module ?? {};
    config.module.rules = config.module.rules ?? [];
    config.module.rules.push({
      test: /opencut_wasm_bg\.wasm$/,
      type: "webassembly/async",
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
