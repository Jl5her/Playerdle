import { useState, useEffect, lazy, Suspense } from "react"
import { Header, LeagueFooter } from "@/components"
import { MainMenu, AboutScreen } from "@/screens"
import { HelpModal, TutorialModal, StatsModal } from "@/modals"
import type { Screen } from "@/screens/main-menu"
import { getSportIdFromPath, getSportMetaById, loadSportConfig, type SportConfig } from "@/sports"

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
      {showTutorial && sport && (
        <TutorialModal
          onClose={handleCloseTutorial}
          sport={sport}
        />
      )}
      {isGame && (
        <div className="app-viewport flex flex-col bg-primary-50 dark:bg-primary-900">
          <Header
            onShowTutorial={screen === "daily" ? handleShowTutorial : undefined}
            onBack={goToMenu}
            sport={sport ?? sportMeta}
          />
          <Suspense fallback={<div className="flex-1" />}>
            {screen === "daily" && sport && (
              <Game
                key="daily"
                mode="daily"
                sport={sport}
              />
            )}
            {screen === "arcade" && sport && (
              <Game
                key={`arcade-${gameKey}`}
                mode="arcade"
                sport={sport}
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
      {screen === "stats" && sport && (
        <StatsModal
          onClose={goToMenu}
          sport={sport}
        />
      )}
      {screen === "menu" && <LeagueFooter currentSportId={sportId} />}
    </>
  )
}

export default App
