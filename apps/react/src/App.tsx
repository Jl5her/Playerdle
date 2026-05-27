import { faMap } from "@fortawesome/free-solid-svg-icons"
import clsx from "clsx"
import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react"
import WelcomeScreen, { hasSeenWelcome } from "@/shared/components/welcome-screen"
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom"
import { parseDateKey } from "@/shared/utils/calendar-date"
import { formatLongDate } from "@/shared/utils/time"
import { usePanelStack } from "@/shared/hooks/use-panel-stack"
import {
  hasPlayedJourneyDailyToday,
  isJourneyLeague,
  type JourneyLeague,
} from "@/games/journeyman/utils/journey-daily"
import { Header } from "@/games/playerdle/components"
import { GameGuideContent, type GuideMode } from "@/games/playerdle/modals/game-guide-content"
import { StatsContent } from "@/games/playerdle/modals/stats-content"
import { MainMenu } from "@/games/playerdle/screens"
import type { StatsModalConfig } from "@/games/playerdle/screens/game"
import type { ExtraGame, NavigationOptions, Screen } from "@/games/playerdle/screens/main-menu"
import {
  getAllSportMeta,
  getSportIcon,
  getSportMetaById,
  loadSportConfig,
  resolveSportConfig,
  type SportConfig,
} from "@/games/playerdle/sports"
import { type FooterTab, LeagueFooter, Panel, PWAUpdateToast } from "@/shared/components"
import { PanelStackContext } from "@/shared/hooks/use-panel-context"
import { useViewportHeight } from "@/shared/hooks/use-viewport-height"
import { getIsSyncing, startAutoSync, subscribeSyncState, waitForSync } from "@/shared/utils/sync"
import { trackPanelOpened } from "@/lib/analytics"

const Game = lazy(() => import("@/games/playerdle/screens/game"))
const ColorsShell = lazy(() => import("@/games/statehue/screens/colors-shell"))
const ColorsCalendar = lazy(() => import("@/games/statehue/screens/colors-calendar"))
const PlayerCalendar = lazy(() => import("@/games/playerdle/screens/player-calendar"))
const PaletteHub = lazy(() => import("@/games/statehue/screens/palette-hub"))
const JourneyShell = lazy(() => import("@/games/journeyman/screens/journey-shell"))
const JourneyCalendar = lazy(() => import("@/games/journeyman/screens/journey-calendar"))
const TeamColorsKey = lazy(() =>
  import("@/games/playerdle/screens/team-colors-key").then(m => ({ default: m.TeamColorsKey })),
)

const TUTORIAL_SEEN_KEY = "playerdle-tutorial-seen-v2"
const FANATIC_VARIANT_ID = "fanatic"

type AppPanel = "guide" | "stats" | "calendar" | "archive-guide"
type ActiveScreen = "menu" | "daily" | "arcade"

interface AppShellProps {
  sportId: SportConfig["id"]
  screen?: ActiveScreen
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

/** Builds the root URL for a sport (with optional fanatic variant). No /daily or /arcade segments. */
function buildPath(sportId: SportConfig["id"], variantId?: string): string {
  const prefix = sportId === "nfl" ? "" : `/${sportId}`
  if (variantId === FANATIC_VARIANT_ID) {
    return `${prefix}/${FANATIC_VARIANT_ID}`
  }
  return prefix || "/"
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

function AppShell({ sportId, screen: initialScreen = "menu", variantId }: AppShellProps) {
  const navigate = useNavigate()
  const sportMeta = getSportMetaById(sportId)
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>(initialScreen)
  const [gameKey, setGameKey] = useState(0)
  const [sport, setSport] = useState<SportConfig | null>(null)
  const [sportLoadFailed, setSportLoadFailed] = useState(false)
  const [statsModalConfig, setStatsModalConfig] = useState<StatsModalConfig>({ mode: "daily" })
  const [gameGuideMode, setGameGuideMode] = useState<GuideMode>("manual")
  const panels = usePanelStack<AppPanel>()
  const [calendarHistoryVersion, setCalendarHistoryVersion] = useState(0)
  const [archiveDateKey, setArchiveDateKey] = useState<string | null>(null)
  const isArchive = !!archiveDateKey
  const sportCacheRef = useRef<Partial<Record<SportConfig["id"], SportConfig>>>({})
  const isSyncing = useSyncExternalStore(subscribeSyncState, getIsSyncing, () => false)
  const [waitingForSync, setWaitingForSync] = useState(false)

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

  const isGame = activeScreen === "daily" || activeScreen === "arcade"
  const isMenuView = activeScreen === "menu"

  function handleShowTutorial() {
    if (activeScreen !== "daily" || panels.isAnyOpen) {
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

  function goToMenu() {
    if (activeVariantId) {
      // Fanatic variant: navigate back to the parent sport menu
      navigate(buildPath(sportId))
    } else {
      setActiveScreen("menu")
      panels.clear()
    }
  }

  function handleShowStats() {
    if (activeScreen !== "daily" || panels.isOpen("stats")) {
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

  function handleSelectSport(nextSportId: SportConfig["id"]) {
    navigate(buildPath(nextSportId))
    panels.clear()
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

  async function handleNavigate(target: Screen, options?: NavigationOptions) {
    if ((target === "daily" || target === "arcade") && isSyncing) {
      setWaitingForSync(true)
      await waitForSync()
      setWaitingForSync(false)
    }

    const nextVariantId = options?.variantId

    // Variant switch (e.g. classic → fanatic) still navigates to the variant URL
    if (nextVariantId !== activeVariantId) {
      navigate(buildPath(sportId, nextVariantId))
      return
    }

    if (target === "daily") {
      const seenKey = getTutorialStorageKey(sportId, nextVariantId)
      const shouldShowOnboarding = !localStorage.getItem(seenKey)
      if (shouldShowOnboarding) {
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
      }
      setActiveScreen("daily")
      return
    }

    if (target === "arcade") {
      setGameKey(k => k + 1)
      setActiveScreen("arcade")
      return
    }

    if (target === "stats") {
      setStatsModalConfig({
        mode: "daily",
        showStatsOnly: false,
        variantId: nextVariantId,
      })
      setActiveScreen("daily")
      panels.push("stats")
      return
    }

    if (target === "calendar") {
      const sportPrefix = sportId === "nfl" ? "" : `/${sportId}`
      const variantSeg = activeVariantId === FANATIC_VARIANT_ID ? `/${FANATIC_VARIANT_ID}` : ""
      navigate(`${sportPrefix}${variantSeg}/calendar`)
      return
    }
  }

  const journeymanLeague: JourneyLeague | null = isJourneyLeague(sportId) ? sportId : null
  const extraGames: ExtraGame[] | undefined = journeymanLeague
    ? [
        {
          label: "Journeyman",
          played: hasPlayedJourneyDailyToday(journeymanLeague),
          onPlayDaily: () => navigate(`/journeyman/${journeymanLeague}`),
          onPlayArcade: () => navigate(`/journeyman/${journeymanLeague}`),
          onShowStats: () =>
            navigate(`/journeyman/${journeymanLeague}`, {
              state: { showStats: true },
            }),
        },
      ]
    : undefined

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
    <>
      {isMenuView && (
        <div className="app-viewport pb-11 flex flex-col">
          {waitingForSync && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary-50/70 dark:bg-primary-900/70">
              <div className="w-9 h-9 rounded-full border-[3px] border-primary-200 border-t-primary-600 dark:border-primary-700 dark:border-t-primary-200 animate-spin" />
            </div>
          )}
          <MainMenu
            onNavigate={handleNavigate}
            sport={sport ?? sportMeta}
            guideSport={activeSport ?? sport}
            extraGames={extraGames}
            journeyLeague={journeymanLeague}
          />
        </div>
      )}
      {isGame && (
        <PanelStackContext.Provider value={panels}>
        <div className="app-viewport flex min-h-0 flex-col overflow-hidden">
          <Header
            onShowTutorial={
              activeScreen === "daily" && !panels.isAnyOpen
                ? isArchive
                  ? () => panels.push("archive-guide")
                  : handleShowTutorial
                : undefined
            }
            onShowStats={
              activeScreen === "daily" && !panels.isAnyOpen && !isArchive ? handleShowStats : undefined
            }
            onBack={isArchive ? exitArchive : goToMenu}
            sport={activeSport ?? sportMeta}
            subtitle={archiveDateKey ? formatLongDate(parseDateKey(archiveDateKey)) : undefined}
          />
          <div className="flex flex-1 min-h-0 overflow-hidden pt-[3.75rem]">
            <Suspense fallback={<div className="flex-1 min-h-0" />}>
              {activeScreen === "daily" && activeSport && (
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
                        key="daily"
                        mode="daily"
                        sport={activeSport}
                        variantId={activeVariantId}
                        onBackToToday={() => setActiveScreen("daily")}
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
              {activeScreen === "arcade" && activeSport && (
                <Game
                  key={`arcade-${gameKey}`}
                  mode="arcade"
                  sport={activeSport}
                  variantId={activeVariantId}
                  onBackToToday={() => setActiveScreen("daily")}
                />
              )}
            </Suspense>
          </div>
        </div>
        </PanelStackContext.Provider>
      )}
      {isMenuView && (
        <LeagueFooter
          tabs={[
            ...getAllSportMeta().map<FooterTab>(sport => ({
              id: sport.id,
              icon: getSportIcon(sport.id),
              label: sport.displayName,
              active: sport.id === sportId,
              onSelect: () => handleSelectSport(sport.id),
            })),
            {
              id: "statehue",
              icon: faMap,
              label: "Statehue",
              active: false,
              onSelect: () => navigate("/statehue"),
            },
          ]}
        />
      )}
    </>
  )
}

interface SportRouteProps {
  /** Pass "daily" for routes that should land directly on the game (e.g. fanatic variant). */
  screen?: ActiveScreen
  variantId?: string
}

function SportRoute({ screen, variantId }: SportRouteProps) {
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
      key={`${sportId}:${variantId ?? "classic"}`}
      sportId={sportId}
      screen={screen}
      variantId={variantId}
    />
  )
}

/** Wrapper that manages the Statehue hub ↔ pro-game transition without a URL change. */
function StatehueRoot() {
  const [showGame, setShowGame] = useState(false)
  return (
    <Suspense fallback={<div className="app-viewport" />}>
      {showGame ? (
        <ColorsShell onBack={() => setShowGame(false)} />
      ) : (
        <PaletteHub onPlayStatehue={() => setShowGame(true)} />
      )}
    </Suspense>
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
      {/* Backwards-compat redirects: old /daily and /arcade → sport menu */}
      <Route
        path="/daily"
        element={<Navigate to="/" replace />}
      />
      <Route
        path="/arcade"
        element={<Navigate to="/" replace />}
      />
      {/* Fanatic variant — goes straight to game (no separate menu page) */}
      <Route
        path="/fanatic"
        element={
          <SportRoute
            screen="daily"
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
      {/* Backwards-compat redirects: old /:sport/daily and /:sport/arcade → sport menu */}
      <Route
        path="/:sport/daily"
        element={<SportModeRedirect />}
      />
      <Route
        path="/:sport/arcade"
        element={<SportModeRedirect />}
      />
      {/* Fanatic variant for other sports — goes straight to game */}
      <Route
        path="/:sport/fanatic"
        element={
          <SportRoute
            screen="daily"
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
        element={<StatehueRoot />}
      />
      <Route
        path="/geo"
        element={<Navigate to="/statehue" replace />}
      />
      <Route
        path="/palette"
        element={<Navigate to="/statehue" replace />}
      />
      {/* Backwards-compat redirects: old /statehue/daily and /statehue/arcade → hub */}
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
      {/* Backwards-compat redirect: old /statehue/collegiate/arcade → collegiate game */}
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
      {/* Old /palette/states/* — point directly to final destination */}
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
      {/* Backwards-compat redirects: old /journeyman/:league/daily and /arcade → league root */}
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
