import { faMap, faXmark } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import clsx from "clsx"
import { lazy, Suspense, useEffect, useRef, useState } from "react"
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom"
import { hasPlayedJourneyDailyToday } from "@/games/journeyman/utils/journey-daily"
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
import { type FooterTab, LeagueFooter, Overlay, PWAUpdateToast } from "@/shared/components"

const Game = lazy(() => import("@/games/playerdle/screens/game"))
const ColorsShell = lazy(() => import("@/games/statehue/screens/colors-shell"))
const ColorsCalendar = lazy(() => import("@/games/statehue/screens/colors-calendar"))
const PlayerCalendar = lazy(() => import("@/games/playerdle/screens/player-calendar"))
const PaletteHub = lazy(() => import("@/games/statehue/screens/palette-hub"))
const JourneyShell = lazy(() => import("@/games/journeyman/screens/journey-shell"))
const JourneyCalendar = lazy(() => import("@/games/journeyman/screens/journey-calendar"))

const TUTORIAL_SEEN_KEY = "playerdle-tutorial-seen-v2"
const FANATIC_VARIANT_ID = "fanatic"

type GameOverlay = "none" | "guide" | "stats"
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
  const [activeGameOverlay, setActiveGameOverlay] = useState<GameOverlay>(
    initialGuideMode ? "guide" : "none",
  )
  const [gameGuideMode, setGameGuideMode] = useState<GuideMode>(initialGuideMode ?? "manual")
  const [menuSection, setMenuSection] = useState<"menu" | "about" | "help" | "stats">(
    screen === "help" ? "help" : "menu",
  )
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
  const isGuideOpen = activeGameOverlay === "guide"
  const isStatsOpen = activeGameOverlay === "stats"

  function handleCloseTutorial() {
    if (!isGuideOpen) {
      return
    }

    if (gameGuideMode === "onboarding") {
      localStorage.setItem(getTutorialStorageKey(sportId, activeVariantId), "true")
    }

    setActiveGameOverlay("none")
  }

  function handleShowTutorial() {
    if (screen !== "daily" || activeGameOverlay !== "none") {
      return
    }

    setGameGuideMode("manual")
    setActiveGameOverlay("guide")
  }

  function goToMenu() {
    navigate(buildPath(sportId, "menu"))
    setMenuSection("menu")
    setActiveGameOverlay("none")
  }

  function handleShowStats() {
    if (screen !== "daily" || isStatsOpen) {
      return
    }

    setStatsModalConfig({
      mode: "daily",
      showStatsOnly: true,
      includeShareButton: false,
      variantId: activeVariantId,
    })
    setActiveGameOverlay("stats")
  }

  function handleSelectSport(nextSportId: SportConfig["id"]) {
    if (nextSportId === sportId) {
      return
    }

    navigate(buildPath(nextSportId, "menu"))
    setMenuSection("menu")
    setActiveGameOverlay("none")
  }

  function handleCloseStatsModal() {
    if (!isStatsOpen) {
      return
    }

    setActiveGameOverlay("none")
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

    goToMenu()
  }

  const isMenuView = screen === "menu" || screen === "help"

  const nflExtraGames: ExtraGame[] = [
    {
      label: "Journeyman",
      played: hasPlayedJourneyDailyToday(),
      onPlayDaily: () => navigate("/journeyman/daily"),
      onPlayArcade: () => navigate("/journeyman/arcade"),
      onShowStats: () => navigate("/journeyman/daily", { state: { showStats: true } }),
    },
  ]

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
            extraGames={sportId === "nfl" ? nflExtraGames : undefined}
          />
        </div>
      )}
      {isGame && (
        <div className="app-viewport flex min-h-0 flex-col overflow-hidden bg-primary-50 dark:bg-primary-900">
          <Header
            onShowTutorial={
              screen === "daily" && activeGameOverlay === "none" ? handleShowTutorial : undefined
            }
            onShowStats={
              screen === "daily" && activeGameOverlay === "none" ? handleShowStats : undefined
            }
            onBack={goToMenu}
            sport={activeSport ?? sportMeta}
          />
          <div className="flex flex-1 min-h-0 overflow-hidden">
            <Suspense fallback={<div className="flex-1 min-h-0" />}>
              {screen === "daily" && activeSport && (
                <div className="relative flex flex-1 min-h-0 flex-col overflow-hidden">
                  <div
                    className={clsx(
                      "crossfade-panel h-full min-h-0 flex flex-1 overflow-hidden",
                      activeGameOverlay === "none" ? "crossfade-active" : "crossfade-inactive",
                    )}
                  >
                    <Game
                      key="daily"
                      mode="daily"
                      sport={activeSport}
                      variantId={activeVariantId}
                    />
                  </div>
                  <Overlay
                    open={isGuideOpen}
                    onClose={handleCloseTutorial}
                    className="px-4 pb-4 overflow-hidden flex min-h-0"
                  >
                    <div className="w-full max-w-2xl mx-auto h-full min-h-0 flex flex-col">
                      <div className="flex items-center justify-between pt-3">
                        <h2 className="text-xl font-black tracking-wider text-primary-700 dark:text-primary-50">
                          How to Play
                        </h2>
                        <button
                          type="button"
                          className="w-11 h-11 inline-flex items-center justify-center rounded-full text-primary-700 dark:text-primary-100 hover:bg-primary-200/80 dark:hover:bg-primary-700/80 transition-colors"
                          aria-label="Close guide"
                          onClick={handleCloseTutorial}
                        >
                          <FontAwesomeIcon
                            icon={faXmark}
                            className="text-2xl"
                          />
                        </button>
                      </div>
                      <GameGuideContent
                        sport={activeSport}
                        mode={gameGuideMode}
                        className="mt-2 flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
                        onOpenCalendar={() => {
                          const prefix = sportId === "nfl" ? "" : `/${sportId}`
                          const variantPath =
                            activeVariantId === FANATIC_VARIANT_ID ? "/fanatic" : ""
                          navigate(`${prefix}${variantPath}/calendar`)
                        }}
                      />
                    </div>
                  </Overlay>
                  <Overlay
                    open={isStatsOpen}
                    onClose={handleCloseStatsModal}
                    className="px-4 pb-4 overflow-hidden"
                  >
                    <div className="w-full max-w-2xl mx-auto h-full flex flex-col">
                      <div className="flex items-center justify-between pt-3">
                        <h2 className="text-xl font-black tracking-wider text-primary-700 dark:text-primary-50">
                          {statsModalConfig.showStatsOnly ? "Statistics" : "Results"}
                        </h2>
                        <button
                          type="button"
                          className="w-11 h-11 inline-flex items-center justify-center rounded-full text-primary-700 dark:text-primary-100 hover:bg-primary-200/80 dark:hover:bg-primary-700/80 transition-colors"
                          aria-label="Close stats"
                          onClick={handleCloseStatsModal}
                        >
                          <FontAwesomeIcon
                            icon={faXmark}
                            className="text-2xl"
                          />
                        </button>
                      </div>
                      <div className="-mt-1 flex-1 overflow-auto pb-2">
                        <StatsContent
                          {...statsModalConfig}
                          sport={activeSport}
                          variantId={activeVariantId}
                        />
                      </div>
                    </div>
                  </Overlay>
                </div>
              )}
              {screen === "arcade" && activeSport && (
                <Game
                  key={`arcade-${gameKey}`}
                  mode="arcade"
                  sport={activeSport}
                  variantId={activeVariantId}
                />
              )}
            </Suspense>
          </div>
        </div>
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

function App() {
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
      {/* Journeyman lives under /journeyman. Old /palette/journey/* redirects for backwards compatibility. */}
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
          <Suspense fallback={<div className="app-viewport" />}>
            <JourneyShell screen="daily" />
          </Suspense>
        }
      />
      <Route
        path="/journeyman/arcade"
        element={
          <Suspense fallback={<div className="app-viewport" />}>
            <JourneyShell screen="arcade" />
          </Suspense>
        }
      />
      <Route
        path="/journeyman/calendar"
        element={
          <Suspense fallback={<div className="app-viewport" />}>
            <JourneyCalendar />
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
            to="/journeyman/daily"
            replace
          />
        }
      />
      <Route
        path="/palette/journey/arcade"
        element={
          <Navigate
            to="/journeyman/arcade"
            replace
          />
        }
      />
      <Route
        path="/palette/journey/calendar"
        element={
          <Navigate
            to="/journeyman/calendar"
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
