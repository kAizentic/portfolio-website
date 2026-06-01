import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
  test: {
    include: ["**/__tests__/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/.next/**", "**/e2e/**"],
    environment: "node",
    globals: false,
  },
});
