import { useState, useEffect, lazy, Suspense } from "react"
import { Header, LeagueFooter } from "@/components"
import { MainMenu, AboutScreen } from "@/screens"
import { HelpModal, StatsModal, TutorialModal } from "@/modals"
import type { Screen } from "@/screens/main-menu"
import { getSportIdFromPath, getSportMetaById, loadSportConfig, type SportConfig } from "@/sports"
import type { StatsModalConfig } from "@/screens/game"

const Game = lazy(() => import("@/screens/game"))

const TUTORIAL_SEEN_KEY = "playerdle-tutorial-seen-v2"

function useViewportHeight() {
  useEffect(() => {
    function update() {
      const height = window.visualViewport?.height ?? window.innerHeight
      document.documentElement.style.setProperty("--app-vh", `${height}px`)
    }

    update()
    window.addEventListener("resize", update)
    window.visualViewport?.addEventListener("resize", update)

    return () => {
      window.removeEventListener("resize", update)
      window.visualViewport?.removeEventListener("resize", update)
    }
  }, [])
}

function App() {
  const sportId = getSportIdFromPath(window.location.pathname)
  const sportMeta = getSportMetaById(sportId)
  useViewportHeight()
  const [screen, setScreen] = useState<Screen>("menu")
  const [gameKey, setGameKey] = useState(0)
  const [sport, setSport] = useState<SportConfig | null>(null)
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false)
  const [statsModalConfig, setStatsModalConfig] = useState<StatsModalConfig>({ mode: "daily" })
  const [showTutorial, setShowTutorial] = useState(
    () => !localStorage.getItem(`${TUTORIAL_SEEN_KEY}:${sportId}`),
  )

  useEffect(() => {
    let isMounted = true

    loadSportConfig(sportId).then(config => {
      if (isMounted) {
        setSport(config)
      }
    })

    return () => {
      isMounted = false
    }
  }, [sportId])

  useEffect(() => {
    const leagueName = (sport?.displayName ?? sportMeta.displayName).toUpperCase()
    document.title = `Playerdle ${leagueName}`
  }, [sport, sportMeta.displayName])

  const isGame = screen === "daily" || screen === "arcade"

  function handleCloseTutorial() {
    setShowTutorial(false)
    localStorage.setItem(`${TUTORIAL_SEEN_KEY}:${sportId}`, "true")
  }

  function handleShowTutorial() {
    setShowTutorial(true)
  }

  function goToMenu() {
    setScreen("menu")
  }

  function handleShowStats() {
    setShowTutorial(false)
    setStatsModalConfig({
      mode: "daily",
      showStatsOnly: true,
      includeShareButton: false,
    })
    setIsStatsModalOpen(true)
  }

  function handleOpenStatsModal(config: StatsModalConfig) {
    setStatsModalConfig({
      ...config,
      onPlayAgain: config.onPlayAgain
        ? () => {
            config.onPlayAgain?.()
            setIsStatsModalOpen(false)
          }
        : undefined,
    })
    setIsStatsModalOpen(true)
  }

  function handleCloseStatsModal() {
    setIsStatsModalOpen(false)
  }

  function handleNavigate(target: Screen) {
    if (target === "arcade") {
      setGameKey(k => k + 1)
    }
    setScreen(target)
  }

  return (
    <>
      {screen === "menu" && (
        <div className="pb-11">
          <MainMenu
            onNavigate={handleNavigate}
            sport={sport ?? sportMeta}
          />
        </div>
      )}
      {showTutorial && sport && !isStatsModalOpen && (
        <TutorialModal
          onClose={handleCloseTutorial}
          sport={sport}
        />
      )}
      {isGame && (
        <div className="app-viewport flex flex-col bg-primary-50 dark:bg-primary-900">
          <Header
            onShowTutorial={screen === "daily" ? handleShowTutorial : undefined}
            onShowStats={screen === "daily" ? handleShowStats : undefined}
            onBack={goToMenu}
            sport={sport ?? sportMeta}
          />
          <Suspense fallback={<div className="flex-1" />}>
            {screen === "daily" && sport && (
              <Game
                key="daily"
                mode="daily"
                sport={sport}
                onOpenStatsModal={handleOpenStatsModal}
              />
            )}
            {screen === "arcade" && sport && (
              <Game
                key={`arcade-${gameKey}`}
                mode="arcade"
                sport={sport}
                onOpenStatsModal={handleOpenStatsModal}
              />
            )}
          </Suspense>
        </div>
      )}
      {screen === "help" && sport && (
        <HelpModal
          onBack={goToMenu}
          sport={sport}
        />
      )}
      {screen === "about" && (
        <AboutScreen
          onBack={goToMenu}
          sport={sport ?? sportMeta}
        />
      )}
      {sport && (
        <StatsModal
          {...statsModalConfig}
          isOpen={isStatsModalOpen}
          onClose={handleCloseStatsModal}
          sport={sport}
        />
      )}
      {screen === "menu" && <LeagueFooter currentSportId={sportId} />}
    </>
  )
}

export default App
