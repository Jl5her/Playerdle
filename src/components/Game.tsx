import { useState, type CSSProperties } from "react";
import { type Player, players, playerId } from "../data/players";
import { getDailyPlayer, getRandomEasyPlayer, getRandomPlayerByDifficulty, getTodayKey, type ArcadeDifficulty } from "../utils/daily";
import GuessGrid from "./GuessGrid";
import GuessInput from "./GuessInput";
import WinBanner from "./WinBanner";

const MAX_GUESSES = 6;
const STORAGE_KEY = "athlete-wordle-state";

export type GameMode = "daily" | "arcade";

interface Props {
  mode: GameMode;
  onBack: () => void;
  arcadeDifficulty?: ArcadeDifficulty;
}

interface SavedState {
  dateKey: string;
  guessIds: string[];
}

function loadState(dateKey: string): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: SavedState = JSON.parse(raw);
    if (parsed.dateKey !== dateKey) return [];
    return parsed.guessIds ?? [];
  } catch {
    return [];
  }
}

function saveState(dateKey: string, guessIds: string[]) {
  const state: SavedState = { dateKey, guessIds };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function restoreGuesses(ids: string[]): Player[] {
  const restored: Player[] = [];
  for (const id of ids) {
    const p = players.find((pl) => playerId(pl) === id);
    if (p) restored.push(p);
  }
  return restored;
}

function getInitialPlayer(mode: GameMode, arcadeDifficulty?: ArcadeDifficulty): Player {
  if (mode === "daily") {
    return getDailyPlayer();
  }
  return arcadeDifficulty
    ? getRandomPlayerByDifficulty(arcadeDifficulty)
    : getRandomEasyPlayer();
}

function getInitialGuesses(mode: GameMode): Player[] {
  if (mode === "daily") {
    const savedIds = loadState(getTodayKey());
    return savedIds.length > 0 ? restoreGuesses(savedIds) : [];
  }
  return [];
}

export default function Game({ mode, onBack, arcadeDifficulty }: Props) {
  const [answer, setAnswer] = useState<Player>(() => getInitialPlayer(mode, arcadeDifficulty));
  const [dateKey] = useState<string>(getTodayKey);
  const [guesses, setGuesses] = useState<Player[]>(() => getInitialGuesses(mode));
  const [latestIndex, setLatestIndex] = useState(-1);

  const won = guesses.some((g) => playerId(g) === playerId(answer));
  const lost = !won && guesses.length >= MAX_GUESSES;
  const gameOver = won || lost;

  const guessedIds = new Set(guesses.map((g) => playerId(g)));

  function handleGuess(player: Player) {
    if (gameOver || guessedIds.has(playerId(player))) return;
    const newGuesses = [...guesses, player];
    setGuesses(newGuesses);
    setLatestIndex(newGuesses.length - 1);
    if (mode === "daily") {
      saveState(dateKey, newGuesses.map((g) => playerId(g)));
    }
  }

  function handlePlayAgain() {
    const newPlayer = arcadeDifficulty
      ? getRandomPlayerByDifficulty(arcadeDifficulty, playerId(answer))
      : getRandomEasyPlayer(playerId(answer));
    setAnswer(newPlayer);
    setGuesses([]);
    setLatestIndex(-1);
  }

  return (
    <div style={styles.container}>
      <WinBanner
        player={answer}
        won={won}
        lost={lost}
        guessCount={guesses.length}
        onPlayAgain={mode === "arcade" ? handlePlayAgain : undefined}
      />
      <div style={styles.gridArea}>
        <GuessGrid
          guesses={guesses}
          answer={answer}
          maxGuesses={MAX_GUESSES}
          latestIndex={latestIndex}
        />
      </div>
      <GuessInput
        onGuess={handleGuess}
        guessedIds={guessedIds}
        disabled={gameOver}
      />
      <button style={styles.backBtn} onClick={onBack}>
        Menu
      </button>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  gridArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    overflow: "hidden",
    minHeight: 0,
  },
  backBtn: {
    position: "absolute",
    top: "0.65rem",
    left: "0.75rem",
    padding: "0.3rem 0.6rem",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "var(--header-text)",
    backgroundColor: "transparent",
    border: "1px solid var(--header-text)",
    borderRadius: "4px",
    cursor: "pointer",
    zIndex: 20,
  },
};
