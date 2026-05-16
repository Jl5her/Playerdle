import path from "path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@playerdle/types": path.resolve(__dirname, "../../packages/types/src/index.ts"),
    },
  },
})
