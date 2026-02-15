import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { execSync } from "child_process"
import path from "path"
import { defineConfig } from "vite"

function getGitCommitSha(): string | null {
  const envSha = process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA
  if (envSha) return envSha

  try {
    return execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim()
  } catch {
    return null
  }
}

const buildCommitSha = getGitCommitSha()
const buildCommitShortSha = buildCommitSha ? buildCommitSha.slice(0, 7) : null
const githubRepo = process.env.GITHUB_REPOSITORY
const buildCommitUrl =
  buildCommitSha && githubRepo ? `https://github.com/${githubRepo}/commit/${buildCommitSha}` : null

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __BUILD_COMMIT_SHA__: JSON.stringify(buildCommitSha),
    __BUILD_COMMIT_SHORT_SHA__: JSON.stringify(buildCommitShortSha),
    __BUILD_COMMIT_URL__: JSON.stringify(buildCommitUrl),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    allowedHosts: true,
  },
  build: {
    chunkSizeWarningLimit: 600, // Increased to accommodate players data (524 kB uncompressed, 50 kB gzipped)
    rollupOptions: {
      output: {
        manualChunks: id => {
          // Separate vendor libraries into their own chunks
          if (id.includes("node_modules")) {
            if (id.includes("react") || id.includes("react-dom")) {
              return "vendor-react"
            }
            if (id.includes("fuse.js")) {
              return "vendor-fuse"
            }
            if (id.includes("canvas-confetti")) {
              return "vendor-confetti"
            }
          }
        },
      },
    },
  },
})
