import { useEffect, type CSSProperties } from "react";
import confetti from "canvas-confetti";
import type { Player } from "../data/players";

interface Props {
  player: Player;
  won: boolean;
  lost: boolean;
  guessCount: number;
  onPlayAgain?: () => void;
}

const teamColors: Record<string, [string, string]> = {
  "Arizona Cardinals": ["#97233f", "#000000"],
  "Atlanta Falcons": ["#a71930", "#000000"],
  "Baltimore Ravens": ["#241773", "#000000"],
  "Buffalo Bills": ["#00338d", "#c60c30"],
  "Carolina Panthers": ["#0085ca", "#101820"],
  "Chicago Bears": ["#0b162a", "#c83803"],
  "Cincinnati Bengals": ["#fb4f14", "#000000"],
  "Cleveland Browns": ["#311d00", "#ff3c00"],
  "Dallas Cowboys": ["#041e42", "#869397"],
  "Denver Broncos": ["#fb4f14", "#002244"],
  "Detroit Lions": ["#0076b6", "#b0b7bc"],
  "Green Bay Packers": ["#203731", "#ffb612"],
  "Houston Texans": ["#03202f", "#a71930"],
  "Indianapolis Colts": ["#002c5f", "#a2aaad"],
  "Jacksonville Jaguars": ["#006778", "#d7a22a"],
  "Kansas City Chiefs": ["#e31837", "#ffb81c"],
  "Las Vegas Raiders": ["#000000", "#a5acaf"],
  "Los Angeles Chargers": ["#0080c6", "#ffc20e"],
  "Los Angeles Rams": ["#003594", "#ffd100"],
  "Miami Dolphins": ["#008e97", "#fc4c02"],
  "Minnesota Vikings": ["#4f2683", "#ffc62f"],
  "New England Patriots": ["#002244", "#c60c30"],
  "New Orleans Saints": ["#d3bc8d", "#101820"],
  "New York Giants": ["#0b2265", "#a71930"],
  "New York Jets": ["#125740", "#000000"],
  "Philadelphia Eagles": ["#004c54", "#a5acaf"],
  "Pittsburgh Steelers": ["#ffb612", "#101820"],
  "San Francisco 49ers": ["#aa0000", "#b3995d"],
  "Seattle Seahawks": ["#002244", "#69be28"],
  "Tampa Bay Buccaneers": ["#d50a0a", "#ff7900"],
  "Tennessee Titans": ["#0c2340", "#4b92db"],
  "Washington Commanders": ["#5a1414", "#ffb612"],
};

function getTeamColors(teamName: string): [string, string] {
  return teamColors[teamName] || ["#538d4e", "#b59f3b"];
}

export default function WinBanner({ player, won, lost, guessCount, onPlayAgain }: Props) {
  useEffect(() => {
    if (!won) return;

    const duration = 3000;
    const end = Date.now() + duration;
    const colors = getTeamColors(player.team);

    function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0 },
        colors: colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0 },
        colors: colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }

    frame();
  }, [won, player.team]);

  if (!won && !lost) return null;

  return (
    <div style={styles.banner}>
      {won ? (
        <>
          <div style={styles.emoji}>&#127942;</div>
          <div style={styles.playerName}>{player.name}</div>
          <div style={styles.subtitle}>
            {player.team} &middot; {player.position} &middot; #{player.number}
          </div>
          <div style={styles.result}>
            Guessed in {guessCount}/5
          </div>
        </>
      ) : (
        <>
          <div style={styles.lostLabel}>The answer was</div>
          <div style={styles.playerName}>{player.name}</div>
          <div style={styles.subtitle}>
            {player.team} &middot; {player.position} &middot; #{player.number}
          </div>
          <div style={styles.result}>Better luck tomorrow!</div>
        </>
      )}
      {onPlayAgain && (
        <button style={styles.playAgainBtn} onClick={onPlayAgain}>
          Play Again
        </button>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  banner: {
    textAlign: "center",
    padding: "0.75rem 1rem",
    backgroundColor: "var(--bg-secondary)",
    borderBottom: "1px solid var(--border)",
    flexShrink: 0,
  },
  emoji: {
    fontSize: "1.5rem",
    marginBottom: "0.15rem",
  },
  playerName: {
    fontSize: "1.25rem",
    fontWeight: 800,
    color: "var(--text)",
  },
  subtitle: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    marginTop: "0.1rem",
  },
  result: {
    fontSize: "0.8rem",
    color: "var(--green)",
    fontWeight: 700,
    marginTop: "0.25rem",
  },
  lostLabel: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    marginBottom: "0.1rem",
  },
  playAgainBtn: {
    marginTop: "0.5rem",
    padding: "0.4rem 1.25rem",
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "#fff",
    backgroundColor: "var(--green)",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
};
