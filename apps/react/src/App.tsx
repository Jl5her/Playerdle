import { faMap } from "@fortawesome/free-solid-svg-icons"
import clsx from "clsx"
import { lazy, Suspense, useEffect, useRef, useState } from "react"
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom"
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
import { backgroundSync } from "@/shared/utils/sync"

const Game = lazy(() => import("@/games/playerdle/screens/game"))
const ColorsShell = lazy(() => import("@/games/statehue/screens/colors-shell"))
const ColorsCalendar = lazy(() => import("@/games/statehue/screens/colors-calendar"))
const PlayerCalendar = lazy(() => import("@/games/playerdle/screens/player-calendar"))
const PaletteHub = lazy(() => import("@/games/statehue/screens/palette-hub"))
const JourneyShell = lazy(() => import("@/games/journeyman/screens/journey-shell"))
const JourneyCalendar = lazy(() => import("@/games/journeyman/screens/journey-calendar"))

const TUTORIAL_SEEN_KEY = "playerdle-tutorial-seen-v2"
const FANATIC_VARIANT_ID = "fanatic"

type AppPanel = "guide" | "stats" | "calendar" | "archive-guide"
type RouteScreen = "menu" | "daily" | "arcade" | "help"

interface DailyRouteState {
  guideMode?: GuideMode
  showStats?: boolean
}

interface AppShellProps {
  sportId: SportConfig["id"]
  screen: RouteScreen
  variantId?: string
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
  if (variantId === FANATIC_VARIANT_ID) {
    if (screen === "daily") return `${prefix}/${FANATIC_VARIANT_ID}`
    if (screen === "arcade") return `${prefix}/arcade/${FANATIC_VARIANT_ID}`
  }
  return `${prefix}/${screen}`
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
  const [statsModalConfig, setStatsModalConfig] = useState<StatsModalConfig>({ mode: "daily" })
  const initialGuideMode = screen === "daily" ? getGuideModeFromState(location.state) : undefined
  const [gameGuideMode, setGameGuideMode] = useState<GuideMode>(initialGuideMode ?? "manual")
  const panels = usePanelStack<AppPanel>(
    initialGuideMode ? "guide" : undefined,
  )
  const [calendarHistoryVersion, setCalendarHistoryVersion] = useState(0)
  const [archiveDateKey, setArchiveDateKey] = useState<string | null>(null)
  const isArchive = !!archiveDateKey
  const [menuSection, setMenuSection] = useState<
    "menu" | "about" | "help" | "stats" | "settings"
  >(screen === "help" ? "help" : "menu")
  const sportCacheRef = useRef<Partial<Record<SportConfig["id"], SportConfig>>>({})

  useEffect(() => {
    if (screen === "help") {
      setMenuSection("help")
      return
    }
    if (screen !== "menu") {
      setMenuSection("menu")
    }
  }, [screen])

  useEffect(() => {
    let isMounted = true
    const cachedSport = sportCacheRef.current[sportId]

    if (cachedSport) {
      setSport(cachedSport)
      return () => {
        isMounted = false
      }
    }

    loadSportConfig(sportId).then(config => {
      if (isMounted) {
        sportCacheRef.current[sportId] = config
        setSport(config)
      }
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

  const isGame = screen === "daily" || screen === "arcade"

  function handleShowTutorial() {
    if (screen !== "daily" || panels.isAnyOpen) {
      return
    }

    setGameGuideMode("manual")
    panels.push("guide")
  }

  function goToMenu() {
    navigate(buildPath(sportId, "menu"))
    setMenuSection("menu")
    panels.clear()
  }

  function handleShowStats() {
    if (screen !== "daily" || panels.isOpen("stats")) {
      return
    }

    setStatsModalConfig({
      mode: "daily",
      showStatsOnly: true,
      includeShareButton: false,
      variantId: activeVariantId,
    })
    panels.push("stats")
  }

  function handleSelectSport(nextSportId: SportConfig["id"]) {
    navigate(buildPath(nextSportId, "menu"))
    setMenuSection("menu")
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

  function handleNavigate(target: Screen, options?: NavigationOptions) {
    if (target === "about" && screen === "menu") {
      setMenuSection("about")
      return
    }

    if (target === "all-stats" && screen === "menu") {
      setMenuSection("stats")
      return
    }

    if (target === "settings" && screen === "menu") {
      setMenuSection("settings")
      return
    }

    if (target === "help" && screen === "menu") {
      navigate(buildPath(sportId, "help"))
      setMenuSection("help")
      return
    }

    const nextVariantId = options?.variantId

    if (target === "daily") {
      const seenKey = getTutorialStorageKey(sportId, nextVariantId)
      const shouldShowOnboarding = !localStorage.getItem(seenKey)
      navigate(buildPath(sportId, "daily", nextVariantId), {
        state: shouldShowOnboarding ? ({ guideMode: "onboarding" } as DailyRouteState) : undefined,
      })
      return
    }

    if (target === "arcade") {
      setGameKey(k => k + 1)
      navigate(buildPath(sportId, "arcade", nextVariantId))
      return
    }

    if (target === "stats") {
      navigate(buildPath(sportId, "daily", nextVariantId), {
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

  function handleAboutBack() {
    if (menuSection === "help") {
      navigate(buildPath(sportId, "menu"))
      setMenuSection("menu")
      return
    }

    if (menuSection === "about" || menuSection === "stats") {
      setMenuSection("menu")
      return
    }

    if (menuSection === "settings") {
      setMenuSection("about")
      return
    }

    goToMenu()
  }

  const isMenuView = screen === "menu" || screen === "help"

  const journeymanLeague: JourneyLeague | null = isJourneyLeague(sportId) ? sportId : null
  const extraGames: ExtraGame[] | undefined = journeymanLeague
    ? [
        {
          label: "Journeyman",
          played: hasPlayedJourneyDailyToday(journeymanLeague),
          onPlayDaily: () => navigate(`/journeyman/${journeymanLeague}/daily`),
          onPlayArcade: () => navigate(`/journeyman/${journeymanLeague}/arcade`),
          onShowStats: () =>
            navigate(`/journeyman/${journeymanLeague}/daily`, {
              state: { showStats: true },
            }),
        },
      ]
    : undefined

  return (
    <>
      {isMenuView && (
        <div className="app-viewport pb-11 flex flex-col bg-primary-50 dark:bg-primary-900">
          <MainMenu
            onNavigate={handleNavigate}
            sport={sport ?? sportMeta}
            section={menuSection}
            onCloseAbout={handleAboutBack}
            guideSport={activeSport ?? sport}
            extraGames={extraGames}
            journeyLeague={journeymanLeague}
          />
        </div>
      )}
      {isGame && (
        <PanelStackContext.Provider value={panels}>
        <div className="app-viewport flex min-h-0 flex-col overflow-hidden bg-primary-50 dark:bg-primary-900">
          <Header
            onShowTutorial={
              screen === "daily" && !panels.isAnyOpen
                ? isArchive
                  ? () => panels.push("archive-guide")
                  : handleShowTutorial
                : undefined
            }
            onShowStats={
              screen === "daily" && !panels.isAnyOpen && !isArchive ? handleShowStats : undefined
            }
            onBack={isArchive ? exitArchive : goToMenu}
            sport={activeSport ?? sportMeta}
            subtitle={archiveDateKey ? formatLongDate(parseDateKey(archiveDateKey)) : undefined}
          />
          <div className="flex flex-1 min-h-0 overflow-hidden pt-[3.75rem]">
            <Suspense fallback={<div className="flex-1 min-h-0" />}>
              {screen === "daily" && activeSport && (
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
              {screen === "arcade" && activeSport && (
                <Game
                  key={`arcade-${gameKey}`}
                  mode="arcade"
                  sport={activeSport}
                  variantId={activeVariantId}
                  onBackToToday={() => navigate(buildPath(sportId, "daily", activeVariantId))}
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
  useEffect(() => {
    void backgroundSync().catch(() => {})
  }, [])
  return (
    <>
    <PWAUpdateToast />
    <Routes>
      <Route
        path="/"
        element={<SportRoute screen="menu" />}
      />
      <Route
        path="/help"
        element={<SportRoute screen="help" />}
      />
      <Route
        path="/daily"
        element={<SportRoute screen="daily" />}
      />
      <Route
        path="/arcade"
        element={<SportRoute screen="arcade" />}
      />
      <Route
        path="/fanatic"
        element={
          <SportRoute
            screen="daily"
            variantId={FANATIC_VARIANT_ID}
          />
        }
      />
      <Route
        path="/arcade/fanatic"
        element={
          <SportRoute
            screen="arcade"
            variantId={FANATIC_VARIANT_ID}
          />
        }
      />
      <Route
        path="/:sport"
        element={<SportRoute screen="menu" />}
      />
      <Route
        path="/:sport/help"
        element={<SportRoute screen="help" />}
      />
      <Route
        path="/:sport/daily"
        element={<SportRoute screen="daily" />}
      />
      <Route
        path="/:sport/arcade"
        element={<SportRoute screen="arcade" />}
      />
      <Route
        path="/:sport/fanatic"
        element={
          <SportRoute
            screen="daily"
            variantId={FANATIC_VARIANT_ID}
          />
        }
      />
      <Route
        path="/:sport/arcade/fanatic"
        element={
          <SportRoute
            screen="arcade"
            variantId={FANATIC_VARIANT_ID}
          />
        }
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
