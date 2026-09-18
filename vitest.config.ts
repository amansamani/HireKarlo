import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
  },
  resolve: {
    alias: { "server-only": path.resolve(path.dirname(fileURLToPath(import.meta.url)), "tests/helpers/server-only.ts"), "@": path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".") },
  },
});