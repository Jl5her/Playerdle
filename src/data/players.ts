import playersData from './players.json';

export interface Player {
  espnId: string | null;
  teamId: number;
  name: string;
  conference: "AFC" | "NFC";
  division: string;
  team: string;
  position: string;
  number: number;
  practiceSquad: boolean;
  popularity: number;
  difficulty: "easy" | "medium" | "hard" | "expert";
  depthChart: string | null; // e.g., "QB1", "RB2", "WR3"
}

export const players: Player[] = playersData as Player[];

/** Stable unique identifier for a player. Uses ESPN ID when available, falls back to name + teamId. */
export function playerId(p: Player): string {
  return p.espnId ?? `${p.name}-${p.teamId}`;
}
