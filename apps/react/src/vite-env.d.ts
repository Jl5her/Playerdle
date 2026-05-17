/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_POSTHOG_KEY: string
}

declare const __BUILD_COMMIT_SHA__: string | null
declare const __BUILD_COMMIT_SHORT_SHA__: string | null
declare const __BUILD_COMMIT_URL__: string | null
