import { useState, useEffect, lazy, Suspense } from "react"
import { Header } from "@/components"
import { MainMenu, AboutScreen, BehindScenes } from "@/screens"
import { HelpModal, TutorialModal, StatsModal } from "@/modals"
import type { Screen } from "@/screens/main-menu"

const Game = lazy(() => import("@/screens/game"))

const TUTORIAL_SEEN_KEY = "playerdle-tutorial-seen-v2"

function useViewportHeight() {
  const [height, setHeight] = useState<string>("100dvh")

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    function update() {
      setHeight(`${vv!.height}px`)
    }
    update()
    vv.addEventListener("resize", update)
    return () => vv.removeEventListener("resize", update)
  }, [])

  return height
}

function App() {
  const viewportHeight = useViewportHeight()
  const [screen, setScreen] = useState<Screen>("menu")
  const [gameKey, setGameKey] = useState(0)
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem(TUTORIAL_SEEN_KEY))
  const [arcadeSettingsCallback, setArcadeSettingsCallback] = useState<(() => void) | undefined>(undefined)

  const isGame = screen === "daily" || screen === "arcade"

  function handleCloseTutorial() {
    setShowTutorial(false)
    localStorage.setItem(TUTORIAL_SEEN_KEY, "true")
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
      {screen === "menu" && <MainMenu onNavigate={handleNavigate} />}
      {showTutorial && <TutorialModal onClose={handleCloseTutorial} />}
      {isGame && (
        <div style={{ height: viewportHeight }} className="flex flex-col bg-primary-50 dark:bg-primary-900">
          <Header
            onShowTutorial={screen === "daily" ? handleShowTutorial : undefined}
            onShowSettings={screen === "arcade" ? arcadeSettingsCallback : undefined}
            onBack={goToMenu}
          />
          <Suspense fallback={<div className="flex-1" />}>
            {screen === "daily" && (
              <Game
                key="daily"
                mode="daily"
              />
            )}
            {screen === "arcade" && (
              <Game
                key={`arcade-${gameKey}`}
                mode="arcade"
                onRegisterSettings={setArcadeSettingsCallback}
              />
            )}
          </Suspense>
        </div>
      )}
      {screen === "help" && <HelpModal onBack={goToMenu} />}
      {screen === "about" && <AboutScreen onBack={goToMenu} />}
      {screen === "stats" && <StatsModal onClose={goToMenu} />}
      {screen === "behind" && <BehindScenes onBack={goToMenu} />}
    </>
  )
}

export default App
