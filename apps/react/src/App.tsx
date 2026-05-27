import clsx from "clsx"
import { lazy, Suspense, useEffect, useRef, useState } from "react"
import WelcomeScreen, { hasSeenWelcome } from "@/shared/components/welcome-screen"
import { Navigate, Route, Routes, useParams } from "react-router-dom"
import { parseDateKey } from "@/shared/utils/calendar-date"
import { formatLongDate } from "@/shared/utils/time"
import { usePanelStack } from "@/shared/hooks/use-panel-stack"
import { isJourneyLeague } from "@/games/journeyman/utils/journey-daily"
import { Header } from "@/games/playerdle/components"
import { GameGuideContent, type GuideMode } from "@/games/playerdle/modals/game-guide-content"
import { StatsContent } from "@/games/playerdle/modals/stats-content"
import type { StatsModalConfig } from "@/games/playerdle/screens/game"
import {
  getSportMetaById,
  loadSportConfig,
  resolveSportConfig,
  type SportConfig,
} from "@/games/playerdle/sports"
import { Panel, PWAUpdateToast } from "@/shared/components"
import { PanelStackContext } from "@/shared/hooks/use-panel-context"
import { useViewportHeight } from "@/shared/hooks/use-viewport-height"
import { startAutoSync } from "@/shared/utils/sync"
import { trackPanelOpened } from "@/lib/analytics"

const Game = lazy(() => import("@/games/playerdle/screens/game"))
const ColorsShell = lazy(() => import("@/games/statehue/screens/colors-shell"))
const ColorsCalendar = lazy(() => import("@/games/statehue/screens/colors-calendar"))
const PlayerCalendar = lazy(() => import("@/games/playerdle/screens/player-calendar"))
const JourneyShell = lazy(() => import("@/games/journeyman/screens/journey-shell"))
const JourneyCalendar = lazy(() => import("@/games/journeyman/screens/journey-calendar"))
const TeamColorsKey = lazy(() =>
  import("@/games/playerdle/screens/team-colors-key").then(m => ({ default: m.TeamColorsKey })),
)

const TUTORIAL_SEEN_KEY = "playerdle-tutorial-seen-v2"
const FANATIC_VARIANT_ID = "fanatic"

type AppPanel = "guide" | "stats" | "calendar" | "archive-guide"

interface AppShellProps {
  sportId: SportConfig["id"]
  variantId?: string
}

function HelpRedirect() {
  const { sport } = useParams<{ sport?: string }>()
  const to = sport ? `/${sport}?m=help` : `/?m=help`
  return <Navigate to={to} replace />
}

function getSportIdFromRouteParam(sport?: string): SportConfig["id"] | null {
  if (!sport) return "nfl"
  const normalized = sport.toLowerCase()
  if (normalized === "mlb") return "mlb"
  if (normalized === "nhl") return "nhl"
  if (normalized === "nba") return "nba"
  return null
}

/** Redirects /:sport/daily and /:sport/arcade → /:sport */
function SportModeRedirect() {
  const { sport } = useParams<{ sport?: string }>()
  return <Navigate to={sport ? `/${sport}` : "/"} replace />
}

/** Redirects /:sport/arcade/fanatic → /:sport/fanatic */
function SportFanaticModeRedirect() {
  const { sport } = useParams<{ sport?: string }>()
  return <Navigate to={sport ? `/${sport}/${FANATIC_VARIANT_ID}` : `/${FANATIC_VARIANT_ID}`} replace />
}

/** Redirects /journeyman/:league/daily and /journeyman/:league/arcade → /journeyman/:league */
function JourneyLeagueRedirect() {
  const { league } = useParams<{ league?: string }>()
  return <Navigate to={`/journeyman/${league ?? "nfl"}`} replace />
}

function getTutorialStorageKey(sportId: string, variantId?: string): string {
  return `${TUTORIAL_SEEN_KEY}:${sportId}:${variantId ?? "classic"}`
}

function AppShell({ sportId, variantId }: AppShellProps) {
  const sportMeta = getSportMetaById(sportId)
  const [dailyKey, setDailyKey] = useState(0)
  const [sport, setSport] = useState<SportConfig | null>(null)
  const [sportLoadFailed, setSportLoadFailed] = useState(false)
  const [statsModalConfig, setStatsModalConfig] = useState<StatsModalConfig>({ mode: "daily" })
  const [gameGuideMode, setGameGuideMode] = useState<GuideMode>("manual")
  const panels = usePanelStack<AppPanel>()
  const [calendarHistoryVersion, setCalendarHistoryVersion] = useState(0)
  const [archiveDateKey, setArchiveDateKey] = useState<string | null>(null)
  const isArchive = !!archiveDateKey
  const sportCacheRef = useRef<Partial<Record<SportConfig["id"], SportConfig>>>({})
  const tutorialShownRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    let isMounted = true
    setSportLoadFailed(false)
    const cachedSport = sportCacheRef.current[sportId]

    if (cachedSport) {
      setSport(cachedSport)
      return () => {
        isMounted = false
      }
    }

    loadSportConfig(sportId)
      .then(config => {
        if (isMounted) {
          sportCacheRef.current[sportId] = config
          setSport(config)
        }
      })
      .catch(() => {
        if (isMounted) setSportLoadFailed(true)
      })

    return () => {
      isMounted = false
    }
  }, [sportId])

  const hasVariant = sport?.variants?.some(variant => variant.id === variantId)
  const activeVariantId = hasVariant ? variantId : undefined
  const activeSport = sport ? resolveSportConfig(sport, activeVariantId) : null

  useEffect(() => {
    const leagueName = (activeSport?.displayName ?? sportMeta.displayName).toUpperCase()
    document.title = `Playerdle ${leagueName}`
  }, [activeSport, sportMeta.displayName])

  // Show onboarding tutorial the first time a player visits this sport/variant
  useEffect(() => {
    if (!sport) return
    const tutorialKey = getTutorialStorageKey(sportId, activeVariantId)
    if (tutorialShownRef.current.has(tutorialKey)) return
    tutorialShownRef.current.add(tutorialKey)
    if (localStorage.getItem(tutorialKey)) return

    setGameGuideMode("onboarding")
    panels.push("guide")
    trackPanelOpened({
      panel: "guide",
      game: "playerdle",
      sport: sportId,
      variant: activeVariantId,
      mode: "daily",
      is_onboarding: true,
    })
    // panels is intentionally omitted — we only want this to fire once per sport/variant load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport, sportId, activeVariantId])

  function handleShowTutorial() {
    if (panels.isAnyOpen) {
      return
    }

    setGameGuideMode("manual")
    panels.push("guide")
    trackPanelOpened({
      panel: "guide",
      game: "playerdle",
      sport: sportId,
      variant: activeVariantId,
      mode: "daily",
    })
  }

  function handleShowStats() {
    if (panels.isOpen("stats")) {
      return
    }

    setStatsModalConfig({
      mode: "daily",
      showStatsOnly: true,
      includeShareButton: false,
      variantId: activeVariantId,
    })
    panels.push("stats")
    trackPanelOpened({
      panel: "stats",
      game: "playerdle",
      sport: sportId,
      variant: activeVariantId,
      mode: "daily",
    })
  }

  function handlePlayArchive(dateKey: string) {
    setArchiveDateKey(dateKey)
    panels.clear()
    setCalendarHistoryVersion(v => v + 1)
  }

  function exitArchive() {
    setArchiveDateKey(null)
    panels.clear()
    panels.push("calendar")
    setCalendarHistoryVersion(v => v + 1)
  }

  /** Called by the Game component's "Back to Today's" button after an arcade session. */
  function handleBackToToday() {
    setArchiveDateKey(null)
    setDailyKey(k => k + 1)
    panels.clear()
  }

  if (sportLoadFailed && !sport) {
    return (
      <div className="app-viewport flex items-center justify-center p-8 text-center">
        <p className="text-primary-500 dark:text-primary-400 text-sm">
          Failed to load game data. Please refresh the page.
        </p>
      </div>
    )
  }

  return (
    <PanelStackContext.Provider value={panels}>
      <div className="app-viewport flex min-h-0 flex-col overflow-hidden">
        <Header
          onShowTutorial={
            !panels.isAnyOpen
              ? isArchive
                ? () => panels.push("archive-guide")
                : handleShowTutorial
              : undefined
          }
          onShowStats={!panels.isAnyOpen && !isArchive ? handleShowStats : undefined}
          onBack={isArchive ? exitArchive : undefined}
          sport={activeSport ?? sportMeta}
          subtitle={archiveDateKey ? formatLongDate(parseDateKey(archiveDateKey)) : undefined}
        />
        <div className="flex flex-1 min-h-0 overflow-hidden pt-[3.75rem]">
          <Suspense fallback={<div className="flex-1 min-h-0" />}>
            {activeSport && (
              <div className="relative flex flex-1 min-h-0 flex-col overflow-hidden">
                <div
                  className={clsx(
                    "crossfade-panel h-full min-h-0 flex flex-1 overflow-hidden",
                    panels.isAnyOpen ? "crossfade-inactive" : "crossfade-active",
                  )}
                >
                  {isArchive ? (
                    <Game
                      key={`archive:${activeSport.id}:${archiveDateKey}`}
                      mode="daily"
                      sport={activeSport}
                      variantId={activeVariantId}
                      archiveDateKey={archiveDateKey!}
                    />
                  ) : (
                    <Game
                      key={`daily-${dailyKey}`}
                      mode="daily"
                      sport={activeSport}
                      variantId={activeVariantId}
                      onBackToToday={handleBackToToday}
                    />
                  )}
                </div>
                <GameGuideContent
                  id="guide"
                  tutorialKey={gameGuideMode === "onboarding" ? getTutorialStorageKey(sportId, activeVariantId) : undefined}
                  sport={activeSport}
                  mode={gameGuideMode}
                  onOpenCalendar={() => panels.push("calendar")}
                />
                <Panel open={panels.isOpen("stats")} onClose={panels.pop} title={statsModalConfig.showStatsOnly ? "Statistics" : "Results"} layout="scroll">
                  <StatsContent
                    {...statsModalConfig}
                    sport={activeSport}
                    variantId={activeVariantId}
                    onViewArchive={() => panels.push("calendar")}
                  />
                </Panel>
                <GameGuideContent
                  id="archive-guide"
                  sport={activeSport}
                  mode="manual"
                />
                <Suspense fallback={<div className="flex-1 min-h-0" />}>
                  <PlayerCalendar
                    id="calendar"
                    panel
                    variantId={activeVariantId}
                    onPlayArchive={handlePlayArchive}
                    historyVersion={calendarHistoryVersion}
                  />
                </Suspense>
              </div>
            )}
          </Suspense>
        </div>
      </div>
    </PanelStackContext.Provider>
  )
}

interface SportRouteProps {
  variantId?: string
}

function SportRoute({ variantId }: SportRouteProps) {
  const { sport } = useParams<{ sport?: string }>()
  const sportId = getSportIdFromRouteParam(sport)

  if (!sportId) {
    return (
      <Navigate
        to="/"
        replace
      />
    )
  }

  return (
    <AppShell
      sportId={sportId}
      variantId={variantId}
    />
  )
}

function JourneyRoute() {
  const { league } = useParams<{ league?: string }>()
  if (!league || !isJourneyLeague(league)) {
    return (
      <Navigate
        to="/journeyman/nfl"
        replace
      />
    )
  }
  return (
    <JourneyShell
      league={league}
    />
  )
}

function JourneyCalendarRoute() {
  const { league } = useParams<{ league?: string }>()
  if (!league || !isJourneyLeague(league)) {
    return (
      <Navigate
        to="/journeyman/nfl/calendar"
        replace
      />
    )
  }
  return <JourneyCalendar league={league} />
}

function App() {
  useViewportHeight()
  useEffect(() => startAutoSync(), [])
  const [showWelcome, setShowWelcome] = useState(() => !hasSeenWelcome())
  return (
    <>
    <PWAUpdateToast />
    {showWelcome && <WelcomeScreen onDismiss={() => setShowWelcome(false)} />}
    <Routes>
      {/* ── NFL Playerdle (default sport, no prefix) ── */}
      <Route
        path="/"
        element={<SportRoute />}
      />
      <Route
        path="/help"
        element={<HelpRedirect />}
      />
      {/* Backwards-compat redirects for old /daily and /arcade URLs */}
      <Route
        path="/daily"
        element={<Navigate to="/" replace />}
      />
      <Route
        path="/arcade"
        element={<Navigate to="/" replace />}
      />
      <Route
        path="/fanatic"
        element={
          <SportRoute
            variantId={FANATIC_VARIANT_ID}
          />
        }
      />
      {/* Backwards-compat redirect for /arcade/fanatic */}
      <Route
        path="/arcade/fanatic"
        element={<Navigate to={`/${FANATIC_VARIANT_ID}`} replace />}
      />
      <Route path="/team-colors-key" element={<Navigate to="/team-colors-key/nfl" replace />} />
      <Route
        path="/team-colors-key/:sport"
        element={
          <Suspense fallback={<div className="app-viewport" />}>
            <TeamColorsKey />
          </Suspense>
        }
      />
      {/* ── Other sports ── */}
      <Route
        path="/:sport"
        element={<SportRoute />}
      />
      <Route
        path="/:sport/help"
        element={<HelpRedirect />}
      />
      {/* Backwards-compat redirects for old /:sport/daily and /:sport/arcade URLs */}
      <Route
        path="/:sport/daily"
        element={<SportModeRedirect />}
      />
      <Route
        path="/:sport/arcade"
        element={<SportModeRedirect />}
      />
      <Route
        path="/:sport/fanatic"
        element={
          <SportRoute
            variantId={FANATIC_VARIANT_ID}
          />
        }
      />
      {/* Backwards-compat redirect for /:sport/arcade/fanatic */}
      <Route
        path="/:sport/arcade/fanatic"
        element={<SportFanaticModeRedirect />}
      />
      {/* ── Statehue. /geo and /palette redirect for backwards compatibility. ── */}
      <Route
        path="/statehue"
        element={
          <Suspense fallback={<div className="app-viewport" />}>
            <ColorsShell />
          </Suspense>
        }
      />
      <Route
        path="/geo"
        element={<Navigate to="/statehue" replace />}
      />
      <Route
        path="/palette"
        element={<Navigate to="/statehue" replace />}
      />
      {/* Backwards-compat redirects for old /statehue/daily and /statehue/arcade URLs */}
      <Route
        path="/statehue/daily"
        element={<Navigate to="/statehue" replace />}
      />
      <Route
        path="/statehue/arcade"
        element={<Navigate to="/statehue" replace />}
      />
      <Route
        path="/statehue/calendar"
        element={
          <Suspense fallback={<div className="app-viewport" />}>
            <ColorsCalendar />
          </Suspense>
        }
      />
      <Route
        path="/statehue/collegiate"
        element={
          <Suspense fallback={<div className="app-viewport" />}>
            <ColorsShell variant="collegiate" />
          </Suspense>
        }
      />
      {/* Backwards-compat redirect for old /statehue/collegiate/arcade URL */}
      <Route
        path="/statehue/collegiate/arcade"
        element={<Navigate to="/statehue/collegiate" replace />}
      />
      <Route
        path="/statehue/collegiate/calendar"
        element={
          <Suspense fallback={<div className="app-viewport" />}>
            <ColorsCalendar variant="collegiate" />
          </Suspense>
        }
      />
      <Route
        path="/palette/states"
        element={<Navigate to="/statehue" replace />}
      />
      {/* Redirects for old /palette/states/* URLs — point directly to final destination */}
      <Route
        path="/palette/states/daily"
        element={<Navigate to="/statehue" replace />}
      />
      <Route
        path="/palette/states/arcade"
        element={<Navigate to="/statehue" replace />}
      />
      <Route
        path="/palette/states/calendar"
        element={<Navigate to="/statehue/calendar" replace />}
      />
      {/* ── Journeyman lives under /journeyman/:league ──
          Plain /journeyman/* paths default to NFL for backwards compatibility.
          Old /daily and /arcade suffixes redirect to the clean league URL. */}
      <Route
        path="/journeyman"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />
      <Route
        path="/journeyman/daily"
        element={
          <Navigate
            to="/journeyman/nfl"
            replace
          />
        }
      />
      <Route
        path="/journeyman/arcade"
        element={
          <Navigate
            to="/journeyman/nfl"
            replace
          />
        }
      />
      <Route
        path="/journeyman/calendar"
        element={
          <Navigate
            to="/journeyman/nfl/calendar"
            replace
          />
        }
      />
      <Route
        path="/journeyman/:league"
        element={
          <Suspense fallback={<div className="app-viewport" />}>
            <JourneyRoute />
          </Suspense>
        }
      />
      {/* Backwards-compat redirects for old /journeyman/:league/daily and /arcade URLs */}
      <Route
        path="/journeyman/:league/daily"
        element={<JourneyLeagueRedirect />}
      />
      <Route
        path="/journeyman/:league/arcade"
        element={<JourneyLeagueRedirect />}
      />
      <Route
        path="/journeyman/:league/calendar"
        element={
          <Suspense fallback={<div className="app-viewport" />}>
            <JourneyCalendarRoute />
          </Suspense>
        }
      />
      <Route
        path="/palette/journey"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />
      <Route
        path="/palette/journey/daily"
        element={
          <Navigate
            to="/journeyman/nfl"
            replace
          />
        }
      />
      <Route
        path="/palette/journey/arcade"
        element={
          <Navigate
            to="/journeyman/nfl"
            replace
          />
        }
      />
      <Route
        path="/palette/journey/calendar"
        element={
          <Navigate
            to="/journeyman/nfl/calendar"
            replace
          />
        }
      />
      {/* ── Calendar routes ── */}
      <Route
        path="/calendar"
        element={
          <Suspense fallback={<div className="app-viewport" />}>
            <PlayerCalendar />
          </Suspense>
        }
      />
      <Route
        path="/fanatic/calendar"
        element={
          <Suspense fallback={<div className="app-viewport" />}>
            <PlayerCalendar variantId={FANATIC_VARIANT_ID} />
          </Suspense>
        }
      />
      <Route
        path="/:sport/calendar"
        element={
          <Suspense fallback={<div className="app-viewport" />}>
            <PlayerCalendar />
          </Suspense>
        }
      />
      <Route
        path="/:sport/fanatic/calendar"
        element={
          <Suspense fallback={<div className="app-viewport" />}>
            <PlayerCalendar variantId={FANATIC_VARIANT_ID} />
          </Suspense>
        }
      />
      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />
    </Routes>
    </>
  )
}

export default App
