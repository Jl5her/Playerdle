import { players, playerId, type Player } from "../data/players";

export type ArcadeDifficulty = "easy" | "medium" | "hard";

const EASY_POSITIONS = ["QB", "RB", "WR", "TE"];
const MEDIUM_POSITIONS = ["QB", "RB", "WR", "TE", "CB", "S", "DT"];
// HARD includes all positions

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getDailyPlayer(): Player {
  // Filter to only include quality players (not practice squad, popularity >= 50)
  const eligiblePlayers = players.filter(
    (p) => !p.practiceSquad && p.popularity >= 50
  );
  const today = new Date();
  const dateStr = `${today.getUTCFullYear()}-${today.getUTCMonth()}-${today.getUTCDate()}`;
  const index = hashString(dateStr) % eligiblePlayers.length;
  return eligiblePlayers[index];
}

export function getRandomEasyPlayer(excludeId?: string): Player {
  const easyPlayers = players.filter(
    (p) => p.difficulty === "easy" &&
      playerId(p) !== excludeId &&
      !p.practiceSquad &&
      p.popularity >= 50
  );
  return easyPlayers[Math.floor(Math.random() * easyPlayers.length)];
}

export function getRandomPlayerByDifficulty(
  difficulty: ArcadeDifficulty,
  excludeId?: string
): Player {
  let allowedPositions: string[];

  switch (difficulty) {
    case "easy":
      allowedPositions = EASY_POSITIONS;
      break;
    case "medium":
      allowedPositions = MEDIUM_POSITIONS;
      break;
    case "hard":
      // Hard mode includes all positions, so no filtering needed
      allowedPositions = [];
      break;
  }

  const filtered = players.filter((p) => {
    if (playerId(p) === excludeId) return false;
    // Exclude practice squad players
    if (p.practiceSquad) return false;
    // Only include players with reasonable popularity (50+)
    // This filters out bench/backup players
    if (p.popularity < 50) return false;
    if (allowedPositions.length === 0) return true; // Hard mode: all positions
    return allowedPositions.includes(p.position);
  });

  return filtered[Math.floor(Math.random() * filtered.length)];
}

export function getTodayKey(): string {
  const today = new Date();
  return `${today.getUTCFullYear()}-${today.getUTCMonth()}-${today.getUTCDate()}`;
}
