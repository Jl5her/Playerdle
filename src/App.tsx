import { useState, lazy, Suspense } from "react"
import { Header } from "@/components"
import { MainMenu, AboutScreen } from "@/screens"
import { HelpModal, TutorialModal, StatsModal } from "@/modals"
import type { Screen } from "@/screens/main-menu"
import type { ArcadeDifficulty as DifficultyLevel } from "@/utils/daily"

const Game = lazy(() => import("@/screens/game"))

const TUTORIAL_SEEN_KEY = "playerdle-tutorial-seen"

function App() {
  const [screen, setScreen] = useState<Screen>("menu")
  const [gameKey, setGameKey] = useState(0)
  const [arcadeDifficulty, setArcadeDifficulty] = useState<DifficultyLevel | null>(null)
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem(TUTORIAL_SEEN_KEY))

  function handleCloseTutorial() {
    setShowTutorial(false)
    localStorage.setItem(TUTORIAL_SEEN_KEY, "true")
  }

  function handleShowTutorial() {
    setShowTutorial(true)
  }

  function goToMenu() {
    setScreen("menu")
    setArcadeDifficulty(null)
  }

  function handleNavigate(target: Screen) {
    if (target === "arcade") {
      // Skip difficulty selection, go straight to game with default difficulty
      setArcadeDifficulty("easy")
      setGameKey(k => k + 1)
      setScreen("arcade")
    } else {
      setScreen(target)
    }
  }

  return (
    <>
      {screen !== "menu" && <Header onShowTutorial={handleShowTutorial} />}
      {screen === "menu" && <MainMenu onNavigate={handleNavigate} />}
      {showTutorial && <TutorialModal onClose={handleCloseTutorial} />}
      <Suspense fallback={<div>Loading...</div>}>
        {screen === "daily" && (
          <Game
            key="daily"
            mode="daily"
            onBack={goToMenu}
          />
        )}
        {screen === "arcade" && arcadeDifficulty !== null && (
          <Game
            key={`arcade-${gameKey}`}
            mode="arcade"
            arcadeDifficulty={arcadeDifficulty}
            onBack={goToMenu}
          />
        )}
      </Suspense>
      {screen === "help" && <HelpModal onBack={goToMenu} />}
      {screen === "about" && <AboutScreen onBack={goToMenu} />}
      {screen === "stats" && <StatsModal onClose={goToMenu} />}
    </>
  )
}

export default App
