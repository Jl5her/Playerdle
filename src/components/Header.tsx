import type { CSSProperties } from "react";

interface Props {
  onShowTutorial?: () => void;
}

const styles: Record<string, CSSProperties> = {
  header: {
    backgroundColor: "var(--header-bg)",
    color: "var(--header-text)",
    padding: "0.75rem 1rem",
    textAlign: "center",
    flexShrink: 0,
    borderBottom: "2px solid var(--border)",
    position: "relative",
  },
  title: {
    fontSize: "1.25rem",
    fontWeight: 800,
    letterSpacing: "0.15em",
    textTransform: "uppercase" as const,
  },
  helpButton: {
    position: "absolute",
    right: "1rem",
    top: "50%",
    transform: "translateY(-50%)",
    background: "transparent",
    border: "2px solid var(--border)",
    color: "var(--text-secondary)",
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    fontSize: "1rem",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
  },
};

export default function Header({ onShowTutorial }: Props) {
  return (
    <header style={styles.header}>
      <h1 style={styles.title}>Playerdle</h1>
      {onShowTutorial && (
        <button
          style={styles.helpButton}
          onClick={onShowTutorial}
          aria-label="Show tutorial"
          title="How to play"
        >
          ?
        </button>
      )}
    </header>
  );
}
