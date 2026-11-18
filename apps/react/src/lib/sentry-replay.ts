import { replayIntegration } from "@sentry/react"
import { redactDeep } from "./sentry-redact"

/**
 * Session Replay. Game UI text is public, so it's recorded unmasked to keep replays
 * useful; inputs stay masked, and anything under [data-sentry-mask] (the sync panel,
 * which shows the sync passphrase) is masked.
 */
export function createReplayIntegration() {
  return replayIntegration({
    maskAllText: false,
    maskAllInputs: true,
    blockAllMedia: false,
    // Replay's network timeline records request URLs; strip the sync hash/device ID
    beforeAddRecordingEvent: event => redactDeep(event),
  })
}
