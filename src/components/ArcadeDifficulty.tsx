import type { CSSProperties } from "react";
import type { ArcadeDifficulty } from "../utils/daily";

interface Props {
  onSelect: (difficulty: ArcadeDifficulty) => void;
  onBack: () => void;
}

const difficulties: { level: ArcadeDifficulty; label: string; description: string }[] = [
  {
    level: "easy",
    label: "Easy",
    description: "QB, RB, WR, TE only",
  },
  {
    level: "medium",
    label: "Medium",
    description: "Adds CB, S, DT",
  },
  {
    level: "hard",
    label: "Hard",
    description: "All positions",
  },
];

export default function ArcadeDifficulty({ onSelect, onBack }: Props) {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Select Difficulty</h1>
      <div style={styles.options}>
        {difficulties.map(({ level, label, description }) => (
          <button
            key={level}
            style={styles.option}
            onClick={() => onSelect(level)}
          >
            <div style={styles.optionLabel}>{label}</div>
            <div style={styles.optionDescription}>{description}</div>
          </button>
        ))}
      </div>
      <button style={styles.backBtn} onClick={onBack}>
        Back
      </button>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    padding: "2rem 1rem",
  },
  title: {
    fontSize: "clamp(1.5rem, 5vw, 2.5rem)",
    fontWeight: 800,
    color: "var(--text-primary)",
    marginBottom: "2rem",
    textAlign: "center",
  },
  options: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    width: "100%",
    maxWidth: "400px",
  },
  option: {
    padding: "1.5rem",
    backgroundColor: "var(--cell-bg)",
    border: "2px solid var(--border)",
    borderRadius: "0.5rem",
    cursor: "pointer",
    transition: "all 0.2s",
    textAlign: "left",
  },
  optionLabel: {
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    marginBottom: "0.5rem",
  },
  optionDescription: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
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
