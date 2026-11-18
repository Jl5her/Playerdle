import tailwindcss from "@tailwindcss/vite"
import { sentryVitePlugin } from "@sentry/vite-plugin"
import react from "@vitejs/plugin-react"
import { execSync } from "child_process"
import path from "path"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

function getGitCommitSha(): string | null {
  const envSha = process.env.GITHUB_SHA || process.env.CF_PAGES_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA
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

// Source maps are only generated and uploaded when a Sentry auth token is present
// (e.g. in the Cloudflare Pages build). They're deleted after upload so they're
// never deployed publicly.
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN
const uploadSourcemaps = Boolean(sentryAuthToken)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon-32.png", "apple-touch-icon.png", "icon.svg"],
      manifest: {
        name: "Playerdle",
        short_name: "Playerdle",
        description: "Daily player guessing puzzles for NFL, NBA, MLB, NHL, and more.",
        theme_color: "#1a1a1a",
        background_color: "#18263c",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2,ttf,json}"],
        // Index of dynamically-imported sport data chunks can be large; raise
        // the cache size cap so the whole offline shell makes it in.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
        sourcemap: false,
      },
      devOptions: {
        enabled: false,
      },
    }),
    // Must come after other plugins
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: sentryAuthToken,
      disable: !uploadSourcemaps,
      telemetry: false,
      release: {
        // Matches the `release` passed to Sentry.init at runtime
        name: buildCommitSha ?? undefined,
      },
      sourcemaps: {
        filesToDeleteAfterUpload: ["./dist/**/*.map"],
      },
    }),
  ],
  define: {
    __BUILD_COMMIT_SHA__: JSON.stringify(buildCommitSha),
    __BUILD_COMMIT_SHORT_SHA__: JSON.stringify(buildCommitShortSha),
    __BUILD_COMMIT_URL__: JSON.stringify(buildCommitUrl),
    // Tree-shake the Sentry SDK's internal debug logging (disables its `debug` option)
    __SENTRY_DEBUG__: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  server: {
    allowedHosts: true,
  },
  build: {
    // "hidden" emits .map files without a sourceMappingURL comment in the bundles
    sourcemap: uploadSourcemaps ? "hidden" : false,
    chunkSizeWarningLimit: 600, // Increased to accommodate players data (524 kB uncompressed, 50 kB gzipped)
    rollupOptions: {
      output: {
        manualChunks: id => {
          // Separate vendor libraries into their own chunks
          if (id.includes("node_modules")) {
            // Match React's own packages only — a loose "react" substring also caught
            // @sentry/react, dragging its lazy-loadable deps (Session Replay) along
            if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) {
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
