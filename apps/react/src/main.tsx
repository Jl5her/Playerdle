import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { registerSW } from "virtual:pwa-register"
import "@fortawesome/fontawesome-free/css/all.min.css"
import "./index.css"
import App from "./App.tsx"
import { initAnalytics } from "./lib/analytics.ts"
import { initSentry, sentryRootErrorHandlers } from "./lib/sentry.ts"
import { ErrorBoundary } from "@/shared/components/error-boundary"

initSentry()
initAnalytics()
registerSW({ immediate: true })

createRoot(document.getElementById("root")!, sentryRootErrorHandlers).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
)
