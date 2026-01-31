import { useState, lazy, Suspense } from "react";
import Header from "./components/Header";
import MainMenu from "./components/MainMenu";
import HelpScreen from "./components/HelpScreen";
import AboutScreen from "./components/AboutScreen";
import ArcadeDifficulty from "./components/ArcadeDifficulty";
import type { Screen } from "./components/MainMenu";
import type { ArcadeDifficulty as DifficultyLevel } from "./utils/daily";

const Game = lazy(() => import("./components/Game"));

function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [gameKey, setGameKey] = useState(0);
  const [arcadeDifficulty, setArcadeDifficulty] = useState<DifficultyLevel | null>(null);

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
      {screen !== "menu" && <Header />}
      {screen === "menu" && <MainMenu onNavigate={handleNavigate} />}
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
