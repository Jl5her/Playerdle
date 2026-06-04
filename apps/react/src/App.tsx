import { faDollarSign, faGraduationCap, faMap, faScroll, faStar } from "@fortawesome/free-solid-svg-icons"
import clsx from "clsx"
import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react"
import WelcomeScreen, { hasSeenWelcome } from "@/shared/components/welcome-screen"
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom"
import { parseDateKey } from "@/shared/utils/calendar-date"
import { formatLongDate } from "@/shared/utils/time"
import { usePanelStack } from "@/shared/hooks/use-panel-stack"
import {
  hasPlayedJourneyDailyToday,
  isJourneyLeague,
  type JourneyLeague,
} from "@/games/journeyman/utils/journey-daily"
import { hasPlayedCapCrunchToday } from "@/games/capcrunch/utils/capcrunch-daily"
import { hasPlayedCollegeCourtToday } from "@/games/collegecourt/utils/collegecourt-daily"
import { hasPlayedCollegeFieldToday } from "@/games/collegefield/utils/collegefield-daily"
import { hasPlayedTodaysDaily } from "@/games/playerdle/utils/stats"
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
const CapCrunchShell = lazy(() => import("@/games/capcrunch/capcrunch-shell"))
const CapCrunchCalendar = lazy(() => import("@/games/capcrunch/capcrunch-calendar"))
const CollegeCourtShell = lazy(() => import("@/games/collegecourt/collegecourt-shell"))
const CollegeCourtCalendar = lazy(() => import("@/games/collegecourt/collegecourt-calendar"))
const CollegeFieldShell = lazy(() => import("@/games/collegefield/collegefield-shell"))
const CollegeFieldCalendar = lazy(() => import("@/games/collegefield/collegefield-calendar"))

const TUTORIAL_SEEN_KEY = "playerdle-tutorial-seen-v2"
const FANATIC_VARIANT_ID = "fanatic"
const MADDEN_VARIANT_ID = "madden"
const NBA2K_VARIANT_ID = "nba2k"

type AppPanel = "guide" | "stats" | "calendar" | "archive-guide"
type RouteScreen = "menu" | "playerdle" | "help"

interface DailyRouteState {
  guideMode?: GuideMode
  showStats?: boolean
}

interface AppShellProps {
  sportId: SportConfig["id"]
  screen: RouteScreen
  variantId?: string
}

function HelpRedirect() {
  const { sport } = useParams<{ sport?: string }>()
  const to = sport ? `/${sport}?m=help` : `/?m=help`
  return (
    <Navigate
      to={to}
      replace
    />
  )
}

function LegacySportRedirect({ to }: { to: string }) {
  const { sport } = useParams<{ sport?: string }>()
  const prefix = sport ? `/${sport}` : ""
  return (
    <Navigate
      to={`${prefix}${to}`}
      replace
    />
  )
}

function getSportIdFromRouteParam(sport?: string): SportConfig["id"] | null {
  if (!sport) return "nfl"
  const normalized = sport.toLowerCase()
  if (normalized === "mlb") return "mlb"
  if (normalized === "nhl") return "nhl"
  if (normalized === "nba") return "nba"
  return null
}

function buildPath(sportId: SportConfig["id"], screen: RouteScreen, variantId?: string): string {
  const prefix = sportId === "nfl" ? "" : `/${sportId}`
  if (screen === "menu") {
    return prefix || "/"
  }
  if (variantId) {
    return `${prefix}/${variantId}`
  }
  return `${prefix}/playerdle`
}

function getTutorialStorageKey(sportId: string, variantId?: string): string {
  return `${TUTORIAL_SEEN_KEY}:${sportId}:${variantId ?? "classic"}`
}

function getGuideModeFromState(state: unknown): GuideMode | undefined {
  if (!state || typeof state !== "object") return undefined
  const routeState = state as DailyRouteState
  if (routeState.guideMode === "manual" || routeState.guideMode === "onboarding") {
    return routeState.guideMode
  }
  return undefined
}

function AppShell({ sportId, screen, variantId }: AppShellProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const sportMeta = getSportMetaById(sportId)
  const [gameKey, setGameKey] = useState(0)
  const [sport, setSport] = useState<SportConfig | null>(null)
  const [sportLoadFailed, setSportLoadFailed] = useState(false)
  const [statsModalConfig, setStatsModalConfig] = useState<StatsModalConfig>({ mode: "daily" })
  const initialGuideMode =
    screen === "playerdle" ? getGuideModeFromState(location.state) : undefined
  const [gameGuideMode, setGameGuideMode] = useState<GuideMode>(initialGuideMode ?? "manual")
  const panels = usePanelStack<AppPanel>(initialGuideMode ? "guide" : undefined)
  const [calendarHistoryVersion, setCalendarHistoryVersion] = useState(0)
  const [archiveDateKey, setArchiveDateKey] = useState<string | null>(null)
  const isArchive = !!archiveDateKey
  const sportCacheRef = useRef<Partial<Record<SportConfig["id"], SportConfig>>>({})
  const isSyncing = useSyncExternalStore(subscribeSyncState, getIsSyncing, () => false)
  const [waitingForSync, setWaitingForSync] = useState(false)

  useEffect(() => {
    if (initialGuideMode === "onboarding") {
      trackPanelOpened({
        panel: "guide",
        game: "playerdle",
        sport: sportId,
        variant: variantId,
        mode: "daily",
        is_onboarding: true,
      })
    }
  }, []) // intentionally runs once on mount

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

  const isPlayerdleScreen = screen === "playerdle"

  function handleShowTutorial() {
    if (!isPlayerdleScreen || panels.isAnyOpen) {
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
    navigate(buildPath(sportId, "menu"))
    panels.clear()
  }

  function handleShowStats() {
    if (!isPlayerdleScreen || panels.isOpen("stats")) {
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
    navigate(buildPath(nextSportId, "menu"))
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

    if (target === "daily") {
      const seenKey = getTutorialStorageKey(sportId, nextVariantId)
      const shouldShowOnboarding = !localStorage.getItem(seenKey)
      navigate(buildPath(sportId, "playerdle", nextVariantId), {
        state: shouldShowOnboarding ? ({ guideMode: "onboarding" } as DailyRouteState) : undefined,
      })
      return
    }

    if (target === "arcade") {
      setGameKey(k => k + 1)
      navigate(buildPath(sportId, "playerdle", nextVariantId))
      return
    }

    if (target === "stats") {
      navigate(buildPath(sportId, "playerdle", nextVariantId), {
        state: { showStats: true } as DailyRouteState,
      })
      return
    }

    if (target === "calendar") {
      const prefix = sportId === "nfl" ? "" : `/${sportId}`
      navigate(`${prefix}/calendar`)
      return
    }
  }

  const isMenuView = screen === "menu" || screen === "help"

  const journeymanLeague: JourneyLeague | null = isJourneyLeague(sportId) ? sportId : null
  const builtExtraGames: ExtraGame[] = []
  if (journeymanLeague) {
    builtExtraGames.push({
      label: "Journeyman",
      featured: true,
      played: hasPlayedJourneyDailyToday(journeymanLeague),
      onPlayDaily: () => navigate(`/journeyman/${journeymanLeague}/daily`),
      onPlayArcade: () => navigate(`/journeyman/${journeymanLeague}/arcade`),
      onShowStats: () =>
        navigate(`/journeyman/${journeymanLeague}/daily`, { state: { showStats: true } }),
    })
  }
  if (sportId === "nfl") {
    builtExtraGames.push({
      label: "Madden",
      description: "Guess the NFL player from their Madden 26 ratings",
      icon: faStar,
      played: hasPlayedTodaysDaily("nfl", MADDEN_VARIANT_ID),
      onPlayDaily: () => navigate(buildPath("nfl", "playerdle", MADDEN_VARIANT_ID)),
      onPlayArcade: () => {
        setGameKey(k => k + 1)
        navigate(buildPath("nfl", "playerdle", MADDEN_VARIANT_ID))
      },
      onShowStats: () =>
        navigate(buildPath("nfl", "playerdle", MADDEN_VARIANT_ID), {
          state: { showStats: true } as DailyRouteState,
        }),
    })
    builtExtraGames.push({
      label: "Cap Crunch",
      description: "Guess the NFL team from their salary cap numbers",
      icon: faDollarSign,
      played: hasPlayedCapCrunchToday("nfl"),
      onPlayDaily: () => navigate("/capcrunch"),
      onPlayArcade: () => navigate("/capcrunch/arcade"),
      onShowStats: () => navigate("/capcrunch"),
    })
    builtExtraGames.push({
      label: "Schooled",
      description: "Guess the NFL team from their players' college logos",
      icon: faScroll,
      played: hasPlayedCollegeFieldToday(),
      onPlayDaily: () => navigate("/collegefield"),
      onPlayArcade: () => navigate("/collegefield/arcade"),
      onShowStats: () => navigate("/collegefield"),
    })
  }
  if (sportId === "nba") {
    builtExtraGames.push({
      label: "NBA 2K",
      description: "Guess the NBA player from their NBA 2K26 ratings",
      icon: faStar,
      played: hasPlayedTodaysDaily("nba", NBA2K_VARIANT_ID),
      onPlayDaily: () => navigate(buildPath("nba", "playerdle", NBA2K_VARIANT_ID)),
      onPlayArcade: () => {
        setGameKey(k => k + 1)
        navigate(buildPath("nba", "playerdle", NBA2K_VARIANT_ID))
      },
      onShowStats: () =>
        navigate(buildPath("nba", "playerdle", NBA2K_VARIANT_ID), {
          state: { showStats: true } as DailyRouteState,
        }),
    })
    builtExtraGames.push({
      label: "Schooled",
      description: "Guess the NBA team from college logos on the court",
      icon: faGraduationCap,
      played: hasPlayedCollegeCourtToday(),
      onPlayDaily: () => navigate("/collegecourt"),
      onPlayArcade: () => navigate("/collegecourt/arcade"),
      onShowStats: () => navigate("/collegecourt"),
    })
  }
  const extraGames: ExtraGame[] | undefined =
    builtExtraGames.length > 0 ? builtExtraGames : undefined

  if (sportLoadFailed && !sport) {
    return (
      <div className="app-viewport flex flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-primary-500 dark:text-primary-400 text-sm">
          Failed to load game data. Please refresh the page.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white text-sm font-medium transition-colors"
        >
          Refresh
        </button>
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
      {isPlayerdleScreen && (
        <PanelStackContext.Provider value={panels}>
          <div className="app-viewport flex min-h-0 flex-col overflow-hidden">
            <Header
              onShowTutorial={
                isPlayerdleScreen && !panels.isAnyOpen
                  ? isArchive
                    ? () => panels.push("archive-guide")
                    : handleShowTutorial
                  : undefined
              }
              onShowStats={
                isPlayerdleScreen && !panels.isAnyOpen && !isArchive ? handleShowStats : undefined
              }
              onBack={isArchive ? exitArchive : goToMenu}
              sport={activeSport ?? sportMeta}
              subtitle={archiveDateKey ? formatLongDate(parseDateKey(archiveDateKey)) : undefined}
            />
            <div className="flex flex-1 min-h-0 overflow-hidden pt-[3.75rem]">
              <Suspense fallback={<div className="flex-1 min-h-0" />}>
                {isPlayerdleScreen && activeSport && (
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
                          key={`playerdle-${gameKey}`}
                          mode="daily"
                          sport={activeSport}
                          variantId={activeVariantId}
                          onBackToToday={() => setGameKey(k => k + 1)}
                        />
                      )}
                    </div>
                    <GameGuideContent
                      id="guide"
                      tutorialKey={
                        gameGuideMode === "onboarding"
                          ? getTutorialStorageKey(sportId, activeVariantId)
                          : undefined
                      }
                      sport={activeSport}
                      mode={gameGuideMode}
                      onOpenCalendar={() => panels.push("calendar")}
                    />
                    <Panel
                      open={panels.isOpen("stats")}
                      onClose={panels.pop}
                      title={statsModalConfig.showStatsOnly ? "Statistics" : "Results"}
                      layout="scroll"
                    >
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

function CapCrunchArchiveRoute() {
  const { dateKey } = useParams<{ dateKey: string }>()
  return (
    <CapCrunchShell
      league="nfl"
      screen="daily"
      archiveDateKey={dateKey}
    />
  )
}

function CollegeCourtArchiveRoute() {
  const { dateKey } = useParams<{ dateKey: string }>()
  return (
    <CollegeCourtShell
      screen="daily"
      archiveDateKey={dateKey}
    />
  )
}

function CollegeFieldArchiveRoute() {
  const { dateKey } = useParams<{ dateKey: string }>()
  return (
    <CollegeFieldShell
      screen="daily"
      archiveDateKey={dateKey}
    />
  )
}

interface SportRouteProps {
  screen: RouteScreen
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
      sportId={sportId}
      screen={screen}
      variantId={variantId}
    />
  )
}

interface JourneyRouteProps {
  screen: "daily" | "arcade"
}

function JourneyRoute({ screen }: JourneyRouteProps) {
  const { league } = useParams<{ league?: string }>()
  if (!league || !isJourneyLeague(league)) {
    return (
      <Navigate
        to={`/journeyman/nfl/${screen}`}
        replace
      />
    )
  }
  return (
    <JourneyShell
      league={league}
      screen={screen}
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
        <Route
          path="/"
          element={<SportRoute screen="menu" />}
        />
        <Route
          path="/help"
          element={<HelpRedirect />}
        />
        <Route
          path="/playerdle"
          element={<SportRoute screen="playerdle" />}
        />
        <Route
          path="/fanatic"
          element={
            <SportRoute
              screen="playerdle"
              variantId={FANATIC_VARIANT_ID}
            />
          }
        />
        <Route
          path="/madden"
          element={
            <SportRoute
              screen="playerdle"
              variantId={MADDEN_VARIANT_ID}
            />
          }
        />
        {/* Legacy /daily and /arcade paths redirect to the unified /playerdle URL. */}
        <Route
          path="/daily"
          element={
            <Navigate
              to="/playerdle"
              replace
            />
          }
        />
        <Route
          path="/arcade"
          element={
            <Navigate
              to="/playerdle"
              replace
            />
          }
        />
        <Route
          path="/arcade/fanatic"
          element={
            <Navigate
              to="/fanatic"
              replace
            />
          }
        />
        <Route
          path="/team-colors-key"
          element={
            <Navigate
              to="/team-colors-key/nfl"
              replace
            />
          }
        />
        <Route
          path="/team-colors-key/:sport"
          element={
            <Suspense fallback={<div className="app-viewport" />}>
              <TeamColorsKey />
            </Suspense>
          }
        />
        <Route
          path="/:sport"
          element={<SportRoute screen="menu" />}
        />
        <Route
          path="/:sport/help"
          element={<HelpRedirect />}
        />
        <Route
          path="/:sport/playerdle"
          element={<SportRoute screen="playerdle" />}
        />
        <Route
          path="/:sport/fanatic"
          element={
            <SportRoute
              screen="playerdle"
              variantId={FANATIC_VARIANT_ID}
            />
          }
        />
        <Route
          path="/:sport/madden"
          element={
            <SportRoute
              screen="playerdle"
              variantId={MADDEN_VARIANT_ID}
            />
          }
        />
        <Route
          path="/:sport/nba2k"
          element={
            <SportRoute
              screen="playerdle"
              variantId={NBA2K_VARIANT_ID}
            />
          }
        />
        <Route
          path="/:sport/daily"
          element={<LegacySportRedirect to="/playerdle" />}
        />
        <Route
          path="/:sport/arcade"
          element={<LegacySportRedirect to="/playerdle" />}
        />
        <Route
          path="/:sport/arcade/fanatic"
          element={<LegacySportRedirect to="/fanatic" />}
        />
        {/* Statehue hub at /statehue. /geo and /palette redirect for backwards compatibility. */}
        <Route
          path="/statehue"
          element={
            <Suspense fallback={<div className="app-viewport" />}>
              <PaletteHub />
            </Suspense>
          }
        />
        <Route
          path="/geo"
          element={
            <Navigate
              to="/statehue"
              replace
            />
          }
        />
        <Route
          path="/palette"
          element={
            <Navigate
              to="/statehue"
              replace
            />
          }
        />
        {/* Statehue game routes live under /statehue/*. Old /palette/states/* redirects for backwards compatibility. */}
        <Route
          path="/statehue/daily"
          element={
            <Suspense fallback={<div className="app-viewport" />}>
              <ColorsShell screen="daily" />
            </Suspense>
          }
        />
        <Route
          path="/statehue/arcade"
          element={
            <Suspense fallback={<div className="app-viewport" />}>
              <ColorsShell screen="arcade" />
            </Suspense>
          }
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
              <ColorsShell
                screen="daily"
                variant="collegiate"
              />
            </Suspense>
          }
        />
        <Route
          path="/statehue/collegiate/arcade"
          element={
            <Suspense fallback={<div className="app-viewport" />}>
              <ColorsShell
                screen="arcade"
                variant="collegiate"
              />
            </Suspense>
          }
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
          element={
            <Navigate
              to="/statehue"
              replace
            />
          }
        />
        <Route
          path="/palette/states/daily"
          element={
            <Navigate
              to="/statehue/daily"
              replace
            />
          }
        />
        <Route
          path="/palette/states/arcade"
          element={
            <Navigate
              to="/statehue/arcade"
              replace
            />
          }
        />
        <Route
          path="/palette/states/calendar"
          element={
            <Navigate
              to="/statehue/calendar"
              replace
            />
          }
        />
        {/* Journeyman lives under /journeyman/:league. Plain /journeyman/* paths
          default to NFL for backwards compatibility with bookmarks and shared
          links from the original single-league launch. */}
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
              to="/journeyman/nfl/daily"
              replace
            />
          }
        />
        <Route
          path="/journeyman/arcade"
          element={
            <Navigate
              to="/journeyman/nfl/arcade"
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
          path="/journeyman/:league/daily"
          element={
            <Suspense fallback={<div className="app-viewport" />}>
              <JourneyRoute screen="daily" />
            </Suspense>
          }
        />
        <Route
          path="/journeyman/:league/arcade"
          element={
            <Suspense fallback={<div className="app-viewport" />}>
              <JourneyRoute screen="arcade" />
            </Suspense>
          }
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
              to="/journeyman/nfl/daily"
              replace
            />
          }
        />
        <Route
          path="/palette/journey/arcade"
          element={
            <Navigate
              to="/journeyman/nfl/arcade"
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
          path="/madden/calendar"
          element={
            <Suspense fallback={<div className="app-viewport" />}>
              <PlayerCalendar variantId={MADDEN_VARIANT_ID} />
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
          path="/:sport/madden/calendar"
          element={
            <Suspense fallback={<div className="app-viewport" />}>
              <PlayerCalendar variantId={MADDEN_VARIANT_ID} />
            </Suspense>
          }
        />
        <Route
          path="/:sport/nba2k/calendar"
          element={
            <Suspense fallback={<div className="app-viewport" />}>
              <PlayerCalendar variantId={NBA2K_VARIANT_ID} />
            </Suspense>
          }
        />
        {/* Cap Crunch game — NFL only for now */}
        <Route
          path="/capcrunch"
          element={
            <Suspense fallback={<div className="app-viewport" />}>
              <CapCrunchShell
                league="nfl"
                screen="daily"
              />
            </Suspense>
          }
        />
        <Route
          path="/capcrunch/arcade"
          element={
            <Suspense fallback={<div className="app-viewport" />}>
              <CapCrunchShell
                league="nfl"
                screen="arcade"
              />
            </Suspense>
          }
        />
        <Route
          path="/capcrunch/calendar"
          element={
            <Suspense fallback={<div className="app-viewport" />}>
              <CapCrunchCalendar league="nfl" />
            </Suspense>
          }
        />
        <Route
          path="/capcrunch/archive/:dateKey"
          element={
            <Suspense fallback={<div className="app-viewport" />}>
              <CapCrunchArchiveRoute />
            </Suspense>
          }
        />
        {/* CollegeField game — NFL only */}
        <Route
          path="/collegefield"
          element={
            <Suspense fallback={<div className="app-viewport" />}>
              <CollegeFieldShell screen="daily" />
            </Suspense>
          }
        />
        <Route
          path="/collegefield/arcade"
          element={
            <Suspense fallback={<div className="app-viewport" />}>
              <CollegeFieldShell screen="arcade" />
            </Suspense>
          }
        />
        <Route
          path="/collegefield/calendar"
          element={
            <Suspense fallback={<div className="app-viewport" />}>
              <CollegeFieldCalendar />
            </Suspense>
          }
        />
        <Route
          path="/collegefield/archive/:dateKey"
          element={
            <Suspense fallback={<div className="app-viewport" />}>
              <CollegeFieldArchiveRoute />
            </Suspense>
          }
        />
        {/* CollegeCourt game — NBA only */}
        <Route
          path="/collegecourt"
          element={
            <Suspense fallback={<div className="app-viewport" />}>
              <CollegeCourtShell screen="daily" />
            </Suspense>
          }
        />
        <Route
          path="/collegecourt/arcade"
          element={
            <Suspense fallback={<div className="app-viewport" />}>
              <CollegeCourtShell screen="arcade" />
            </Suspense>
          }
        />
        <Route
          path="/collegecourt/calendar"
          element={
            <Suspense fallback={<div className="app-viewport" />}>
              <CollegeCourtCalendar />
            </Suspense>
          }
        />
        <Route
          path="/collegecourt/archive/:dateKey"
          element={
            <Suspense fallback={<div className="app-viewport" />}>
              <CollegeCourtArchiveRoute />
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
