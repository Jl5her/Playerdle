import { faXmark } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { lazy, Suspense, useEffect, useRef, useState } from "react"
import { Header, LeagueFooter } from "@/components"
import { GameGuideContent, type GuideMode } from "@/modals/game-guide-content"
import { StatsContent } from "@/modals/stats-content"
import { MainMenu } from "@/screens"
import type { StatsModalConfig } from "@/screens/game"
import type { NavigationOptions, Screen } from "@/screens/main-menu"
import {
  getSportIdFromPath,
  getSportMetaById,
  loadSportConfig,
  resolveSportConfig,
  type SportConfig,
} from "@/sports"

const Game = lazy(() => import("@/screens/game"))

const TUTORIAL_SEEN_KEY = "playerdle-tutorial-seen-v2"

type GameOverlay = "none" | "guide" | "stats"

const ROUTABLE_SCREENS: Screen[] = ["menu", "daily", "arcade", "help"]

function isRoutableScreen(screen: string): screen is Screen {
  return ROUTABLE_SCREENS.includes(screen as Screen)
}

function getScreenFromPath(pathname: string): Screen {
  const segments = pathname
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean)

  const first = segments[0]?.toLowerCase()
  const second = segments[1]?.toLowerCase()

  if (first && isRoutableScreen(first)) {
    return first
  }

  if (second && isRoutableScreen(second)) {
    return second
  }

  return "menu"
}

function buildPath(sportId: SportConfig["id"], screen: Screen): string {
  const routeScreen = isRoutableScreen(screen) ? screen : "menu"
  const sportMeta = getSportMetaById(sportId)
  const prefix = sportMeta.slug ? `/${sportMeta.slug}` : ""
  if (routeScreen === "menu") {
    return prefix || "/"
  }
  return `${prefix}/${routeScreen}`
}

function getTutorialStorageKey(sportId: string, variantId?: string): string {
  return `${TUTORIAL_SEEN_KEY}:${sportId}:${variantId ?? "classic"}`
}

function App() {
  const [sportId, setSportId] = useState(() => getSportIdFromPath(window.location.pathname))
  const sportMeta = getSportMetaById(sportId)
  const [screen, setScreen] = useState<Screen>(() => getScreenFromPath(window.location.pathname))
  const [gameKey, setGameKey] = useState(0)
  const [sport, setSport] = useState<SportConfig | null>(null)
  const [activeVariantId, setActiveVariantId] = useState<string | undefined>(undefined)
  const [statsModalConfig, setStatsModalConfig] = useState<StatsModalConfig>({ mode: "daily" })
  const [activeGameOverlay, setActiveGameOverlay] = useState<GameOverlay>("none")
  const [gameGuideMode, setGameGuideMode] = useState<GuideMode>("manual")
  const sportCacheRef = useRef<Partial<Record<SportConfig["id"], SportConfig>>>({})

  function pushRoute(nextSportId: SportConfig["id"], nextScreen: Screen) {
    const nextPath = buildPath(nextSportId, nextScreen)
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath)
    }
  }

  useEffect(() => {
    const initialSportId = getSportIdFromPath(window.location.pathname)
    const initialScreen = getScreenFromPath(window.location.pathname)
    const canonicalPath = buildPath(initialSportId, initialScreen)

    if (window.location.pathname !== canonicalPath) {
      window.history.replaceState({}, "", canonicalPath)
    }
  }, [])

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

  useEffect(() => {
    function syncSportFromPath() {
      setSportId(getSportIdFromPath(window.location.pathname))
      setScreen(getScreenFromPath(window.location.pathname))
      setActiveGameOverlay("none")
    }

    window.addEventListener("popstate", syncSportFromPath)
    return () => window.removeEventListener("popstate", syncSportFromPath)
  }, [])

  useEffect(() => {
    if (!sport || !activeVariantId) return
    const variantExists = sport.variants?.some(variant => variant.id === activeVariantId)
    if (!variantExists) {
      setActiveVariantId(undefined)
    }
  }, [sport, activeVariantId])

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
    pushRoute(sportId, "menu")
    setScreen("menu")
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

    const nextPath = buildPath(nextSportId, "menu")
    window.history.pushState({}, "", nextPath)

    setSportId(nextSportId)
    setScreen("menu")
    setActiveVariantId(undefined)
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
      setScreen("about")
      return
    }

    if (target === "help" && screen === "menu") {
      pushRoute(sportId, "help")
      setScreen("help")
      return
    }

    const nextVariantId = options?.variantId
    setActiveVariantId(nextVariantId)

    if (target === "daily") {
      const seenKey = getTutorialStorageKey(sportId, nextVariantId)
      const shouldShowOnboarding = !localStorage.getItem(seenKey)
      setGameGuideMode(shouldShowOnboarding ? "onboarding" : "manual")
      setActiveGameOverlay(shouldShowOnboarding ? "guide" : "none")
    } else {
      setActiveGameOverlay("none")
    }

    if (target === "arcade") {
      setGameKey(k => k + 1)
    }
    pushRoute(sportId, target)
    setScreen(target)
  }

  function handleAboutBack() {
    if (screen === "help") {
      pushRoute(sportId, "menu")
      setScreen("menu")
      return
    }

    if (screen === "about") {
      setScreen("menu")
      return
    }

    goToMenu()
  }

  const isMenuView = screen === "menu" || screen === "about" || screen === "help"

  return (
    <>
      {isMenuView && (
        <div className="app-viewport pb-11 flex flex-col bg-primary-50 dark:bg-primary-900">
          <MainMenu
            onNavigate={handleNavigate}
            sport={sport ?? sportMeta}
            section={screen === "about" ? "about" : screen === "help" ? "help" : "menu"}
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
          <div className="flex-1 min-h-0 overflow-hidden">
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
                    className={`crossfade-panel absolute inset-0 px-4 pb-4 overflow-hidden ${isGuideOpen ? "crossfade-active" : "crossfade-inactive"}`}
                  >
                    <div className="w-full max-w-2xl mx-auto h-full flex flex-col">
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
                        className="-mt-1 flex-1 overflow-auto pb-2"
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

export default App
