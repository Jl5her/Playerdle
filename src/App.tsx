import { useState, lazy, Suspense, useEffect } from "react";
import {
  Header,
  MainMenu,
  HelpScreen,
  AboutScreen,
  ArcadeDifficulty,
  TutorialScreen,
} from "./components";
import type { Screen } from "./components/MainMenu";
import type { ArcadeDifficulty as DifficultyLevel } from "./utils/daily";

const Game = lazy(() => import("./components/Game"));

const TUTORIAL_SEEN_KEY = "playerdle-tutorial-seen";

function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [gameKey, setGameKey] = useState(0);
  const [arcadeDifficulty, setArcadeDifficulty] = useState<DifficultyLevel | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    // Check if user has seen the tutorial
    const hasSeenTutorial = localStorage.getItem(TUTORIAL_SEEN_KEY);
    if (!hasSeenTutorial) {
      setShowTutorial(true);
    }
  }, []);

  function handleCloseTutorial() {
    setShowTutorial(false);
    localStorage.setItem(TUTORIAL_SEEN_KEY, "true");
  }

  function handleShowTutorial() {
    setShowTutorial(true);
  }

  function goToMenu() {
    setScreen("menu");
    setArcadeDifficulty(null);
  }

  function handleNavigate(target: Screen) {
    if (target === "arcade") {
      // Don't increment gameKey yet, just show difficulty selection
      setScreen("arcade");
    } else {
      setScreen(target);
    }
  }

  function handleDifficultySelect(difficulty: DifficultyLevel) {
    setArcadeDifficulty(difficulty);
    setGameKey((k) => k + 1);
  }

  return (
    <>
      {screen !== "menu" && <Header onShowTutorial={handleShowTutorial} />}
      {screen === "menu" && <MainMenu onNavigate={handleNavigate} />}
      {showTutorial && <TutorialScreen onClose={handleCloseTutorial} />}
      <Suspense fallback={<div>Loading...</div>}>
        {screen === "daily" && (
          <Game key="daily" mode="daily" onBack={goToMenu} />
        )}
        {screen === "arcade" && arcadeDifficulty === null && (
          <ArcadeDifficulty onSelect={handleDifficultySelect} onBack={goToMenu} />
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
      {screen === "help" && <HelpScreen onBack={goToMenu} />}
      {screen === "about" && <AboutScreen onBack={goToMenu} />}
    </>
  );
}

export default App;
