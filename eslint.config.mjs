import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Server-only modules: they reach MongoDB, Node APIs, or paid providers.
const SERVER_ONLY_IMPORTS = [
  "@/dao",
  "@/dao/*",
  "mongodb",
  "node:*",
  "@/service/canvas/execution/*",
  "@/service/canvas/use-cases/*",
  "@/service/canvas/legacy/*",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Canvas UI runs in the browser. Type-only imports are erased, so they stay allowed.
  {
    files: ["src/app/app/canvas/**/*.{ts,tsx}"],
    ignores: ["src/app/app/canvas/page.tsx", "src/app/app/canvas/**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: SERVER_ONLY_IMPORTS,
              allowTypeImports: true,
              message: "Canvas UI is client code: call a Server Action in src/presentation/actions instead.",
            },
          ],
        },
      ],
    },
  },
  // Pure canvas rules are shared with the browser, so they must not reach the server layers.
  {
    files: ["src/service/canvas/core/**/*.ts", "src/service/canvas/catalog/**/*.ts"],
    ignores: ["**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: SERVER_ONLY_IMPORTS,
              allowTypeImports: true,
              message: "core/ and catalog/ stay pure: move database or provider work to execution/ or use-cases/.",
            },
          ],
        },
      ],
    },
  },
  // Canvas models are plain types and schemas.
  {
    files: ["src/model/canvas*.ts"],
    ignores: ["**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/service/*", "@/dao", "@/dao/*", "@/presentation/*"],
              message: "src/model must not depend on service, dao, or presentation layers.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "opencut/**",
    "src/opencut/**",
    ".worktrees/**",
    "experiments/**",
  ]),
]);

export default eslintConfig;
