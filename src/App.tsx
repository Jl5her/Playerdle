import { faXmark } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { lazy, Suspense, useEffect, useRef, useState } from "react"
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom"
import { Header, LeagueFooter } from "@/components"
import { GameGuideContent, type GuideMode } from "@/modals/game-guide-content"
import { StatsContent } from "@/modals/stats-content"
import { MainMenu } from "@/screens"
import type { StatsModalConfig } from "@/screens/game"
import type { NavigationOptions, Screen } from "@/screens/main-menu"
import { getSportMetaById, loadSportConfig, resolveSportConfig, type SportConfig } from "@/sports"

const Game = lazy(() => import("@/screens/game"))

const TUTORIAL_SEEN_KEY = "playerdle-tutorial-seen-v2"
const FANATIC_VARIANT_ID = "fanatic"

type GameOverlay = "none" | "guide" | "stats"
type RouteScreen = "menu" | "daily" | "arcade" | "help"

interface DailyRouteState {
  guideMode?: GuideMode
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
  if (screen === "daily" && variantId === FANATIC_VARIANT_ID) {
    return `${prefix}/${FANATIC_VARIANT_ID}`
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
  const [menuSection, setMenuSection] = useState<"menu" | "about" | "help">(
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

  function handleOpenStatsModal(config: StatsModalConfig) {
    setStatsModalConfig({
      ...config,
      onPlayAgain: config.onPlayAgain
        ? () => {
            config.onPlayAgain?.()
            handleCloseStatsModal()
          }
        : undefined,
    })
    setActiveGameOverlay("stats")
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
      navigate(buildPath(sportId, "arcade"))
      return
    }
  }

  function handleAboutBack() {
    if (menuSection === "help") {
      navigate(buildPath(sportId, "menu"))
      setMenuSection("menu")
      return
    }

    if (menuSection === "about") {
      setMenuSection("menu")
      return
    }

    goToMenu()
  }

  const isMenuView = screen === "menu" || screen === "help"

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
                    className={`crossfade-panel h-full min-h-0 overflow-hidden ${activeGameOverlay === "none" ? "crossfade-active" : "crossfade-inactive"}`}
                  >
                    <Game
                      key="daily"
                      mode="daily"
                      sport={activeSport}
                      variantId={activeVariantId}
                      onOpenStatsModal={handleOpenStatsModal}
                    />
                  </div>
                  <div
                    className={`crossfade-panel absolute inset-0 px-4 pb-4 overflow-hidden flex min-h-0 ${isGuideOpen ? "crossfade-active" : "crossfade-inactive"}`}
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
                      />
                    </div>
                  </div>
                  <div
                    className={`crossfade-panel absolute inset-0 px-4 pb-4 overflow-hidden ${isStatsOpen ? "crossfade-active" : "crossfade-inactive"}`}
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
                  </div>
                </div>
              )}
              {screen === "arcade" && activeSport && (
                <Game
                  key={`arcade-${gameKey}`}
                  mode="arcade"
                  sport={activeSport}
                  variantId={activeVariantId}
                  onOpenStatsModal={handleOpenStatsModal}
                />
              )}
            </Suspense>
          </div>
        </div>
      )}
      {isMenuView && (
        <LeagueFooter
          currentSportId={sportId}
          onSelectSport={handleSelectSport}
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
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />
    </Routes>
  )
}

export default App
